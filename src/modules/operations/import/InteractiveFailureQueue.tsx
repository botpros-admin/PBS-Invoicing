import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit2,
  Plus,
  RefreshCw,
  SkipForward,
  Save,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../../../api/supabase';
import { useTenant } from '../../../context/TenantContext';

interface FailedRow {
  id: string;
  rowNumber: number;
  data: Record<string, any>;
  error: {
    type: 'CLINIC_NOT_FOUND' | 'CPT_NOT_MAPPED' | 'INVALID_FORMAT' | 'DUPLICATE' | 'MISSING_REQUIRED';
    field: string;
    message: string;
    value?: any;
  };
  status: 'pending' | 'fixed' | 'skipped' | 'processing';
  fixedData?: Record<string, any>;
}

interface InteractiveFailureQueueProps {
  failedRows: FailedRow[];
  successCount: number;
  onReprocess: (rows: FailedRow[]) => Promise<void>;
  onComplete: () => void;
}

export const InteractiveFailureQueue: React.FC<InteractiveFailureQueueProps> = ({
  failedRows: initialFailedRows,
  successCount,
  onReprocess,
  onComplete
}) => {
  const { currentOrganization } = useTenant();
  const [failedRows, setFailedRows] = useState<FailedRow[]>(initialFailedRows);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showAddClinic, setShowAddClinic] = useState(false);
  const [showAddCPT, setShowAddCPT] = useState(false);
  const [selectedRowForFix, setSelectedRowForFix] = useState<FailedRow | null>(null);
  const [newClinicName, setNewClinicName] = useState('');
  const [newCPTCode, setNewCPTCode] = useState('');
  const [newCPTDescription, setNewCPTDescription] = useState('');

  // Stats
  const pendingCount = failedRows.filter(r => r.status === 'pending').length;
  const fixedCount = failedRows.filter(r => r.status === 'fixed').length;
  const skippedCount = failedRows.filter(r => r.status === 'skipped').length;

  // Filter rows based on type and search
  const filteredRows = failedRows.filter(row => {
    const matchesFilter = filterType === 'all' || row.error.type === filterType;
    const matchesSearch = searchTerm === '' || 
      JSON.stringify(row.data).toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.error.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleToggleRow = (rowId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  const handleSelectRow = (rowId: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === filteredRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredRows.map(r => r.id)));
    }
  };

  const handleAddClinic = async () => {
    if (!newClinicName || !selectedRowForFix || !currentOrganization) return;

    try {
      // Add clinic to database
      const { data: newClinic, error } = await supabase
        .from('healthcare_providers')
        .insert({
          organization_id: currentOrganization.id,
          name: newClinicName,
          type: 'clinic',
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Update the failed row with fixed data
      setFailedRows(prev => prev.map(row => {
        if (row.id === selectedRowForFix.id) {
          return {
            ...row,
            status: 'fixed',
            fixedData: {
              ...row.data,
              clinic_id: newClinic.id,
              clinic_name: newClinicName
            }
          };
        }
        return row;
      }));

      setShowAddClinic(false);
      setNewClinicName('');
      setSelectedRowForFix(null);
    } catch (error) {
      console.error('Failed to add clinic:', error);
      alert('Failed to add clinic. Please try again.');
    }
  };

  const handleAddCPTCode = async () => {
    if (!newCPTCode || !selectedRowForFix || !currentOrganization) return;

    try {
      // Add CPT code to database
      const { data: newCPT, error } = await supabase
        .from('cpt_codes')
        .insert({
          organization_id: currentOrganization.id,
          code: newCPTCode,
          description: newCPTDescription || newCPTCode,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Update the failed row with fixed data
      setFailedRows(prev => prev.map(row => {
        if (row.id === selectedRowForFix.id) {
          return {
            ...row,
            status: 'fixed',
            fixedData: {
              ...row.data,
              cpt_code_id: newCPT.id,
              cpt_code: newCPTCode
            }
          };
        }
        return row;
      }));

      setShowAddCPT(false);
      setNewCPTCode('');
      setNewCPTDescription('');
      setSelectedRowForFix(null);
    } catch (error) {
      console.error('Failed to add CPT code:', error);
      alert('Failed to add CPT code. Please try again.');
    }
  };

  const handleEditField = (rowId: string, field: string, value: any) => {
    setFailedRows(prev => prev.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          status: 'fixed',
          fixedData: {
            ...(row.fixedData || row.data),
            [field]: value
          }
        };
      }
      return row;
    }));
  };

  const handleSkipRows = () => {
    const rowsToSkip = Array.from(selectedRows);
    setFailedRows(prev => prev.map(row => {
      if (rowsToSkip.includes(row.id)) {
        return { ...row, status: 'skipped' };
      }
      return row;
    }));
    setSelectedRows(new Set());
  };

  const handleReprocessRows = async () => {
    const rowsToReprocess = failedRows.filter(row => 
      selectedRows.has(row.id) && row.status === 'fixed'
    );

    if (rowsToReprocess.length === 0) {
      alert('Please fix some rows before reprocessing');
      return;
    }

    setIsProcessing(true);
    try {
      await onReprocess(rowsToReprocess);
      
      // Remove successfully processed rows
      setFailedRows(prev => prev.filter(row => !selectedRows.has(row.id)));
      setSelectedRows(new Set());
    } catch (error) {
      console.error('Reprocessing failed:', error);
      alert('Failed to reprocess rows. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getErrorIcon = (errorType: string) => {
    switch (errorType) {
      case 'CLINIC_NOT_FOUND':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'CPT_NOT_MAPPED':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'INVALID_FORMAT':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'DUPLICATE':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Import Progress</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
            <div className="text-2xl font-bold text-green-900">{successCount.toLocaleString()}</div>
            <div className="text-sm text-green-700">Successfully Imported</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <AlertCircle className="h-8 w-8 text-yellow-600 mb-2" />
            <div className="text-2xl font-bold text-yellow-900">{pendingCount}</div>
            <div className="text-sm text-yellow-700">Pending Fix</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <CheckCircle className="h-8 w-8 text-blue-600 mb-2" />
            <div className="text-2xl font-bold text-blue-900">{fixedCount}</div>
            <div className="text-sm text-blue-700">Fixed & Ready</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <SkipForward className="h-8 w-8 text-gray-600 mb-2" />
            <div className="text-2xl font-bold text-gray-900">{skippedCount}</div>
            <div className="text-sm text-gray-700">Skipped</div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search errors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Errors</option>
              <option value="CLINIC_NOT_FOUND">Clinic Not Found</option>
              <option value="CPT_NOT_MAPPED">CPT Not Mapped</option>
              <option value="INVALID_FORMAT">Invalid Format</option>
              <option value="DUPLICATE">Duplicates</option>
              <option value="MISSING_REQUIRED">Missing Required</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleSkipRows}
              disabled={selectedRows.size === 0}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <SkipForward className="h-4 w-4 mr-1" />
              Skip Selected ({selectedRows.size})
            </button>
            <button
              onClick={handleReprocessRows}
              disabled={selectedRows.size === 0 || isProcessing}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Reprocessing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reprocess Fixed ({selectedRows.size})
                </>
              )}
            </button>
            {failedRows.length === 0 && (
              <button
                onClick={onComplete}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete Import
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Queue Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error Type</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRows.map((row) => (
              <React.Fragment key={row.id}>
                <tr className={row.status === 'fixed' ? 'bg-green-50' : row.status === 'skipped' ? 'bg-gray-50' : ''}>
                  <td className="px-3 py-4">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={() => handleSelectRow(row.id)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-900">{row.rowNumber}</td>
                  <td className="px-3 py-4">
                    <div className="flex items-center">
                      {getErrorIcon(row.error.type)}
                      <span className="ml-2 text-sm text-gray-900">
                        {row.error.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-900">{row.error.message}</td>
                  <td className="px-3 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      row.status === 'fixed' ? 'bg-green-100 text-green-800' :
                      row.status === 'skipped' ? 'bg-gray-100 text-gray-800' :
                      row.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      {row.error.type === 'CLINIC_NOT_FOUND' && row.status === 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedRowForFix(row);
                            setShowAddClinic(true);
                          }}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Clinic
                        </button>
                      )}
                      {row.error.type === 'CPT_NOT_MAPPED' && row.status === 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedRowForFix(row);
                            setShowAddCPT(true);
                          }}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded hover:bg-orange-200"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Map CPT
                        </button>
                      )}
                      {row.error.type === 'INVALID_FORMAT' && row.status === 'pending' && (
                        <button
                          onClick={() => handleToggleRow(row.id)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <button
                      onClick={() => handleToggleRow(row.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {expandedRows.has(row.id) ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </td>
                </tr>
                {expandedRows.has(row.id) && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 bg-gray-50">
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-900">Row Data:</h4>
                        <div className="grid grid-cols-3 gap-4">
                          {Object.entries(row.fixedData || row.data).map(([key, value]) => (
                            <div key={key}>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                {key.replace(/_/g, ' ')}
                              </label>
                              {row.error.type === 'INVALID_FORMAT' && row.error.field === key ? (
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) => handleEditField(row.id, key, e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-red-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={value}
                                  readOnly
                                  className="w-full px-2 py-1 text-sm border border-gray-200 rounded bg-gray-50"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Clinic Modal */}
      {showAddClinic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add New Clinic</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinic Name
                </label>
                <input
                  type="text"
                  value={newClinicName}
                  onChange={(e) => setNewClinicName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter clinic name"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowAddClinic(false);
                    setNewClinicName('');
                    setSelectedRowForFix(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddClinic}
                  disabled={!newClinicName}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Clinic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add CPT Code Modal */}
      {showAddCPT && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Map CPT Code</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPT Code
                </label>
                <input
                  type="text"
                  value={newCPTCode}
                  onChange={(e) => setNewCPTCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 80053"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newCPTDescription}
                  onChange={(e) => setNewCPTDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Comprehensive Metabolic Panel"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowAddCPT(false);
                    setNewCPTCode('');
                    setNewCPTDescription('');
                    setSelectedRowForFix(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCPTCode}
                  disabled={!newCPTCode}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Add CPT Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveFailureQueue;