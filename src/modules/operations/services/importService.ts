import { supabase } from '../../../api/supabase';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { 
  batchCheckDuplicates, 
  saveDuplicatesToReviewQueue 
} from '../../../utils/import/duplicateDetection';
import type { 
  ImportQueue, 
  ImportRowData, 
  ImportValidationError, 
  ImportResult
} from '../../../types/database';

export class ImportService {
  private organizationId: string;
  private importQueueId?: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  // --- File Parsing Methods ---
  private parseCSV(content: string): Promise<ImportRowData[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data as ImportRowData[]),
        error: (error) => reject(error),
      });
    });
  }

  private parseExcel(buffer: ArrayBuffer): ImportRowData[] {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as ImportRowData[];
    return jsonData;
  }

  // --- Import Queue Management ---
  private async createImportQueue(filename: string, totalRows: number, createdBy: string): Promise<string> {
    const { data, error } = await supabase
      .from('import_queues')
      .insert({
        organization_id: this.organizationId,
        filename,
        total_rows: totalRows,
        status: 'processing',
        started_at: new Date().toISOString(),
        created_by: createdBy,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  private async updateImportQueue(queueId: string, update: Partial<ImportQueue>): Promise<void> {
    await supabase
      .from('import_queues')
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq('id', queueId);
  }

  // --- Data Validation and Processing ---
  private validateRow(row: ImportRowData, rowIndex: number): ImportValidationError[] {
    const errors: ImportValidationError[] = [];
    if (!row.accession_number?.trim()) errors.push({ row: rowIndex, field: 'accession_number', message: 'Accession number is required' });
    if (!row.cpt_code?.trim()) errors.push({ row: rowIndex, field: 'cpt_code', message: 'CPT code is required' });
    if (!row.service_date) errors.push({ row: rowIndex, field: 'service_date', message: 'Service date is required' });
    if (!row.unit_price) errors.push({ row: rowIndex, field: 'unit_price', message: 'Unit price is required' });
    return errors;
  }

  private async insertNewRecords(records: ImportRowData[]): Promise<{ successCount: number; errors: ImportValidationError[] }> {
    if (records.length === 0) {
      return { successCount: 0, errors: [] };
    }

    // Here you would group records by client/invoice and insert them.
    // For this example, we'll assume a direct insert into a temporary holding table or invoice_items.
    // This logic needs to be adapted to your exact invoicing rules (e.g., creating new draft invoices).
    const itemsToInsert = records.map(row => ({
      organization_id: this.organizationId,
      // This assumes a draft invoice exists or is created here. This logic is complex
      // and depends on your business rules for invoice creation from imports.
      // For now, this is a placeholder for the actual insertion logic.
      invoice_id: 'DRAFT_INVOICE_ID_PLACEHOLDER', 
      accession_number: row.accession_number,
      cpt_code: row.cpt_code,
      description: row.description || `Service for ${row.cpt_code}`,
      service_date: row.service_date,
      quantity: Number(row.quantity) || 1,
      unit_price: Number(row.unit_price),
    }));

    const { error } = await supabase.from('invoice_items').insert(itemsToInsert);

    if (error) {
      return { successCount: 0, errors: [{ row: -1, field: 'database', message: `DB Insert Failed: ${error.message}` }] };
    }

    return { successCount: records.length, errors: [] };
  }

  /**
   * Main import function
   */
  async importFile(file: File, createdBy: string): Promise<ImportResult> {
    let rows: ImportRowData[];
    try {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        rows = await this.parseCSV(await file.text());
      } else if (file.name.endsWith('.xlsx')) {
        rows = this.parseExcel(await file.arrayBuffer());
      } else {
        throw new Error('Unsupported file type. Please upload a CSV or Excel file.');
      }
    } catch (e) {
      return { success: false, total_rows: 0, success_rows: 0, error_rows: 0, duplicate_rows: 0, errors: [{ row: 0, field: 'file', message: (e as Error).message }] };
    }

    this.importQueueId = await this.createImportQueue(file.name, rows.length, createdBy);

    const validationErrors = rows.flatMap((row, i) => this.validateRow(row, i + 2));
    if (validationErrors.length > 0) {
      await this.updateImportQueue(this.importQueueId, { status: 'failed', errors: validationErrors, completed_at: new Date().toISOString() });
      return { success: false, total_rows: rows.length, success_rows: 0, error_rows: rows.length, duplicate_rows: 0, errors: validationErrors };
    }

    const duplicateCheckResults = await batchCheckDuplicates(rows, this.organizationId);

    const newRecords: ImportRowData[] = [];
    const duplicates: Array<ImportRowData & { duplicateInfo: any }> = [];

    rows.forEach((row, index) => {
      const dupInfo = duplicateCheckResults.get(index);
      if (dupInfo?.isDuplicate) {
        duplicates.push({ ...row, duplicateInfo: dupInfo });
      } else {
        newRecords.push(row);
      }
    });

    if (duplicates.length > 0) {
      await saveDuplicatesToReviewQueue(duplicates, this.organizationId);
    }

    const { successCount, errors: insertErrors } = await this.insertNewRecords(newRecords);

    const finalResult: ImportResult = {
      success: insertErrors.length === 0,
      total_rows: rows.length,
      success_rows: successCount,
      error_rows: insertErrors.length,
      duplicate_rows: duplicates.length,
      errors: insertErrors,
    };

    await this.updateImportQueue(this.importQueueId, {
      status: finalResult.error_rows > 0 ? 'completed_with_errors' : 'completed',
      processed_rows: rows.length,
      success_rows: finalResult.success_rows,
      error_rows: finalResult.error_rows,
      errors: finalResult.errors,
      completed_at: new Date().toISOString(),
    });

    return finalResult;
  }
}
