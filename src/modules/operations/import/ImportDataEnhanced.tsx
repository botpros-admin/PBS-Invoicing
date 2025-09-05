import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Download, 
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { ImportService } from '../services/importService';
import { useAuth } from '../../../context/AuthContext';
import { useTenant } from '../../../context/TenantContext';
import type { ImportResult, ImportValidationError } from '../../../types/database';

export const ImportDataEnhanced: React.FC = () => {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<ImportValidationError[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateFile(droppedFile);
    }
  };

  const validateFile = (selectedFile: File) => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const hasValidExtension = validExtensions.some(ext => 
      selectedFile.name.toLowerCase().endsWith(ext)
    );

    if (!validTypes.includes(selectedFile.type) && !hasValidExtension) {
      alert('Please upload a CSV or Excel file');
      return;
    }

    setFile(selectedFile);
    setImportResult(null);
    setValidationErrors([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateFile(selectedFile);
    }
  };

  const handleValidate = async () => {
    if (!file || !currentOrganization) return;

    setIsValidating(true);
    setImportResult(null);
    setValidationErrors([]);

    try {
      const importService = new ImportService(currentOrganization.id);
      const result = await importService.importFile(file, user?.id || '', {
        validateOnly: true,
        allowDuplicates
      });

      setImportResult(result);
      setValidationErrors(result.errors);
      
      if (result.errors.length > 0) {
        setShowErrors(true);
      }
    } catch (error: any) {
      alert(`Validation failed: ${error.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!file || !currentOrganization) return;

    setIsProcessing(true);

    try {
      const importService = new ImportService(currentOrganization.id);
      const result = await importService.importFile(file, user?.id || '', {
        validateOnly: false,
        allowDuplicates
      });

      setImportResult(result);
      
      if (result.success) {
        alert(`Import successful! ${result.success_rows} records imported.`);
        handleReset();
      } else {
        setValidationErrors(result.errors);
        setShowErrors(true);
      }
    } catch (error: any) {
      alert(`Import failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setImportResult(null);
    setValidationErrors([]);
    setShowErrors(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const csvContent = [
      'accession_number,cpt_code,client_code,laboratory_code,service_date,quantity',
      'ACC001,80053,CLIENT1,LAB1,2024-01-15,1',
      'ACC002,80061,CLIENT1,LAB1,2024-01-15,2'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getErrorsByField = () => {
    const errorMap = new Map<string, ImportValidationError[]>();
    validationErrors.forEach(error => {
      if (!errorMap.has(error.field)) {
        errorMap.set(error.field, []);
      }
      errorMap.get(error.field)?.push(error);
    });
    return errorMap;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Import Data</h2>
        
        {/* Template Download */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900">Need a template?</h3>
              <p className="text-sm text-blue-700 mt-1">
                Download our CSV template with the required columns and format.
              </p>
              <button
                onClick={downloadTemplate}
                className="mt-2 inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Download Template
              </button>
            </div>
          </div>
        </div>

        {/* File Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : file 
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          
          {file ? (
            <div className="space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <button
                onClick={handleReset}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
              >
                <X className="h-4 w-4 mr-1" />
                Remove File
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Choose File
              </label>
              <p className="mt-2 text-sm text-gray-500">
                or drag and drop your CSV or Excel file here
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Supported formats: CSV, XLSX
              </p>
            </>
          )}
        </div>

        {/* Options */}
        {file && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allow-duplicates"
                checked={allowDuplicates}
                onChange={(e) => setAllowDuplicates(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="allow-duplicates" className="ml-2 text-sm text-gray-700">
                Allow duplicate entries (skip duplicate checking)
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleValidate}
                disabled={isValidating || isProcessing}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Validate Only
                  </>
                )}
              </button>

              <button
                onClick={handleImport}
                disabled={isProcessing || isValidating}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results Summary */}
        {importResult && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Import Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Total Rows</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {importResult.total_rows}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Successful</p>
                  <p className="text-lg font-semibold text-green-600">
                    {importResult.success_rows}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Errors</p>
                  <p className="text-lg font-semibold text-red-600">
                    {importResult.error_rows}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Duplicates</p>
                  <p className="text-lg font-semibold text-yellow-600">
                    {importResult.duplicates.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Error Details */}
            {validationErrors.length > 0 && (
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-red-900">
                    Validation Errors ({validationErrors.length})
                  </h3>
                  <button
                    onClick={() => setShowErrors(!showErrors)}
                    className="text-sm text-red-700 hover:text-red-900"
                  >
                    {showErrors ? 'Hide' : 'Show'} Details
                  </button>
                </div>
                
                {showErrors && (
                  <div className="mt-3 max-h-60 overflow-y-auto">
                    <table className="min-w-full divide-y divide-red-200">
                      <thead className="bg-red-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-red-900">Row</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-red-900">Field</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-red-900">Error</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-red-900">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-200 bg-white">
                        {validationErrors.slice(0, 100).map((error, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm text-gray-900">{error.row}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{error.field}</td>
                            <td className="px-3 py-2 text-sm text-red-700">{error.message}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {error.value || 'empty'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {validationErrors.length > 100 && (
                      <p className="mt-2 text-sm text-red-700">
                        Showing first 100 errors of {validationErrors.length}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Duplicate Warning */}
            {importResult.duplicates.length > 0 && !allowDuplicates && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-900">
                      Duplicate Entries Found
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      {importResult.duplicates.length} entries already exist in the system.
                      Enable "Allow duplicates" to import them anyway, or{' '}
                      <Link to="/data/duplicate-overrides" className="underline">
                        manage overrides
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportDataEnhanced;
