import Papa from 'papaparse';
import { z } from 'zod';
import { supabase } from '../../api/supabase';
import { sanitizeText } from '../security';

// Import schemas for different data types
export const InvoiceImportSchema = z.object({
  invoice_number: z.string().min(1).max(50),
  client_name: z.string().min(1).max(200).transform(sanitizeText),
  client_id: z.string().uuid().optional(),
  patient_name: z.string().optional().transform(val => val ? sanitizeText(val) : undefined),
  amount: z.union([z.string(), z.number()]).transform(val => {
    if (typeof val === 'number') return val;
    return parseFloat(val.replace(/[^0-9.-]/g, ''));
  }),
  tax_rate: z.union([z.string(), z.number()]).transform(val => {
    if (typeof val === 'number') return val / 100;
    return parseFloat(val) / 100;
  }).optional(),
  issue_date: z.string().transform(val => new Date(val).toISOString()),
  due_date: z.string().transform(val => new Date(val).toISOString()),
  description: z.string().optional().transform(val => val ? sanitizeText(val) : undefined),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).default('draft'),
  cpt_code: z.string().optional(),
  accession_number: z.string().optional()
});

export const ClientImportSchema = z.object({
  name: z.string().min(1).max(200).transform(sanitizeText),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional().transform(val => val ? sanitizeText(val) : undefined),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().default('USA'),
  tax_id: z.string().optional(),
  contact_person: z.string().optional().transform(val => val ? sanitizeText(val) : undefined)
});

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: ImportError[];
  duplicates: number;
  processed: number;
}

export interface ImportOptions {
  type: 'invoices' | 'clients' | 'services';
  mode: 'insert' | 'upsert' | 'validate';
  organizationId: string;
  skipDuplicates?: boolean;
  batchSize?: number;
  onProgress?: (progress: number) => void;
  onError?: (errors: ImportError[]) => void;
  signal?: AbortSignal;
}

export class ImportProcessor {
  private static readonly CHUNK_SIZE = 100;
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly MAX_ROWS = 10000;
  
  static async processFile(
    file: File,
    options: ImportOptions
  ): Promise<ImportResult> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // Choose processing strategy based on file size
    if (file.size > 10 * 1024 * 1024) { // > 10MB
      return this.streamProcess(file, options);
    } else {
      return this.directProcess(file, options);
    }
  }
  
  private static validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `File size exceeds ${this.MAX_FILE_SIZE / (1024 * 1024)}MB limit` 
      };
    }
    
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      return { 
        valid: false, 
        error: 'Invalid file type. Please upload a CSV file.' 
      };
    }
    
    return { valid: true };
  }
  
  private static async streamProcess(
    file: File,
    options: ImportOptions
  ): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
      const result: ImportResult = {
        success: 0,
        failed: 0,
        errors: [],
        duplicates: 0,
        processed: 0
      };
      
      let batch: any[] = [];
      let rowNumber = 0;
      let estimatedTotal = 0;
      let aborted = false;
      
      // Handle abort signal
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          aborted = true;
        });
      }
      
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        chunk: async (results, parser) => {
          if (aborted) {
            parser.abort();
            reject(new Error('Import cancelled by user'));
            return;
          }
          
          parser.pause();
          
          // Process each row
          for (const row of results.data) {
            rowNumber++;
            
            if (rowNumber > this.MAX_ROWS) {
              parser.abort();
              reject(new Error(`Maximum row limit (${this.MAX_ROWS}) exceeded`));
              return;
            }
            
            batch.push({ ...row, _rowNumber: rowNumber });
          }
          
          // Process batch when it reaches the chunk size
          if (batch.length >= (options.batchSize || this.CHUNK_SIZE)) {
            try {
              const batchResult = await this.processBatch(batch, options);
              result.success += batchResult.success;
              result.failed += batchResult.failed;
              result.errors.push(...batchResult.errors);
              result.duplicates += batchResult.duplicates;
              result.processed += batch.length;
              
              // Report progress
              if (options.onProgress && estimatedTotal > 0) {
                options.onProgress((result.processed / estimatedTotal) * 100);
              }
              
              // Report errors in real-time
              if (options.onError && batchResult.errors.length > 0) {
                options.onError(batchResult.errors);
              }
              
              batch = [];
            } catch (error) {
              parser.abort();
              reject(error);
              return;
            }
          }
          
          parser.resume();
        },
        complete: async () => {
          if (aborted) return;
          
          // Process remaining batch
          if (batch.length > 0) {
            try {
              const batchResult = await this.processBatch(batch, options);
              result.success += batchResult.success;
              result.failed += batchResult.failed;
              result.errors.push(...batchResult.errors);
              result.duplicates += batchResult.duplicates;
              result.processed += batch.length;
              
              if (options.onError && batchResult.errors.length > 0) {
                options.onError(batchResult.errors);
              }
            } catch (error) {
              reject(error);
              return;
            }
          }
          
          if (options.onProgress) {
            options.onProgress(100);
          }
          
          resolve(result);
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
      
      // Estimate total rows for progress calculation
      const fileSize = file.size;
      const avgRowSize = 100; // Estimated average bytes per row
      estimatedTotal = Math.floor(fileSize / avgRowSize);
    });
  }
  
  private static async directProcess(
    file: File,
    options: ImportOptions
  ): Promise<ImportResult> {
    const text = await file.text();
    const parseResult = Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true
    });
    
    if (parseResult.errors.length > 0) {
      throw new Error(`CSV parsing errors: ${parseResult.errors.map(e => e.message).join(', ')}`);
    }
    
    const data = parseResult.data.map((row, index) => ({
      ...row,
      _rowNumber: index + 1
    }));
    
    if (data.length > this.MAX_ROWS) {
      throw new Error(`Maximum row limit (${this.MAX_ROWS}) exceeded`);
    }
    
    // Process in batches
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      duplicates: 0,
      processed: 0
    };
    
    const batchSize = options.batchSize || this.CHUNK_SIZE;
    const totalBatches = Math.ceil(data.length / batchSize);
    
    for (let i = 0; i < totalBatches; i++) {
      if (options.signal?.aborted) {
        throw new Error('Import cancelled by user');
      }
      
      const start = i * batchSize;
      const end = Math.min(start + batchSize, data.length);
      const batch = data.slice(start, end);
      
      const batchResult = await this.processBatch(batch, options);
      result.success += batchResult.success;
      result.failed += batchResult.failed;
      result.errors.push(...batchResult.errors);
      result.duplicates += batchResult.duplicates;
      result.processed += batch.length;
      
      if (options.onProgress) {
        options.onProgress((result.processed / data.length) * 100);
      }
      
      if (options.onError && batchResult.errors.length > 0) {
        options.onError(batchResult.errors);
      }
    }
    
    return result;
  }
  
  private static async processBatch(
    batch: any[],
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      duplicates: 0,
      processed: batch.length
    };
    
    // Validate and transform each row
    const validatedRows: any[] = [];
    
    for (const row of batch) {
      const validation = this.validateRow(row, options.type);
      
      if (validation.success) {
        // Check for duplicates if needed
        if (options.skipDuplicates) {
          const isDuplicate = await this.checkDuplicate(
            validation.data,
            options.type,
            options.organizationId
          );
          
          if (isDuplicate) {
            result.duplicates++;
            continue;
          }
        }
        
        validatedRows.push({
          ...validation.data,
          organization_id: options.organizationId
        });
      } else {
        result.failed++;
        result.errors.push({
          row: row._rowNumber,
          message: validation.error?.message || 'Validation failed',
          data: row
        });
      }
    }
    
    // If validation only mode, return results
    if (options.mode === 'validate') {
      result.success = validatedRows.length;
      return result;
    }
    
    // Insert/upsert to database
    if (validatedRows.length > 0) {
      try {
        const table = this.getTableName(options.type);
        
        if (options.mode === 'upsert') {
          const { data, error } = await supabase
            .from(table)
            .upsert(validatedRows, {
              onConflict: this.getConflictColumns(options.type),
              ignoreDuplicates: false
            });
          
          if (error) throw error;
          result.success = validatedRows.length;
        } else {
          const { data, error } = await supabase
            .from(table)
            .insert(validatedRows);
          
          if (error) throw error;
          result.success = validatedRows.length;
        }
      } catch (error: any) {
        // If batch insert fails, try individual inserts
        for (const row of validatedRows) {
          try {
            const table = this.getTableName(options.type);
            const { error } = await supabase.from(table).insert(row);
            
            if (error) throw error;
            result.success++;
          } catch (err: any) {
            result.failed++;
            result.errors.push({
              row: row._rowNumber,
              message: err.message,
              data: row
            });
          }
        }
      }
    }
    
    return result;
  }
  
  private static validateRow(row: any, type: string): { 
    success: boolean; 
    data?: any; 
    error?: Error 
  } {
    try {
      let schema: z.ZodSchema;
      
      switch (type) {
        case 'invoices':
          schema = InvoiceImportSchema;
          break;
        case 'clients':
          schema = ClientImportSchema;
          break;
        default:
          throw new Error(`Unknown import type: ${type}`);
      }
      
      const data = schema.parse(row);
      return { success: true, data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        return { 
          success: false, 
          error: new Error(messages.join(', ')) 
        };
      }
      return { 
        success: false, 
        error: error as Error 
      };
    }
  }
  
  private static async checkDuplicate(
    data: any,
    type: string,
    organizationId: string
  ): Promise<boolean> {
    try {
      const table = this.getTableName(type);
      let query = supabase.from(table).select('id').eq('organization_id', organizationId);
      
      switch (type) {
        case 'invoices':
          if (data.invoice_number) {
            query = query.eq('invoice_number', data.invoice_number);
          }
          if (data.accession_number) {
            query = query.eq('accession_number', data.accession_number);
          }
          break;
        case 'clients':
          query = query.eq('name', data.name);
          break;
      }
      
      const { data: existing, error } = await query.limit(1);
      
      if (error) {
        console.error('Duplicate check error:', error);
        return false; // Assume not duplicate on error
      }
      
      return existing && existing.length > 0;
    } catch (error) {
      console.error('Duplicate check error:', error);
      return false;
    }
  }
  
  private static getTableName(type: string): string {
    switch (type) {
      case 'invoices':
        return 'invoices';
      case 'clients':
        return 'clients';
      case 'services':
        return 'services';
      default:
        throw new Error(`Unknown type: ${type}`);
    }
  }
  
  private static getConflictColumns(type: string): string {
    switch (type) {
      case 'invoices':
        return 'invoice_number,organization_id';
      case 'clients':
        return 'name,organization_id';
      case 'services':
        return 'name,organization_id';
      default:
        return 'id';
    }
  }
  
  // Export validation results to CSV
  static exportErrors(errors: ImportError[]): string {
    const csv = Papa.unparse(errors.map(error => ({
      Row: error.row,
      Field: error.field || 'General',
      Error: error.message,
      Data: JSON.stringify(error.data)
    })));
    
    return csv;
  }
  
  // Download errors as CSV file
  static downloadErrors(errors: ImportError[], filename: string = 'import-errors.csv'): void {
    const csv = this.exportErrors(errors);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}