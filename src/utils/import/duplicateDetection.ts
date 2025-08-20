import { supabase } from '../../api/supabase';

interface ImportRow {
  accession_number: string;
  cpt_code: string;
  patient_first_name: string;
  patient_last_name: string;
  date_of_service: string;
  clinic_name: string;
  [key: string]: any;
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingInvoiceId?: string;
  existingLineId?: string;
  conflictDetails?: {
    accession: string;
    cpt: string;
    invoiceNumber?: string;
    dateFound?: string;
  };
}

/**
 * Check if an import row is a duplicate based on accession number + CPT code
 * This is the primary duplicate detection mechanism per client requirements
 */
export async function checkDuplicate(
  row: ImportRow,
  tenantId: string
): Promise<DuplicateCheckResult> {
  try {
    // Query for existing line items with same accession + CPT
    const { data, error } = await supabase
      .from('invoice_line_items')
      .select(`
        id,
        invoice_id,
        invoices(
          id,
          invoice_number,
          created_at
        )
      `)
      .eq('accession_number', row.accession_number)
      .eq('cpt_code', row.cpt_code)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error is ok
      throw error;
    }

    if (data) {
      return {
        isDuplicate: true,
        existingInvoiceId: data.invoice_id,
        existingLineId: data.id,
        conflictDetails: {
          accession: row.accession_number,
          cpt: row.cpt_code,
          invoiceNumber: data.invoices?.invoice_number,
          dateFound: data.invoices?.created_at
        }
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    throw error;
  }
}

/**
 * Batch check multiple rows for duplicates
 * More efficient for large imports
 */
export async function batchCheckDuplicates(
  rows: ImportRow[],
  tenantId: string
): Promise<Map<number, DuplicateCheckResult>> {
  const results = new Map<number, DuplicateCheckResult>();
  
  try {
    // Create unique combinations to check
    const checksToPerform = rows.map((row, index) => ({
      index,
      accession: row.accession_number,
      cpt: row.cpt_code
    }));

    // Build query for all combinations
    const { data, error } = await supabase
      .from('invoice_line_items')
      .select(`
        accession_number,
        cpt_code,
        id,
        invoice_id,
        invoices(
          id,
          invoice_number,
          created_at
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .in('accession_number', checksToPerform.map(c => c.accession));

    if (error) throw error;

    // Create lookup map of existing records
    const existingMap = new Map<string, any>();
    data?.forEach(record => {
      const key = `${record.accession_number}|${record.cpt_code}`;
      existingMap.set(key, record);
    });

    // Check each row against existing records
    checksToPerform.forEach(check => {
      const key = `${check.accession}|${check.cpt}`;
      const existing = existingMap.get(key);
      
      if (existing) {
        results.set(check.index, {
          isDuplicate: true,
          existingInvoiceId: existing.invoice_id,
          existingLineId: existing.id,
          conflictDetails: {
            accession: check.accession,
            cpt: check.cpt,
            invoiceNumber: existing.invoices?.invoice_number,
            dateFound: existing.invoices?.created_at
          }
        });
      } else {
        results.set(check.index, { isDuplicate: false });
      }
    });

    return results;
  } catch (error) {
    throw error;
  }
}

/**
 * Process import rows and separate duplicates from new records
 */
export async function processImportWithDuplicateCheck(
  rows: ImportRow[],
  tenantId: string
): Promise<{
  newRecords: ImportRow[];
  duplicates: Array<ImportRow & { duplicateInfo: DuplicateCheckResult }>;
}> {
  const duplicateResults = await batchCheckDuplicates(rows, tenantId);
  
  const newRecords: ImportRow[] = [];
  const duplicates: Array<ImportRow & { duplicateInfo: DuplicateCheckResult }> = [];

  rows.forEach((row, index) => {
    const result = duplicateResults.get(index);
    if (result?.isDuplicate) {
      duplicates.push({
        ...row,
        duplicateInfo: result
      });
    } else {
      newRecords.push(row);
    }
  });

  return { newRecords, duplicates };
}

/**
 * Mark duplicates in the import_failures table for review
 */
export async function saveDuplicatesToFailureQueue(
  duplicates: Array<ImportRow & { duplicateInfo: DuplicateCheckResult }>,
  importId: string,
  tenantId: string
): Promise<void> {
  if (duplicates.length === 0) return;

  try {
    const failureRecords = duplicates.map(dup => ({
      import_id: importId,
      row_data: dup,
      failure_type: 'duplicate',
      failure_reason: `Duplicate found: Accession ${dup.accession_number} + CPT ${dup.cpt_code} already exists in invoice ${dup.duplicateInfo.conflictDetails?.invoiceNumber}`,
      can_retry: false, // Duplicates typically shouldn't be retried
      tenant_id: tenantId
    }));

    const { error } = await supabase
      .from('import_failures')
      .insert(failureRecords);

    if (error) throw error;
  } catch (error) {
    throw error;
  }
}

/**
 * Get statistics about duplicates in recent imports
 */
export async function getDuplicateStatistics(
  tenantId: string,
  days: number = 30
): Promise<{
  totalDuplicates: number;
  uniqueAccessionCptPairs: number;
  mostCommonDuplicates: Array<{ accession: string; cpt: string; count: number }>;
}> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('import_failures')
      .select('row_data')
      .eq('tenant_id', tenantId)
      .eq('failure_type', 'duplicate')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const duplicateCounts = new Map<string, number>();
    const uniquePairs = new Set<string>();

    data?.forEach(record => {
      if (record.row_data) {
        const key = `${record.row_data.accession_number}|${record.row_data.cpt_code}`;
        uniquePairs.add(key);
        duplicateCounts.set(key, (duplicateCounts.get(key) || 0) + 1);
      }
    });

    // Get top 10 most common duplicates
    const sortedDuplicates = Array.from(duplicateCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => {
        const [accession, cpt] = key.split('|');
        return { accession, cpt, count };
      });

    return {
      totalDuplicates: data?.length || 0,
      uniqueAccessionCptPairs: uniquePairs.size,
      mostCommonDuplicates: sortedDuplicates
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Character limit validation for display notes
 * Per client requirements to prevent 17-page invoices
 */
export function validateCharacterLimits(row: ImportRow): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const MAX_NOTE_LENGTH = 500; // Configurable limit
  const MAX_PATIENT_NAME_LENGTH = 50;
  const MAX_CLINIC_NAME_LENGTH = 100;

  if (row.display_note && row.display_note.length > MAX_NOTE_LENGTH) {
    errors.push(`Display note exceeds ${MAX_NOTE_LENGTH} characters (${row.display_note.length})`);
  }

  if (row.patient_first_name && row.patient_first_name.length > MAX_PATIENT_NAME_LENGTH) {
    errors.push(`Patient first name exceeds ${MAX_PATIENT_NAME_LENGTH} characters`);
  }

  if (row.patient_last_name && row.patient_last_name.length > MAX_PATIENT_NAME_LENGTH) {
    errors.push(`Patient last name exceeds ${MAX_PATIENT_NAME_LENGTH} characters`);
  }

  if (row.clinic_name && row.clinic_name.length > MAX_CLINIC_NAME_LENGTH) {
    errors.push(`Clinic name exceeds ${MAX_CLINIC_NAME_LENGTH} characters`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Truncate fields that exceed character limits
 */
export function enforceCharacterLimits(row: ImportRow): ImportRow {
  const MAX_NOTE_LENGTH = 500;
  const MAX_PATIENT_NAME_LENGTH = 50;
  const MAX_CLINIC_NAME_LENGTH = 100;

  const sanitized = { ...row };

  if (sanitized.display_note && sanitized.display_note.length > MAX_NOTE_LENGTH) {
    sanitized.display_note = sanitized.display_note.substring(0, MAX_NOTE_LENGTH) + '...';
  }

  if (sanitized.patient_first_name && sanitized.patient_first_name.length > MAX_PATIENT_NAME_LENGTH) {
    sanitized.patient_first_name = sanitized.patient_first_name.substring(0, MAX_PATIENT_NAME_LENGTH);
  }

  if (sanitized.patient_last_name && sanitized.patient_last_name.length > MAX_PATIENT_NAME_LENGTH) {
    sanitized.patient_last_name = sanitized.patient_last_name.substring(0, MAX_PATIENT_NAME_LENGTH);
  }

  if (sanitized.clinic_name && sanitized.clinic_name.length > MAX_CLINIC_NAME_LENGTH) {
    sanitized.clinic_name = sanitized.clinic_name.substring(0, MAX_CLINIC_NAME_LENGTH);
  }

  return sanitized;
}

export default {
  checkDuplicate,
  batchCheckDuplicates,
  processImportWithDuplicateCheck,
  saveDuplicatesToFailureQueue,
  getDuplicateStatistics,
  validateCharacterLimits,
  enforceCharacterLimits
};