/**
 * Import Template Generator
 * Creates downloadable CSV templates for laboratory billing imports
 * Based on exact requirements from client transcripts
 */

export interface ImportColumn {
  name: string;
  required: boolean;
  example: string;
  description: string;
  format?: string;
}

// Exact column order from client transcripts
export const IMPORT_COLUMNS: ImportColumn[] = [
  {
    name: 'Client Name',
    required: true,
    example: 'Precision Life Sciences',
    description: 'Laboratory name (must match exactly)'
  },
  {
    name: 'Clinic Name',
    required: true,
    example: 'Maxwell Health Center',
    description: 'Clinic/Facility name (must match exactly, including ampersands)'
  },
  {
    name: 'Invoice Type',
    required: true,
    example: 'SNF',
    description: 'Type: SNF, Hospice, Client Bill, Invalids, etc.'
  },
  {
    name: 'Accession Number',
    required: true,
    example: 'ACC-2025-001234',
    description: 'Reference/Accession number for the sample'
  },
  {
    name: 'Date of Collection',
    required: true,
    example: '01/15/2025',
    description: 'Collection date',
    format: 'MM/DD/YYYY'
  },
  {
    name: 'CPT Code',
    required: true,
    example: '80053',
    description: 'Charge test name/CPT code'
  },
  {
    name: 'Patient First Name',
    required: true,
    example: 'John',
    description: 'Patient first name (max 50 characters)'
  },
  {
    name: 'Patient Last Name',
    required: true,
    example: 'Doe',
    description: 'Patient last name (max 50 characters)'
  },
  {
    name: 'Patient DOB',
    required: true,
    example: '01/01/1950',
    description: 'Patient date of birth',
    format: 'MM/DD/YYYY'
  },
  {
    name: 'Units of Service',
    required: true,
    example: '1',
    description: 'Quantity/Units'
  },
  {
    name: 'Display Note',
    required: false,
    example: 'Special handling required',
    description: 'Additional notes (max 500 characters to prevent 17-page invoices)'
  }
];

/**
 * Generate CSV template with headers and example row
 */
export function generateImportTemplate(includeExamples: boolean = true): string {
  const headers = IMPORT_COLUMNS.map(col => col.name);
  const examples = IMPORT_COLUMNS.map(col => col.example);
  
  let csv = headers.join(',') + '\n';
  
  if (includeExamples) {
    // Add example row
    csv += examples.join(',') + '\n';
    
    // Add a few more example rows with different invoice types
    const additionalExamples = [
      [
        'Precision Life Sciences',
        'Sunrise Hospice',
        'Hospice',
        'ACC-2025-001235',
        '01/14/2025',
        '87186',
        'Jane',
        'Smith',
        '05/15/1945',
        '1',
        'Hospice patient'
      ],
      [
        'Infinity Labs',
        'ABC Wellness',
        'Client Bill',
        'ACC-2025-001236',
        '01/13/2025',
        '80048',
        'Robert',
        'Johnson',
        '03/22/1960',
        '2',
        ''
      ],
      [
        'Patient Choice Laboratory',
        'First Care Management',
        'Invalids',
        'ACC-2025-001237',
        '01/12/2025',
        '85025',
        'Maria',
        'Garcia',
        '07/30/1975',
        '1',
        'Missing insurance info'
      ]
    ];
    
    additionalExamples.forEach(row => {
      csv += row.join(',') + '\n';
    });
  }
  
  return csv;
}

/**
 * Generate detailed instructions document
 */
export function generateImportInstructions(): string {
  return `LABORATORY BILLING IMPORT TEMPLATE INSTRUCTIONS
================================================

IMPORTANT: This template is for uploading laboratory billing data to create invoices.

FILE FORMAT REQUIREMENTS:
- File Type: CSV (Comma Separated Values)
- Encoding: UTF-8
- Date Format: MM/DD/YYYY
- No commas within field values (use quotes if needed)

COLUMN SPECIFICATIONS:
${IMPORT_COLUMNS.map((col, index) => `
${index + 1}. ${col.name} ${col.required ? '(REQUIRED)' : '(OPTIONAL)'}
   - Description: ${col.description}
   ${col.format ? `- Format: ${col.format}` : ''}
   - Example: ${col.example}
`).join('')}

DUPLICATE DETECTION:
- The system checks for duplicates using: Accession Number + CPT Code
- Duplicate records will be sent to the failure queue for review

CHARACTER LIMITS:
- Patient First Name: Maximum 50 characters
- Patient Last Name: Maximum 50 characters
- Display Note: Maximum 500 characters (to prevent excessively long invoices)
- Clinic Name: Maximum 100 characters

INVOICE TYPES:
- SNF (Skilled Nursing Facility)
- Hospice
- Client Bill (Cash pay arrangements)
- Invalids (Missing information, failed claims)
- Custom types can be added as needed

VALIDATION RULES:
1. Client Name must match an existing laboratory in the system
2. Clinic Name must match exactly (including special characters like &)
3. CPT Codes will be translated using the configured VLOOKUP mappings
4. Dates must be in MM/DD/YYYY format
5. Units of Service must be a positive number

MULTIPLE UPLOADS:
- Multiple files can be uploaded to the same draft invoice
- The invoice remains in draft status until manually finalized
- Draft invoices can be edited before finalization

FAILURE HANDLING:
- Records that fail validation go to the Import Failure Queue
- Failed records can be edited inline and reprocessed
- Common failures: Unknown clinic, unmapped CPT code, duplicate detection

TIPS FOR SUCCESS:
1. Verify clinic names match exactly (case-sensitive)
2. Ensure all CPT codes are mapped in the system
3. Check date formats are correct (MM/DD/YYYY)
4. Keep display notes under 500 characters
5. Remove any extra spaces or special characters

For assistance, contact support or refer to the user manual.

Generated: ${new Date().toLocaleDateString()}
Version: 1.0`;
}

/**
 * Download CSV template file
 */
export function downloadImportTemplate(filename: string = 'lab-billing-import-template.csv') {
  const csv = generateImportTemplate(true);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Download instructions document
 */
export function downloadImportInstructions(filename: string = 'import-instructions.txt') {
  const instructions = generateImportInstructions();
  const blob = new Blob([instructions], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Validate import data against template requirements
 */
export function validateImportData(data: any[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!data || data.length === 0) {
    errors.push('No data provided');
    return { valid: false, errors, warnings };
  }
  
  // Check headers
  const headers = Object.keys(data[0]);
  const requiredColumns = IMPORT_COLUMNS.filter(col => col.required);
  
  requiredColumns.forEach(col => {
    if (!headers.includes(col.name)) {
      errors.push(`Missing required column: ${col.name}`);
    }
  });
  
  // Validate each row
  data.forEach((row, index) => {
    const rowNum = index + 2; // Account for header row
    
    // Check required fields
    requiredColumns.forEach(col => {
      if (!row[col.name] || row[col.name].toString().trim() === '') {
        errors.push(`Row ${rowNum}: Missing required field '${col.name}'`);
      }
    });
    
    // Validate date formats
    if (row['Date of Collection']) {
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(row['Date of Collection'])) {
        errors.push(`Row ${rowNum}: Invalid date format for 'Date of Collection'. Use MM/DD/YYYY`);
      }
    }
    
    if (row['Patient DOB']) {
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(row['Patient DOB'])) {
        errors.push(`Row ${rowNum}: Invalid date format for 'Patient DOB'. Use MM/DD/YYYY`);
      }
    }
    
    // Check character limits
    if (row['Patient First Name'] && row['Patient First Name'].length > 50) {
      warnings.push(`Row ${rowNum}: Patient First Name exceeds 50 characters`);
    }
    
    if (row['Patient Last Name'] && row['Patient Last Name'].length > 50) {
      warnings.push(`Row ${rowNum}: Patient Last Name exceeds 50 characters`);
    }
    
    if (row['Display Note'] && row['Display Note'].length > 500) {
      warnings.push(`Row ${rowNum}: Display Note exceeds 500 characters (will be truncated)`);
    }
    
    // Validate units of service
    if (row['Units of Service']) {
      const units = parseInt(row['Units of Service']);
      if (isNaN(units) || units < 1) {
        errors.push(`Row ${rowNum}: Units of Service must be a positive number`);
      }
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export default {
  IMPORT_COLUMNS,
  generateImportTemplate,
  generateImportInstructions,
  downloadImportTemplate,
  downloadImportInstructions,
  validateImportData
};