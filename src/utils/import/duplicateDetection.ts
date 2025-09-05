import { supabase } from '../../api/supabase';
import { ImportRowData } from '../../types/database'; // Using a more generic type

// Interface for the structure of a duplicate check result
interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingInvoiceId?: string;
  existingItemId?: string;
  conflictDetails?: {
    accession: string;
    cpt: string;
    invoiceNumber?: string;
    serviceDate?: string;
  };
}

/**
 * Batch checks multiple rows for duplicates against the invoice_items table.
 * This is optimized for performance on large imports.
 * @param rows - An array of rows to check.
 * @param organizationId - The ID of the organization (laboratory) to scope the check.
 * @returns A Map where the key is the row index and the value is the duplicate check result.
 */
export async function batchCheckDuplicates(
  rows: ImportRowData[],
  organizationId: string
): Promise<Map<number, DuplicateCheckResult>> {
  const results = new Map<number, DuplicateCheckResult>();
  if (rows.length === 0) {
    return results;
  }

  try {
    const accessionNumbers = rows.map(row => row.accession_number);
    const cptCodes = rows.map(row => row.cpt_code);

    // Fetch all existing invoice items that match any of the accession numbers and CPT codes
    // for the given organization. This is more efficient than one-by-one checks.
    const { data, error } = await supabase
      .from('invoice_items')
      .select(`
        accession_number,
        cpt_code,
        id,
        invoice_id,
        service_date,
        invoices ( invoice_number )
      `)
      .eq('organization_id', organizationId)
      .in('accession_number', accessionNumbers)
      .in('cpt_code', cptCodes);

    if (error) throw error;

    // Create a lookup map for quick access to existing items.
    // The key is a combination of accession number and CPT code.
    const existingItemsMap = new Map<string, any>();
    data?.forEach(item => {
      const key = `${item.accession_number}|${item.cpt_code}`;
      existingItemsMap.set(key, item);
    });

    // Iterate through the import rows and check for duplicates using the map.
    rows.forEach((row, index) => {
      const key = `${row.accession_number}|${row.cpt_code}`;
      const existingItem = existingItemsMap.get(key);

      if (existingItem) {
        results.set(index, {
          isDuplicate: true,
          existingInvoiceId: existingItem.invoice_id,
          existingItemId: existingItem.id,
          conflictDetails: {
            accession: existingItem.accession_number,
            cpt: existingItem.cpt_code,
            invoiceNumber: existingItem.invoices?.invoice_number,
            serviceDate: existingItem.service_date,
          },
        });
      } else {
        results.set(index, { isDuplicate: false });
      }
    });

    return results;
  } catch (error) {
    console.error('Error in batchCheckDuplicates:', error);
    throw error;
  }
}

/**
 * Saves detected duplicates to the dedicated duplicate_review_queue table.
 * @param duplicates - An array of duplicate rows to save.
 * @param organizationId - The ID of the organization.
 */
export async function saveDuplicatesToReviewQueue(
  duplicates: Array<ImportRowData & { duplicateInfo: DuplicateCheckResult }>,
  organizationId: string
): Promise<void> {
  if (duplicates.length === 0) return;

  try {
    const reviewItems = duplicates.map(dup => ({
      organization_id: organizationId,
      accession_number: dup.accession_number,
      cpt_code: dup.cpt_code,
      service_date: dup.service_date,
      unit_price: dup.unit_price,
      quantity: dup.quantity || 1,
      patient_name: `${dup.patient_first_name || ''} ${dup.patient_last_name || ''}`.trim(),
      raw_import_data: dup, // Store the original row data
      notes: `Duplicate of item in invoice ${dup.duplicateInfo.conflictDetails?.invoiceNumber || 'N/A'}`,
    }));

    const { error } = await supabase
      .from('duplicate_review_queue')
      .insert(reviewItems);

    if (error) throw error;
  } catch (error) {
    console.error('Error saving duplicates to review queue:', error);
    throw error;
  }
}
