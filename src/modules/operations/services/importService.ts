import { supabase } from '../../../api/supabase';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { 
  ImportQueue, 
  ImportRowData, 
  ImportValidationError, 
  ImportResult,
  Client,
  CPTCode
} from '../../../types/database';

export class ImportService {
  private organizationId: string;
  private importQueueId?: string;
  private clientCache: Map<string, string> = new Map();
  private cptCache: Map<string, string> = new Map();

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  /**
   * Parse CSV file content
   */
  private parseCSV(content: string): Promise<ImportRowData[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data as ImportRowData[]);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  /**
   * Parse Excel file content
   */
  private parseExcel(buffer: ArrayBuffer): ImportRowData[] {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '' 
    }) as any[][];

    if (jsonData.length === 0) {
      throw new Error('Excel file is empty');
    }

    // First row is headers
    const headers = jsonData[0];
    const rows: ImportRowData[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = jsonData[i][index];
      });
      rows.push(row);
    }

    return rows;
  }

  /**
   * Load cache for clients and CPT codes
   */
  private async loadCache(): Promise<void> {
    // Load all clients for this organization
    const { data: clients } = await supabase
      .from('clients')
      .select('id, code, name')
      .eq('organization_id', this.organizationId)
      .eq('is_active', true);

    clients?.forEach(client => {
      if (client.code) {
        this.clientCache.set(client.code.toLowerCase(), client.id);
      }
      this.clientCache.set(client.name.toLowerCase(), client.id);
    });

    // Load all CPT codes for this organization
    const { data: cptCodes } = await supabase
      .from('cpt_codes')
      .select('id, code')
      .eq('organization_id', this.organizationId)
      .eq('is_active', true);

    cptCodes?.forEach(cpt => {
      this.cptCache.set(cpt.code.toLowerCase(), cpt.id);
    });
  }

  /**
   * Validate a single row of import data
   */
  private validateRow(
    row: ImportRowData, 
    rowIndex: number
  ): { 
    isValid: boolean; 
    errors: ImportValidationError[]; 
    isDuplicate: boolean;
  } {
    const errors: ImportValidationError[] = [];
    let isDuplicate = false;

    // Required field validation
    if (!row.accession_number?.trim()) {
      errors.push({
        row: rowIndex,
        field: 'accession_number',
        message: 'Accession number is required',
        value: row.accession_number
      });
    }

    if (!row.cpt_code?.trim()) {
      errors.push({
        row: rowIndex,
        field: 'cpt_code',
        message: 'CPT code is required',
        value: row.cpt_code
      });
    }

    if (!row.client_code?.trim()) {
      errors.push({
        row: rowIndex,
        field: 'client_code',
        message: 'Client code is required',
        value: row.client_code
      });
    }

    if (!row.service_date?.trim()) {
      errors.push({
        row: rowIndex,
        field: 'service_date',
        message: 'Service date is required',
        value: row.service_date
      });
    } else {
      // Validate date format
      const date = new Date(row.service_date);
      if (isNaN(date.getTime())) {
        errors.push({
          row: rowIndex,
          field: 'service_date',
          message: 'Invalid date format',
          value: row.service_date
        });
      }
    }

    // Validate quantity if provided
    if (row.quantity !== undefined && row.quantity !== null) {
      const qty = Number(row.quantity);
      if (isNaN(qty) || qty <= 0) {
        errors.push({
          row: rowIndex,
          field: 'quantity',
          message: 'Quantity must be a positive number',
          value: row.quantity
        });
      }
    }

    // Check if client exists
    const clientKey = row.client_code?.toLowerCase();
    if (clientKey && !this.clientCache.has(clientKey)) {
      errors.push({
        row: rowIndex,
        field: 'client_code',
        message: 'Client not found in system',
        value: row.client_code
      });
    }

    // Check if CPT code exists
    const cptKey = row.cpt_code?.toLowerCase();
    if (cptKey && !this.cptCache.has(cptKey)) {
      errors.push({
        row: rowIndex,
        field: 'cpt_code',
        message: 'CPT code not found in system',
        value: row.cpt_code
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      isDuplicate
    };
  }

  /**
   * Check for duplicates in the database
   */
  private async checkDuplicates(
    rows: ImportRowData[]
  ): Promise<Set<string>> {
    const duplicateKeys = new Set<string>();
    
    // Batch check for duplicates
    const checks = rows.map(row => ({
      accession: row.accession_number,
      cpt: this.cptCache.get(row.cpt_code?.toLowerCase() || '')
    })).filter(check => check.accession && check.cpt);

    if (checks.length === 0) return duplicateKeys;

    // Query for existing items
    const { data: existingItems } = await supabase
      .from('invoice_items')
      .select('accession_number, cpt_code_id')
      .eq('organization_id', this.organizationId)
      .in('accession_number', checks.map(c => c.accession));

    existingItems?.forEach(item => {
      const key = `${item.accession_number}-${item.cpt_code_id}`;
      duplicateKeys.add(key);
    });

    return duplicateKeys;
  }

  /**
   * Create import queue entry
   */
  private async createImportQueue(
    filename: string,
    totalRows: number,
    createdBy: string
  ): Promise<string> {
    const { data, error } = await supabase
      .from('import_queues')
      .insert({
        organization_id: this.organizationId,
        filename,
        total_rows: totalRows,
        status: 'processing',
        started_at: new Date().toISOString(),
        created_by: createdBy
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  /**
   * Update import queue status
   */
  private async updateImportQueue(
    queueId: string,
    update: Partial<ImportQueue>
  ): Promise<void> {
    const { error } = await supabase
      .from('import_queues')
      .update({
        ...update,
        updated_at: new Date().toISOString()
      })
      .eq('id', queueId);

    if (error) throw error;
  }

  /**
   * Process imported data and create invoices
   */
  private async processValidRows(
    rows: ImportRowData[],
    duplicateKeys: Set<string>
  ): Promise<{ 
    successCount: number; 
    failedRows: ImportRowData[];
  }> {
    let successCount = 0;
    const failedRows: ImportRowData[] = [];

    // Group rows by client and service date for batch invoice creation
    const invoiceGroups = new Map<string, ImportRowData[]>();
    
    rows.forEach(row => {
      const clientId = this.clientCache.get(row.client_code?.toLowerCase() || '');
      const cptId = this.cptCache.get(row.cpt_code?.toLowerCase() || '');
      
      if (!clientId || !cptId) {
        failedRows.push(row);
        return;
      }

      // Check if duplicate
      const dupKey = `${row.accession_number}-${cptId}`;
      if (duplicateKeys.has(dupKey)) {
        failedRows.push(row);
        return;
      }

      // Group by client and month
      const date = new Date(row.service_date);
      const groupKey = `${clientId}-${date.getFullYear()}-${date.getMonth()}`;
      
      if (!invoiceGroups.has(groupKey)) {
        invoiceGroups.set(groupKey, []);
      }
      invoiceGroups.get(groupKey)?.push(row);
    });

    // Process each group
    for (const [groupKey, groupRows] of invoiceGroups) {
      try {
        const [clientId, year, month] = groupKey.split('-');
        
        // Create or find invoice for this client/period
        const { error: itemError } = await supabase
          .from('invoice_items')
          .insert(
            groupRows.map(row => ({
              organization_id: this.organizationId,
              invoice_id: 'temp-invoice-id', // TODO: Create actual invoice
              accession_number: row.accession_number,
              cpt_code_id: this.cptCache.get(row.cpt_code?.toLowerCase() || ''),
              description: `Lab test - ${row.cpt_code}`,
              service_date: row.service_date,
              quantity: Number(row.quantity) || 1,
              unit_price: 0 // Will be calculated by pricing rules
            }))
          );

        if (itemError) throw itemError;
        successCount += groupRows.length;
      } catch (error) {
        failedRows.push(...groupRows);
      }
    }

    return { successCount, failedRows };
  }

  /**
   * Main import function
   */
  async importFile(
    file: File,
    createdBy: string,
    options: {
      validateOnly?: boolean;
      allowDuplicates?: boolean;
    } = {}
  ): Promise<ImportResult> {
    try {
      // Load cache
      await this.loadCache();

      // Parse file based on type
      let rows: ImportRowData[] = [];
      
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const content = await file.text();
        rows = await this.parseCSV(content);
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.name.endsWith('.xlsx')
      ) {
        const buffer = await file.arrayBuffer();
        rows = this.parseExcel(buffer);
      } else {
        throw new Error('Unsupported file type. Please upload CSV or Excel file.');
      }

      // Create import queue entry
      this.importQueueId = await this.createImportQueue(
        file.name,
        rows.length,
        createdBy
      );

      // Validate all rows
      const validationResults = rows.map((row, index) => 
        this.validateRow(row, index + 2) // +2 for 1-indexed and header row
      );

      const validRows = rows.filter((_, index) => validationResults[index].isValid);
      const allErrors = validationResults.flatMap(r => r.errors);

      // Check for duplicates
      const duplicateKeys = options.allowDuplicates 
        ? new Set<string>()
        : await this.checkDuplicates(validRows);

      const duplicateRows = validRows.filter(row => {
        const cptId = this.cptCache.get(row.cpt_code?.toLowerCase() || '');
        const key = `${row.accession_number}-${cptId}`;
        return duplicateKeys.has(key);
      });

      // If validate only, return results without processing
      if (options.validateOnly) {
        await this.updateImportQueue(this.importQueueId, {
          status: 'completed',
          processed_rows: rows.length,
          success_rows: validRows.length - duplicateRows.length,
          error_rows: allErrors.length,
          errors: allErrors,
          completed_at: new Date().toISOString()
        });

        return {
          success: allErrors.length === 0 && duplicateRows.length === 0,
          total_rows: rows.length,
          processed_rows: rows.length,
          success_rows: validRows.length - duplicateRows.length,
          error_rows: allErrors.length,
          errors: allErrors,
          duplicates: duplicateRows
        };
      }

      // Process valid rows
      const { successCount, failedRows } = await this.processValidRows(
        validRows,
        duplicateKeys
      );

      // Update import queue
      await this.updateImportQueue(this.importQueueId, {
        status: failedRows.length > 0 ? 'completed_with_errors' : 'completed',
        processed_rows: rows.length,
        success_rows: successCount,
        error_rows: allErrors.length + failedRows.length,
        errors: [...allErrors, ...failedRows.map((row, index) => ({
          row: -1,
          field: 'processing',
          message: 'Failed to process row',
          value: row
        }))],
        completed_at: new Date().toISOString()
      });

      return {
        success: failedRows.length === 0 && allErrors.length === 0,
        total_rows: rows.length,
        processed_rows: rows.length,
        success_rows: successCount,
        error_rows: allErrors.length + failedRows.length,
        errors: allErrors,
        duplicates: duplicateRows
      };

    } catch (error: any) {
      // Update import queue with error
      if (this.importQueueId) {
        await this.updateImportQueue(this.importQueueId, {
          status: 'failed',
          errors: [{ 
            row: 0, 
            field: 'file', 
            message: error.message || 'Import failed',
            value: null
          }],
          completed_at: new Date().toISOString()
        });
      }

      throw error;
    }
  }

  /**
   * Get import history
   */
  static async getImportHistory(
    organizationId: string,
    limit: number = 10
  ): Promise<ImportQueue[]> {
    const { data, error } = await supabase
      .from('import_queues')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
}