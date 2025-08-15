import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, X, Download, Loader2 } from 'lucide-react';
import { supabase } from '../api/supabase'; // Import the supabase client

const ImportData: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [importStats, setImportStats] = useState<{
    total: number;
    success: number;
    duplicates: number;
    errors: number;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFile = async (selectedFile: File) => {
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(selectedFile.type)) {
      alert('Please upload a CSV or Excel file');
      return;
    }
    setFile(selectedFile);
    setIsProcessing(true);
    setPreviewData([]);
    setErrors({});
    setIsComplete(false);
    setImportStats(null);

    const fileContent = await selectedFile.text();

    // Call the 'import-data' Edge Function for validation
    const { data: responseData, error } = await supabase.functions.invoke('import-data', {
      body: {
        file_content: fileContent,
        file_type: selectedFile.type,
        commit: false
      }
    });

    setIsProcessing(false);

    if (error) {
      alert(`Error validating file: ${error.message}`);
      return;
    }

    const { data: validatedData } = responseData;
    setPreviewData(validatedData);

    const newErrors: Record<string, string[]> = {};
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    validatedData.forEach((row: any) => {
      if (row.status === 'error') {
        newErrors[`row-${row.id}`] = row.errors;
        errorCount++;
      } else if (row.status === 'duplicate') {
        duplicateCount++;
      } else if (row.status === 'valid') {
        successCount++;
      }
    });

    setErrors(newErrors);
    setImportStats({
      total: validatedData.length,
      success: successCount,
      duplicates: duplicateCount,
      errors: errorCount,
    });
  };

  const handleCommit = async () => {
    if (!file || !importStats || importStats.success === 0) {
      alert('No valid records to import.');
      return;
    }

    setIsCommitting(true);
    const fileContent = await file.text();

    // Call the 'import-data' Edge Function to commit
    const { error } = await supabase.functions.invoke('import-data', {
      body: {
        file_content: fileContent,
        file_type: file.type,
        commit: true
      }
    });

    setIsCommitting(false);

    if (error) {
      alert(`Error committing data: ${error.message}`);
    } else {
      setIsComplete(true);
      alert('Successfully imported valid records!');
    }
  };

  // ... (rest of the component remains the same, but would include a commit button)

  return (
    <div className="space-y-6">
      {/* ... UI for file drop ... */}

      {importStats && !isComplete && (
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleCommit}
            disabled={isCommitting || importStats.success === 0}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
          >
            {isCommitting ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} />
                Committing...
              </>
            ) : (
              `Commit ${importStats.success} Valid Records`
            )}
          </button>
        </div>
      )}

      {/* ... UI for preview data ... */}
    </div>
  );
};

export default ImportData;
