import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Eye,
  Calendar,
  AlertCircle,
  Check,
  X,
  File,
  Lock
} from 'lucide-react';
import { supabase } from '../../api/supabase';
import { useNotifications } from '../../context/NotificationContext';
import { fieldEncryption } from '../../services/encryption/fieldEncryption';

interface Contract {
  id: string;
  clinic_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  encrypted_url?: string;
  start_date: string;
  end_date: string;
  contract_type: 'service' | 'pricing' | 'nda' | 'baa' | 'other';
  status: 'active' | 'expired' | 'pending' | 'terminated';
  notes?: string;
  uploaded_by: string;
  uploaded_at: string;
  last_accessed?: string;
  access_count: number;
}

interface ContractUploadProps {
  clinicId: string;
  clinicName: string;
  onUploadComplete?: (contract: Contract) => void;
}

const ContractUpload: React.FC<ContractUploadProps> = ({ 
  clinicId, 
  clinicName,
  onUploadComplete 
}) => {
  const { addNotification } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    contract_type: 'service' as Contract['contract_type'],
    start_date: '',
    end_date: '',
    notes: '',
    encrypt: true
  });

  // Maximum file size (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  
  // Allowed file types
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ];

  useEffect(() => {
    fetchContracts();
  }, [clinicId]);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('clinic_contracts')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      setContracts(data || []);
    } catch (error) {
      addNotification('error', 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      addNotification('error', 'File size must be less than 10MB');
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      addNotification('error', 'Invalid file type. Please upload PDF, Word, or image files.');
      return;
    }

    setUploadForm({ ...uploadForm, file });
    setShowUploadModal(true);
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.start_date) {
      addNotification('error', 'Please select a file and start date');
      return;
    }

    try {
      setUploading(true);

      // Generate unique file name
      const timestamp = Date.now();
      const fileName = `${clinicId}/${timestamp}_${uploadForm.file.name}`;

      // Upload file to Supabase Storage
      let fileUrl = '';
      
      if (uploadForm.encrypt) {
        // Encrypt file before upload
        const fileBuffer = await uploadForm.file.arrayBuffer();
        const fileString = Buffer.from(fileBuffer).toString('base64');
        const encryptedContent = fieldEncryption.encrypt(fileString);
        
        // Store encrypted content
        const { data: storageData, error: storageError } = await supabase.storage
          .from('contracts')
          .upload(fileName + '.encrypted', new Blob([encryptedContent!]), {
            contentType: 'application/octet-stream'
          });

        if (storageError) throw storageError;
        
        fileUrl = storageData.path;
      } else {
        // Regular upload
        const { data: storageData, error: storageError } = await supabase.storage
          .from('contracts')
          .upload(fileName, uploadForm.file, {
            contentType: uploadForm.file.type
          });

        if (storageError) throw storageError;
        
        fileUrl = storageData.path;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Save contract metadata to database
      const contractData = {
        clinic_id: clinicId,
        file_name: uploadForm.file.name,
        file_size: uploadForm.file.size,
        file_type: uploadForm.file.type,
        file_url: fileUrl,
        encrypted_url: uploadForm.encrypt ? fileUrl : null,
        contract_type: uploadForm.contract_type,
        start_date: uploadForm.start_date,
        end_date: uploadForm.end_date || null,
        notes: uploadForm.notes || null,
        status: 'active' as const,
        uploaded_by: user?.id,
        uploaded_at: new Date().toISOString(),
        access_count: 0
      };

      const { data: contract, error: dbError } = await supabase
        .from('clinic_contracts')
        .insert(contractData)
        .select()
        .single();

      if (dbError) throw dbError;

      // Log upload
      await supabase.from('audit_logs').insert({
        action: 'upload',
        resource_type: 'contract',
        resource_id: contract.id,
        description: `Uploaded contract: ${uploadForm.file.name}`,
        metadata: {
          clinic_id: clinicId,
          file_type: uploadForm.file.type,
          encrypted: uploadForm.encrypt
        }
      });

      addNotification('success', 'Contract uploaded successfully');
      setContracts([contract, ...contracts]);
      setShowUploadModal(false);
      setUploadForm({
        file: null,
        contract_type: 'service',
        start_date: '',
        end_date: '',
        notes: '',
        encrypt: true
      });

      if (onUploadComplete) {
        onUploadComplete(contract);
      }
    } catch (error) {
      addNotification('error', 'Failed to upload contract');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (contract: Contract) => {
    try {
      let downloadUrl = '';
      
      if (contract.encrypted_url) {
        // Decrypt file
        const { data, error } = await supabase.storage
          .from('contracts')
          .download(contract.encrypted_url);

        if (error) throw error;

        const encryptedContent = await data.text();
        const decryptedContent = fieldEncryption.decrypt(encryptedContent);
        
        if (!decryptedContent) throw new Error('Failed to decrypt file');
        
        // Convert base64 back to blob
        const byteCharacters = atob(decryptedContent);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: contract.file_type });
        
        downloadUrl = URL.createObjectURL(blob);
      } else {
        // Regular download
        const { data } = supabase.storage
          .from('contracts')
          .getPublicUrl(contract.file_url);
        
        downloadUrl = data.publicUrl;
      }

      // Create download link
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = contract.file_name;
      a.click();

      // Update access count
      await supabase
        .from('clinic_contracts')
        .update({ 
          access_count: contract.access_count + 1,
          last_accessed: new Date().toISOString()
        })
        .eq('id', contract.id);

      // Log download
      await supabase.from('audit_logs').insert({
        action: 'download',
        resource_type: 'contract',
        resource_id: contract.id,
        description: `Downloaded contract: ${contract.file_name}`
      });

    } catch (error) {
      addNotification('error', 'Failed to download contract');
    }
  };

  const handleDelete = async (contract: Contract) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('contracts')
        .remove([contract.encrypted_url || contract.file_url]);

      if (storageError) 

      // Delete from database
      const { error: dbError } = await supabase
        .from('clinic_contracts')
        .delete()
        .eq('id', contract.id);

      if (dbError) throw dbError;

      // Log deletion
      await supabase.from('audit_logs').insert({
        action: 'delete',
        resource_type: 'contract',
        resource_id: contract.id,
        description: `Deleted contract: ${contract.file_name}`
      });

      addNotification('success', 'Contract deleted successfully');
      setContracts(contracts.filter(c => c.id !== contract.id));
    } catch (error) {
      addNotification('error', 'Failed to delete contract');
    }
  };

  const getStatusBadge = (status: Contract['status']) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      terminated: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Contract Management</h3>
          <p className="text-sm text-gray-600">Upload and manage contracts for {clinicName}</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Upload className="h-4 w-4" />
          <span>Upload Contract</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Contracts List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {contracts.map(contract => (
              <tr key={contract.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{contract.file_name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(contract.file_size)}
                        {contract.encrypted_url && (
                          <span className="ml-2 inline-flex items-center">
                            <Lock className="h-3 w-3 text-green-500" />
                            <span className="text-green-600 ml-1">Encrypted</span>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {contract.contract_type.charAt(0).toUpperCase() + contract.contract_type.slice(1)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div>
                    <p>{new Date(contract.start_date).toLocaleDateString()}</p>
                    {contract.end_date && (
                      <p className="text-xs text-gray-500">
                        to {new Date(contract.end_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(contract.status)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div>
                    <p>{new Date(contract.uploaded_at).toLocaleDateString()}</p>
                    {contract.access_count > 0 && (
                      <p className="text-xs text-gray-500">
                        Accessed {contract.access_count} times
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDownload(contract)}
                      className="text-blue-600 hover:text-blue-700"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSelectedContract(contract)}
                      className="text-gray-600 hover:text-gray-700"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(contract)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {contracts.length === 0 && !loading && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No contracts uploaded yet</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && uploadForm.file && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h3 className="text-lg font-semibold mb-4">Upload Contract</h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>File:</strong> {uploadForm.file.name}
                </p>
                <p className="text-sm text-gray-600">
                  Size: {formatFileSize(uploadForm.file.size)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Type *
                </label>
                <select
                  value={uploadForm.contract_type}
                  onChange={(e) => setUploadForm({ 
                    ...uploadForm, 
                    contract_type: e.target.value as Contract['contract_type'] 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="service">Service Agreement</option>
                  <option value="pricing">Pricing Agreement</option>
                  <option value="nda">NDA</option>
                  <option value="baa">BAA (Business Associate Agreement)</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={uploadForm.start_date}
                    onChange={(e) => setUploadForm({ ...uploadForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={uploadForm.end_date}
                    onChange={(e) => setUploadForm({ ...uploadForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Additional notes about this contract..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="encrypt"
                  checked={uploadForm.encrypt}
                  onChange={(e) => setUploadForm({ ...uploadForm, encrypt: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="encrypt" className="ml-2 text-sm text-gray-700">
                  Encrypt file for additional security (HIPAA compliant)
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadForm({
                    file: null,
                    contract_type: 'service',
                    start_date: '',
                    end_date: '',
                    notes: '',
                    encrypt: true
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadForm.start_date}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload Contract'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractUpload;