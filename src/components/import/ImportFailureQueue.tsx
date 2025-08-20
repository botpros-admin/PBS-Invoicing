import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  RefreshCw, 
  Plus, 
  Edit, 
  Check, 
  X,
  Filter,
  Download,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { ImportFailure, Clinic, CPTMapping } from '../../types/laboratory';
import { useNotifications } from '../../context/NotificationContext';

interface ImportFailureQueueProps {
  onReprocess?: (failures: ImportFailure[]) => void;
}

const ImportFailureQueue: React.FC<ImportFailureQueueProps> = ({ onReprocess }) => {
  const { addNotification } = useNotifications();
  const [failures, setFailures] = useState<ImportFailure[]>([]);
  const [selectedFailures, setSelectedFailures] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  
  // Modal states
  const [showAddClinic, setShowAddClinic] = useState(false);
  const [showAddCPT, setShowAddCPT] = useState(false);
  const [newClinic, setNewClinic] = useState({ name: '', laboratory_id: '' });
  const [newCPT, setNewCPT] = useState({ input_code: '', output_code: '', display_name: '' });

  useEffect(() => {
    fetchFailures();
  }, [filterType]);

  const fetchFailures = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('import_failures')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('failure_type', filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFailures(data || []);
    } catch (error) {
      addNotification('error', 'Failed to load import failures');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedFailures.size === failures.length) {
      setSelectedFailures(new Set());
    } else {
      setSelectedFailures(new Set(failures.map(f => f.id)));
    }
  };

  const handleSelectFailure = (id: string) => {
    const newSelected = new Set(selectedFailures);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFailures(newSelected);
  };

  const handleReprocess = async () => {
    const selectedItems = failures.filter(f => selectedFailures.has(f.id));
    if (selectedItems.length === 0) {
      addNotification('warning', 'Please select items to reprocess');
      return;
    }

    try {
      // Call parent reprocess function if provided
      if (onReprocess) {
        onReprocess(selectedItems);
      }

      // Remove successfully reprocessed items from queue
      const { error } = await supabase
        .from('import_failures')
        .delete()
        .in('id', Array.from(selectedFailures));

      if (error) throw error;

      addNotification('success', `Reprocessing ${selectedItems.length} items`);
      setSelectedFailures(new Set());
      fetchFailures();
    } catch (error) {
      addNotification('error', 'Failed to reprocess items');
    }
  };

  const handleEdit = (failure: ImportFailure) => {
    setEditingRow(failure.id);
    setEditedData(failure.row_data);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('import_failures')
        .update({ row_data: editedData })
        .eq('id', id);

      if (error) throw error;

      addNotification('success', 'Row updated successfully');
      setEditingRow(null);
      fetchFailures();
    } catch (error) {
      addNotification('error', 'Failed to update row');
    }
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditedData({});
  };

  const handleAddClinic = async () => {
    try {
      const { error } = await supabase
        .from('clients')
        .insert([{
          name: newClinic.name,
          laboratory_id: newClinic.laboratory_id,
          active: true
        }]);

      if (error) throw error;

      addNotification('success', 'Clinic added successfully');
      setShowAddClinic(false);
      setNewClinic({ name: '', laboratory_id: '' });
      
      // Reprocess items with missing_clinic failure
      const clinicFailures = failures.filter(f => 
        f.failure_type === 'missing_clinic' && 
        f.row_data.clinic_name === newClinic.name
      );
      if (clinicFailures.length > 0) {
        handleReprocess();
      }
    } catch (error) {
      addNotification('error', 'Failed to add clinic');
    }
  };

  const handleAddCPT = async () => {
    try {
      const { error } = await supabase
        .from('cpt_mappings')
        .insert([{
          input_code: newCPT.input_code,
          output_code: newCPT.output_code,
          display_name: newCPT.display_name,
          active: true
        }]);

      if (error) throw error;

      addNotification('success', 'CPT code added successfully');
      setShowAddCPT(false);
      setNewCPT({ input_code: '', output_code: '', display_name: '' });
      
      // Reprocess items with missing_cpt failure
      const cptFailures = failures.filter(f => 
        f.failure_type === 'missing_cpt' && 
        f.row_data.cpt_code === newCPT.input_code
      );
      if (cptFailures.length > 0) {
        handleReprocess();
      }
    } catch (error) {
      addNotification('error', 'Failed to add CPT code');
    }
  };

  const handleDownloadFailures = () => {
    const csv = [
      Object.keys(failures[0]?.row_data || {}).join(','),
      ...failures.map(f => Object.values(f.row_data).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-failures-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getFailureIcon = (type: string) => {
    switch (type) {
      case 'duplicate':
        return '🔄';
      case 'missing_clinic':
        return '🏥';
      case 'missing_cpt':
        return '💉';
      case 'invalid_format':
        return '⚠️';
      default:
        return '❌';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">Import Failures</h2>
            <span className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full">
              {failures.length} failures
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Filter Dropdown */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Failures</option>
              <option value="duplicate">Duplicates</option>
              <option value="missing_clinic">Missing Clinic</option>
              <option value="missing_cpt">Missing CPT</option>
              <option value="invalid_format">Invalid Format</option>
              <option value="other">Other</option>
            </select>

            {/* Action Buttons */}
            <button
              onClick={() => setShowAddClinic(true)}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-1"
            >
              <Plus className="h-4 w-4" />
              <span>Add Clinic</span>
            </button>

            <button
              onClick={() => setShowAddCPT(true)}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-1"
            >
              <Plus className="h-4 w-4" />
              <span>Add CPT</span>
            </button>

            <button
              onClick={handleDownloadFailures}
              disabled={failures.length === 0}
              className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>

            <button
              onClick={handleReprocess}
              disabled={selectedFailures.size === 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reprocess Selected</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedFailures.size === failures.length && failures.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {failures.map((failure) => (
              <tr key={failure.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedFailures.has(failure.id)}
                    onChange={() => handleSelectFailure(failure.id)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  #{failure.row_number}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100">
                    {getFailureIcon(failure.failure_type)} {failure.failure_type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-red-600">
                  {failure.failure_reason}
                </td>
                <td className="px-6 py-4">
                  {editingRow === failure.id ? (
                    <div className="space-y-2">
                      {Object.entries(editedData).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 w-32">{key}:</span>
                          <input
                            type="text"
                            value={value as string}
                            onChange={(e) => setEditedData({
                              ...editedData,
                              [key]: e.target.value
                            })}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600 max-w-md truncate">
                      {Object.entries(failure.row_data).slice(0, 3).map(([key, value]) => (
                        <span key={key} className="mr-3">
                          <strong>{key}:</strong> {value as string}
                        </span>
                      ))}
                      {Object.keys(failure.row_data).length > 3 && '...'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    {editingRow === failure.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(failure.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(failure)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {failures.length === 0 && !loading && (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No import failures found</p>
          </div>
        )}
      </div>

      {/* Add Clinic Modal */}
      {showAddClinic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Clinic</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinic Name
                </label>
                <input
                  type="text"
                  value={newClinic.name}
                  onChange={(e) => setNewClinic({ ...newClinic, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Enter clinic name"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddClinic(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddClinic}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Clinic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add CPT Modal */}
      {showAddCPT && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add CPT Code Mapping</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Input Code (from lab)
                </label>
                <input
                  type="text"
                  value={newCPT.input_code}
                  onChange={(e) => setNewCPT({ ...newCPT, input_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., CBC_COMPLETE"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Output Code (standard CPT)
                </label>
                <input
                  type="text"
                  value={newCPT.output_code}
                  onChange={(e) => setNewCPT({ ...newCPT, output_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 85025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newCPT.display_name}
                  onChange={(e) => setNewCPT({ ...newCPT, display_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Complete Blood Count"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddCPT(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCPT}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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

export default ImportFailureQueue;