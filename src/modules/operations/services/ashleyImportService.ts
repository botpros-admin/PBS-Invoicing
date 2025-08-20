/**
 * Ashley-Specific Import Service
 * 
 * Handles the complex import requirements from Ashley's transcripts:
 * - Multiple CPT codes per row (star-delimited)
 * - Duplicate detection (accession + CPT combination)
 * - Failure queue with fixable vs non-fixable errors
 * - Special handling for UTI tests and blood panels
 * - Support for 8,000+ row imports worth $1.2M
 */

import { supabase } from '../../../api/supabase';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ImportRow {
  row_number: number;
  accession_number: string;
  cpt_codes: string; // Can be star-delimited like *85025*80053*
  client_name?: string;
  client_code?: string;
  patient_first_name?: string;
  patient_last_name?: string;
  patient_dob?: string;
  service_date: string;
  quantity?: number;
  units?: number; // For mileage and time-based charges
  notes?: string;
}

export interface ProcessedItem {
  accession_number: string;
  cpt_code: string;
  client_id?: string;
  patient_id?: string;
  service_date: string;
  quantity: number;
  units: number;
  unit_price?: number;
}

export interface ImportError {
  row_number: number;
  type: 'fixable' | 'non_fixable';
  field: string;
  message: string;
  original_value?: string;
  suggested_fix?: string;
}

export interface ImportResult {
  total_rows: number;
  processed_rows: number;
  success_rows: number;
  duplicate_rows: number;
  error_rows: number;
  errors: ImportError[];
  fixable_errors: ImportError[];
  non_fixable_errors: ImportError[];
  processing_time_ms: number;
}

export class AshleyImportService {
  private organizationId: string;
  private clientCache = new Map<string, string>(); // client_name/code -> client_id
  private cptCache = new Map<string, any>(); // cpt_code -> cpt details
  private duplicateCache = new Set<string>(); // accession+cpt combinations

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  /**
   * Main import function that handles Ashley's specific requirements
   */
  async importFile(
    file: File,
    userId: string,
    options: {
      validateOnly?: boolean;
      allowDuplicates?: boolean;
      forceDuplicates?: boolean; // Ashley can force duplicates through
    } = {}
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const result: ImportResult = {
      total_rows: 0,
      processed_rows: 0,
      success_rows: 0,
      duplicate_rows: 0,
      error_rows: 0,
      errors: [],
      fixable_errors: [],
      non_fixable_errors: [],
      processing_time_ms: 0
    };

    try {
      // Parse the file
      const rows = await this.parseFile(file);
      result.total_rows = rows.length;

      // Load cache data
      await this.loadCaches();

      // Process each row
      for (const row of rows) {
        try {
          const processedItems = await this.processRow(row, options);
          
          if (!options.validateOnly) {
            await this.saveItems(processedItems, userId);
          }
          
          result.processed_rows++;
          result.success_rows += processedItems.length;
        } catch (error: any) {
          result.error_rows++;
          
          // Categorize the error
          const importError = this.categorizeError(row, error);
          result.errors.push(importError);
          
          if (importError.type === 'fixable') {
            result.fixable_errors.push(importError);
          } else {
            result.non_fixable_errors.push(importError);
          }
        }
      }

      result.processing_time_ms = Date.now() - startTime;
      
      // Save import log
      if (!options.validateOnly) {
        await this.saveImportLog(file.name, result, userId);
      }

      return result;
    } catch (error: any) {
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  /**
   * Parse CSV or Excel file into rows
   */
  private async parseFile(file: File): Promise<ImportRow[]> {
    const text = await file.text();
    const rows: ImportRow[] = [];

    if (file.name.endsWith('.csv')) {
      // Parse CSV
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().trim().replace(/\s+/g, '_')
      });

      parsed.data.forEach((row: any, index) => {
        rows.push({
          row_number: index + 2, // +2 because header is row 1
          accession_number: row.accession_number || row.accession || '',
          cpt_codes: row.cpt_codes || row.cpt_code || row.cpt || '',
          client_name: row.client_name || row.client || '',
          client_code: row.client_code || '',
          patient_first_name: row.patient_first_name || row.first_name || '',
          patient_last_name: row.patient_last_name || row.last_name || '',
          patient_dob: row.patient_dob || row.dob || '',
          service_date: row.service_date || row.date_of_service || row.dos || '',
          quantity: parseInt(row.quantity || '1'),
          units: parseInt(row.units || '1'),
          notes: row.notes || ''
        });
      });
    } else {
      // Parse Excel
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      // Assume first row is header
      const headers = (jsonData[0] as string[]).map(h => 
        h.toLowerCase().trim().replace(/\s+/g, '_')
      );
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        const rowObj: any = {};
        headers.forEach((header, idx) => {
          rowObj[header] = row[idx];
        });
        
        rows.push({
          row_number: i + 1,
          accession_number: rowObj.accession_number || rowObj.accession || '',
          cpt_codes: rowObj.cpt_codes || rowObj.cpt_code || rowObj.cpt || '',
          client_name: rowObj.client_name || rowObj.client || '',
          client_code: rowObj.client_code || '',
          patient_first_name: rowObj.patient_first_name || rowObj.first_name || '',
          patient_last_name: rowObj.patient_last_name || rowObj.last_name || '',
          patient_dob: rowObj.patient_dob || rowObj.dob || '',
          service_date: rowObj.service_date || rowObj.date_of_service || rowObj.dos || '',
          quantity: parseInt(rowObj.quantity || '1'),
          units: parseInt(rowObj.units || '1'),
          notes: rowObj.notes || ''
        });
      }
    }

    return rows;
  }

  /**
   * Process a single row into invoice items
   */
  private async processRow(
    row: ImportRow,
    options: { allowDuplicates?: boolean; forceDuplicates?: boolean }
  ): Promise<ProcessedItem[]> {
    const items: ProcessedItem[] = [];

    // Validate required fields
    if (!row.accession_number) {
      throw new Error('Missing accession number');
    }
    if (!row.cpt_codes) {
      throw new Error('Missing CPT codes');
    }
    if (!row.service_date) {
      throw new Error('Missing service date');
    }

    // Get client ID
    const clientId = await this.resolveClient(row);
    if (!clientId) {
      throw new Error(`Client not found: ${row.client_name || row.client_code}`);
    }

    // Parse CPT codes (handle star-delimited format)
    const cptCodes = this.parseCPTCodes(row.cpt_codes);
    
    // Special handling for UTI tests
    if (cptCodes.includes('UTI')) {
      // Ashley's special UTI handling - will be updated by her team later
      cptCodes[cptCodes.indexOf('UTI')] = 'UTI_PENDING';
    }

    // Process each CPT code
    for (const cptCode of cptCodes) {
      // Check for duplicates (accession + CPT combination)
      const duplicateKey = `${row.accession_number}:${cptCode}`;
      
      if (!options.allowDuplicates && !options.forceDuplicates) {
        if (this.duplicateCache.has(duplicateKey)) {
          if (options.forceDuplicates) {
            // Ashley can force duplicates through
          } else {
            throw new Error(`Duplicate found: Accession ${row.accession_number} with CPT ${cptCode}`);
          }
        }
      }

      // Get CPT code details and pricing
      const cptDetails = await this.getCPTDetails(cptCode);
      if (!cptDetails) {
        throw new Error(`Invalid CPT code: ${cptCode}`);
      }

      items.push({
        accession_number: row.accession_number,
        cpt_code: cptCode,
        client_id: clientId,
        patient_id: await this.resolvePatient(row),
        service_date: this.parseDate(row.service_date),
        quantity: row.quantity || 1,
        units: row.units || 1,
        unit_price: cptDetails.default_price
      });

      // Add to duplicate cache
      this.duplicateCache.add(duplicateKey);
    }

    return items;
  }

  /**
   * Parse CPT codes from various formats
   * Handles: *85025*80053*, 85025,80053, 85025;80053, etc.
   */
  private parseCPTCodes(cptString: string): string[] {
    // Remove leading/trailing stars
    let cleaned = cptString.replace(/^\*+|\*+$/g, '');
    
    // Split by various delimiters
    const codes = cleaned.split(/[\*,;|\s]+/)
      .map(code => code.trim())
      .filter(code => code.length > 0);

    return codes;
  }

  /**
   * Categorize errors as fixable or non-fixable
   */
  private categorizeError(row: ImportRow, error: Error): ImportError {
    const message = error.message.toLowerCase();
    
    // Duplicate errors are fixable (Ashley can push them through)
    if (message.includes('duplicate')) {
      return {
        row_number: row.row_number,
        type: 'fixable',
        field: 'duplicate',
        message: error.message,
        original_value: `${row.accession_number}`,
        suggested_fix: 'Can be forced through if intentional'
      };
    }

    // Missing client/clinic is non-fixable
    if (message.includes('client not found') || message.includes('clinic not found')) {
      return {
        row_number: row.row_number,
        type: 'non_fixable',
        field: 'client',
        message: error.message,
        original_value: row.client_name || row.client_code,
        suggested_fix: 'Client must be created in the system first'
      };
    }

    // Invalid CPT code is non-fixable
    if (message.includes('invalid cpt') || message.includes('cpt code')) {
      return {
        row_number: row.row_number,
        type: 'non_fixable',
        field: 'cpt_code',
        message: error.message,
        original_value: row.cpt_codes,
        suggested_fix: 'CPT code must be added to the system first'
      };
    }

    // Default to non-fixable
    return {
      row_number: row.row_number,
      type: 'non_fixable',
      field: 'unknown',
      message: error.message
    };
  }

  /**
   * Load caches for performance
   */
  private async loadCaches() {
    // Load clients
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, code')
      .eq('organization_id', this.organizationId);

    clients?.forEach(client => {
      if (client.name) this.clientCache.set(client.name.toLowerCase(), client.id);
      if (client.code) this.clientCache.set(client.code.toLowerCase(), client.id);
    });

    // Load CPT codes
    const { data: cptCodes } = await supabase
      .from('cpt_codes')
      .select('*')
      .eq('organization_id', this.organizationId);

    cptCodes?.forEach(cpt => {
      this.cptCache.set(cpt.code, cpt);
    });

    // Load existing accession+CPT combinations for duplicate detection
    const { data: existingItems } = await supabase
      .from('invoice_items')
      .select('accession_number, cpt_code_id')
      .eq('organization_id', this.organizationId);

    existingItems?.forEach(item => {
      // Need to get CPT code from ID
      const cpt = Array.from(this.cptCache.values()).find(c => c.id === item.cpt_code_id);
      if (cpt) {
        this.duplicateCache.add(`${item.accession_number}:${cpt.code}`);
      }
    });
  }

  /**
   * Resolve client from name or code
   */
  private async resolveClient(row: ImportRow): Promise<string | null> {
    if (row.client_name) {
      return this.clientCache.get(row.client_name.toLowerCase()) || null;
    }
    if (row.client_code) {
      return this.clientCache.get(row.client_code.toLowerCase()) || null;
    }
    return null;
  }

  /**
   * Resolve or create patient
   */
  private async resolvePatient(row: ImportRow): Promise<string | null> {
    if (!row.patient_first_name && !row.patient_last_name) {
      return null;
    }

    // Try to find existing patient
    const { data: existing } = await supabase
      .from('patients')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('first_name', row.patient_first_name || '')
      .eq('last_name', row.patient_last_name || '')
      .eq('accession_number', row.accession_number)
      .single();

    if (existing) {
      return existing.id;
    }

    // Create new patient
    const { data: newPatient } = await supabase
      .from('patients')
      .insert({
        organization_id: this.organizationId,
        first_name: row.patient_first_name || 'Unknown',
        last_name: row.patient_last_name || 'Patient',
        date_of_birth: row.patient_dob ? this.parseDate(row.patient_dob) : null,
        accession_number: row.accession_number
      })
      .select('id')
      .single();

    return newPatient?.id || null;
  }

  /**
   * Get CPT code details
   */
  private async getCPTDetails(cptCode: string): Promise<any> {
    return this.cptCache.get(cptCode);
  }

  /**
   * Parse date string to ISO format
   */
  private parseDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Try various date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Try MM/DD/YYYY format
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      const [month, day, year] = parts;
      const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Save processed items to database
   */
  private async saveItems(items: ProcessedItem[], userId: string) {
    // Group by client to create invoices
    const itemsByClient = new Map<string, ProcessedItem[]>();
    
    items.forEach(item => {
      const clientId = item.client_id || 'unknown';
      if (!itemsByClient.has(clientId)) {
        itemsByClient.set(clientId, []);
      }
      itemsByClient.get(clientId)?.push(item);
    });

    // Create invoice for each client
    for (const [clientId, clientItems] of itemsByClient) {
      // Create or get invoice for this import batch
      const { data: invoice } = await supabase
        .from('invoices')
        .insert({
          organization_id: this.organizationId,
          client_id: clientId,
          invoice_number: `IMP-${Date.now()}`,
          status: 'draft',
          created_by: userId
        })
        .select('id')
        .single();

      if (invoice) {
        // Insert invoice items
        const invoiceItems = clientItems.map(item => ({
          organization_id: this.organizationId,
          invoice_id: invoice.id,
          accession_number: item.accession_number,
          cpt_code_id: this.cptCache.get(item.cpt_code)?.id,
          description: this.cptCache.get(item.cpt_code)?.description || '',
          service_date: item.service_date,
          quantity: item.quantity,
          units: item.units,
          unit_price: item.unit_price || 0,
          line_total: (item.quantity * item.units * (item.unit_price || 0))
        }));

        await supabase
          .from('invoice_items')
          .insert(invoiceItems);
      }
    }
  }

  /**
   * Save import log for tracking
   */
  private async saveImportLog(
    filename: string,
    result: ImportResult,
    userId: string
  ) {
    await supabase
      .from('import_queues')
      .insert({
        organization_id: this.organizationId,
        filename,
        status: result.error_rows > 0 ? 'completed_with_errors' : 'completed',
        total_rows: result.total_rows,
        processed_rows: result.processed_rows,
        success_rows: result.success_rows,
        error_rows: result.error_rows,
        errors: result.errors,
        created_by: userId,
        completed_at: new Date().toISOString()
      });
  }

  /**
   * Get failed imports that can be retried
   */
  async getFailedImports(): Promise<any[]> {
    const { data } = await supabase
      .from('import_queues')
      .select('*')
      .eq('organization_id', this.organizationId)
      .in('status', ['failed', 'completed_with_errors'])
      .order('created_at', { ascending: false })
      .limit(10);

    return data || [];
  }

  /**
   * Retry failed import with fixes
   */
  async retryImport(
    importId: string,
    fixes: Map<number, any>,
    userId: string
  ): Promise<ImportResult> {
    // Get original import data
    const { data: importLog } = await supabase
      .from('import_queues')
      .select('*')
      .eq('id', importId)
      .single();

    if (!importLog) {
      throw new Error('Import not found');
    }

    // Apply fixes to errors
    const fixedRows: ImportRow[] = [];
    importLog.errors.forEach((error: ImportError) => {
      if (fixes.has(error.row_number)) {
        // Apply the fix
        const fix = fixes.get(error.row_number);
        fixedRows.push(fix);
      }
    });

    // Reprocess fixed rows
    const result: ImportResult = {
      total_rows: fixedRows.length,
      processed_rows: 0,
      success_rows: 0,
      duplicate_rows: 0,
      error_rows: 0,
      errors: [],
      fixable_errors: [],
      non_fixable_errors: [],
      processing_time_ms: 0
    };

    const startTime = Date.now();

    for (const row of fixedRows) {
      try {
        const processedItems = await this.processRow(row, { forceDuplicates: true });
        await this.saveItems(processedItems, userId);
        result.processed_rows++;
        result.success_rows += processedItems.length;
      } catch (error: any) {
        result.error_rows++;
        const importError = this.categorizeError(row, error);
        result.errors.push(importError);
      }
    }

    result.processing_time_ms = Date.now() - startTime;

    // Update import log
    await supabase
      .from('import_queues')
      .update({
        status: result.error_rows === 0 ? 'completed' : 'completed_with_errors',
        processed_rows: importLog.processed_rows + result.success_rows,
        success_rows: importLog.success_rows + result.success_rows,
        error_rows: result.error_rows,
        errors: result.errors,
        completed_at: new Date().toISOString()
      })
      .eq('id', importId);

    return result;
  }
}