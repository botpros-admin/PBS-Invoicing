import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, X, Download } from 'lucide-react';

// Define types needed for this component
interface ImportProgress {
  currentStep: string;
  itemsProcessed: number;
  totalItems: number;
}

interface ImportResult {
  success: boolean;
  message: string;
  error?: any;
}

const ImportData: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [importStats, setImportStats] = useState<{
    total: number;
    success: number;
    duplicates: number;
    errors: number;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // File handling functions
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };
  
  const handleFile = (file: File) => {
    // Check if file is CSV or Excel
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a CSV or Excel file');
      return;
    }
    
    setFile(file);
    
    // TODO: Replace with actual file parsing and validation logic
    // For this demo, we'll simulate parsing with mock data
    setTimeout(() => {
      // This is example data for UI demonstration only
      const mockData = [
        {
          id: 1,
          invoiceNumber: 'INV-2023-1001',
          client: 'Memorial Hospital',
          patient: 'John Smith',
          accessionNumber: 'ACC-2001',
          cptCode: '85025',
          description: 'Complete Blood Count (CBC)',
          dateOfService: '2023-01-10',
          amount: 45.00,
          status: 'valid'
        },
        {
          id: 2,
          invoiceNumber: 'INV-2023-1002',
          client: 'City Medical Center',
          patient: 'Jane Doe',
          accessionNumber: 'ACC-2002',
          cptCode: '80053',
          description: 'Comprehensive Metabolic Panel',
          dateOfService: '2023-01-11',
          amount: 58.00,
          status: 'duplicate'
        },
        {
          id: 3,
          invoiceNumber: 'INV-2023-1003',
          client: '',
          patient: 'Bob Johnson',
          accessionNumber: 'ACC-2003',
          cptCode: '80061',
          description: 'Lipid Panel',
          dateOfService: '2023-01-12',
          amount: 42.00,
          status: 'error'
        },
        {
          id: 4,
          invoiceNumber: 'INV-2023-1004',
          client: 'Riverside Clinic',
          patient: 'Alice Brown',
          accessionNumber: 'ACC-2004',
          cptCode: '84443',
          description: 'Thyroid Stimulating Hormone (TSH)',
          dateOfService: '2023-01-13',
          amount: 0,
          status: 'error'
        },
        {
          id: 5,
          invoiceNumber: 'INV-2023-1005',
          client: 'Valley Health Partners',
          patient: 'Charlie Wilson',
          accessionNumber: 'ACC-2005',
          cptCode: '83036',
          description: 'Hemoglobin A1C',
          dateOfService: '2023-01-14',
          amount: 38.00,
          status: 'valid'
        }
      ];
      
      setPreviewData(mockData);
      
      // Set example validation errors
      setErrors({
        'row-3': ['Missing client information'],
        'row-4': ['Price cannot be zero']
      });
    }, 1000);
  };
  
  const handleProcessFile = () => {
    setIsProcessing(true);
    
    // TODO: Replace with actual import logic connecting to your backend API
    // Simulate processing delay
    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);
      setImportStats({
        total: previewData.length,
        success: previewData.filter(row => row.status === 'valid').length,
        duplicates: previewData.filter(row => row.status === 'duplicate').length,
        errors: previewData.filter(row => row.status === 'error').length
      });
    }, 2000);
  };
  
  const handleReset = () => {
    setFile(null);
    setPreviewData([]);
    setErrors({});
    setIsComplete(false);
    setImportStats(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const getRowStatusClass = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-50';
      case 'duplicate':
        return 'bg-yellow-50';
      case 'error':
        return 'bg-red-50';
      default:
        return '';
    }
  };
  
  const getRowStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'duplicate':
        return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'error':
        return <X size={16} className="text-red-500" />;
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
        
        {file && (
          <div className="flex space-x-3">
            <button
              onClick={handleReset}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Reset
            </button>
            
            {previewData.length > 0 && !isComplete && (
              <button
                onClick={handleProcessFile}
                disabled={isProcessing}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    Process File
                  </>
                )}
              </button>
            )}
            
            {isComplete && (
              <button
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Download size={16} className="mr-2" />
                Download Results
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Information panel to replace the previous mock data import section */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Data Import</h2>
        <p className="text-sm text-gray-500 mb-4">
          Use this tool to import data from external sources using CSV or Excel files.
          The system will validate the file format and data before importing.
        </p>
        
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle size={20} className="text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Note: The mock data import functionality has been removed as part of system optimization.
                Please use the file upload feature below to import data from files, or use the Supabase
                database interface for direct data management.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {!file ? (
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center ${
            isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-3 bg-indigo-100 rounded-full">
              <Upload size={24} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Drag and drop your file here
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                or <button onClick={() => fileInputRef.current?.click()} className="text-indigo-600 hover:text-indigo-500">browse</button> to select a file
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Supported formats: CSV, Excel (.xls, .xlsx)
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              accept=".csv,.xls,.xlsx"
              className="hidden"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {isComplete ? (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium text-gray-900">Import Results</h2>
                  <div className="flex items-center space-x-2">
                    <FileText size={20} className="text-gray-400" />
                    <span className="text-sm text-gray-500">{file.name}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Total Records</p>
                    <p className="text-xl font-medium">{importStats?.total}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-md">
                    <p className="text-sm text-green-500">Successfully Imported</p>
                    <p className="text-xl font-medium">{importStats?.success}</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-md">
                    <p className="text-sm text-yellow-500">Duplicates</p>
                    <p className="text-xl font-medium">{importStats?.duplicates}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-md">
                    <p className="text-sm text-red-500">Errors</p>
                    <p className="text-xl font-medium">{importStats?.errors}</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-4">Next Steps</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <CheckCircle size={20} className="text-green-500" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-700">
                          {importStats?.success} records have been successfully imported into the system.
                        </p>
                      </div>
                    </div>
                    
                    {importStats?.duplicates ? (
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <AlertTriangle size={20} className="text-yellow-500" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-gray-700">
                            {importStats.duplicates} duplicate records were found and skipped.
                          </p>
                        </div>
                      </div>
                    ) : null}
                    
                    {importStats?.errors ? (
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <X size={20} className="text-red-500" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-gray-700">
                            {importStats.errors} records had errors and were not imported. Download the error report for details.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">File Preview</h2>
                  <div className="flex items-center space-x-2">
                    <FileText size={20} className="text-gray-400" />
                    <span className="text-sm text-gray-500">{file.name}</span>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patient
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Accession #
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CPT Code
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date of Service
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                          <div className="flex justify-center">
                            <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                          <p className="mt-2">Parsing file...</p>
                        </td>
                      </tr>
                    ) : (
                      previewData.map((row) => (
                        <tr key={row.id} className={getRowStatusClass(row.status)}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getRowStatusIcon(row.status)}
                              <span className="ml-2 text-xs font-medium capitalize">
                                {row.status}
                              </span>
                            </div>
                            {errors[`row-${row.id}`] && (
                              <div className="mt-1 text-xs text-red-500">
                                {errors[`row-${row.id}`].map((error, i) => (
                                  <div key={i}>{error}</div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.invoiceNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.status === 'error' && !row.client ? (
                              <input
                                type="text"
                                placeholder="Enter client"
                                className="border-red-300 focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-red-300 rounded-md"
                              />
                            ) : (
                              row.client
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.patient}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.accessionNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.cptCode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.dateOfService}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {row.status === 'error' && row.amount === 0 ? (
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder="0.00"
                                className="border-red-300 focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-red-300 rounded-md"
                              />
                            ) : (
                              `$${row.amount.toFixed(2)}`
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-green-100 rounded-full mr-2"></div>
                      <span className="text-xs text-gray-500">Valid</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-yellow-100 rounded-full mr-2"></div>
                      <span className="text-xs text-gray-500">Duplicate</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-red-100 rounded-full mr-2"></div>
                      <span className="text-xs text-gray-500">Error</span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    Fix errors before processing the file
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportData;
