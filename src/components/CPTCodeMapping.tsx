import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Upload, 
  Download, 
  ChevronRight,
  DollarSign,
  Check,
  X,
  AlertCircle,
  FileText
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { CPTMapping, FeeScheduleItem } from '../types/laboratory';
import { useNotifications } from '../context/NotificationContext';
import { useTenant } from '../context/TenantContext';
import { searchCptCodes } from '../api/services/cpt.service';
import debounce from 'lodash/debounce';

interface CPTCodeMappingProps {
  onSelect?: (mapping: CPTMapping) => void;
  mode?: 'lookup' | 'management';
}

const CPTCodeMapping: React.FC<CPTCodeMappingProps> = ({ onSelect, mode = 'lookup' }) => {
  const { addNotification } = useNotifications();
  const { currentTenant } = useTenant();
  const [mappings, setMappings] = useState<CPTMapping[]>([]);
  const [filteredMappings, setFilteredMappings] = useState<CPTMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<CPTMapping | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    input_code: '',
    output_code: '',
    display_name: '',
    description: '',
    default_price: 0
  });

  // VLOOKUP autocomplete state
  const [suggestions, setSuggestions] = useState<CPTMapping[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Fetch mappings on mount
  useEffect(() => {
    if (currentTenant?.id) {
      fetchMappings();
    }
  }, [currentTenant]);

  // Filter mappings when search term changes
  useEffect(() => {
    performSearch(searchTerm);
  }, [searchTerm, mappings]);

  const fetchMappings = async () => {
    if (!currentTenant?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cpt_mappings')
        .select(`
          *,
          fee_schedule_items(
            price,
            fee_schedules(
              name,
              is_default
            )
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('input_code');

      if (error) throw error;
      setMappings(data || []);
      setFilteredMappings(data || []);
    } catch (error) {
      console.error('Error fetching CPT mappings:', error);
      addNotification('error', 'Failed to load CPT mappings');
    } finally {
      setLoading(false);
    }
  };

  // VLOOKUP-style search with debouncing
  const performSearch = useCallback(
    debounce((term: string) => {
      if (!term) {
        setFilteredMappings(mappings);
        setSuggestions([]);
        return;
      }

      const searchLower = term.toLowerCase();
      const filtered = mappings.filter(m => 
        m.input_code.toLowerCase().includes(searchLower) ||
        m.output_code.toLowerCase().includes(searchLower) ||
        m.display_name.toLowerCase().includes(searchLower) ||
        (m.description && m.description.toLowerCase().includes(searchLower))
      );

      setFilteredMappings(filtered);
      
      // For lookup mode, show suggestions
      if (mode === 'lookup') {
        setSuggestions(filtered.slice(0, 10));
        setShowSuggestions(filtered.length > 0);
      }
    }, 300),
    [mappings, mode]
  );

  // Keyboard navigation for VLOOKUP
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectMapping(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelectMapping = (mapping: CPTMapping) => {
    if (onSelect) {
      onSelect(mapping);
    }
    setSearchTerm(mapping.display_name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    // Show price if available
    if (mapping.fee_schedule_items && mapping.fee_schedule_items.length > 0) {
      const defaultPrice = mapping.fee_schedule_items.find(
        item => item.fee_schedules?.is_default
      );
      if (defaultPrice) {
        addNotification('info', `Price: $${defaultPrice.price}`);
      }
    }
  };

  const handleAddMapping = async () => {
    if (!currentTenant?.id) return;

    try {
      const { error } = await supabase
        .from('cpt_mappings')
        .insert([{
          ...formData,
          tenant_id: currentTenant.id,
          active: true
        }]);

      if (error) throw error;

      addNotification('success', 'CPT mapping added successfully');
      setShowAddModal(false);
      setFormData({
        input_code: '',
        output_code: '',
        display_name: '',
        description: '',
        default_price: 0
      });
      fetchMappings();
    } catch (error) {
      console.error('Error adding CPT mapping:', error);
      addNotification('error', 'Failed to add CPT mapping');
    }
  };

  const handleUpdateMapping = async () => {
    if (!editingMapping || !currentTenant?.id) return;

    try {
      const { error } = await supabase
        .from('cpt_mappings')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingMapping.id)
        .eq('tenant_id', currentTenant.id);

      if (error) throw error;

      addNotification('success', 'CPT mapping updated successfully');
      setEditingMapping(null);
      setFormData({
        input_code: '',
        output_code: '',
        display_name: '',
        description: '',
        default_price: 0
      });
      fetchMappings();
    } catch (error) {
      console.error('Error updating CPT mapping:', error);
      addNotification('error', 'Failed to update CPT mapping');
    }
  };

  const handleDeleteMapping = async (id: string) => {
    if (!currentTenant?.id) return;
    
    if (!confirm('Are you sure you want to delete this CPT mapping?')) return;

    try {
      const { error } = await supabase
        .from('cpt_mappings')
        .update({ active: false })
        .eq('id', id)
        .eq('tenant_id', currentTenant.id);

      if (error) throw error;

      addNotification('success', 'CPT mapping deleted successfully');
      fetchMappings();
    } catch (error) {
      console.error('Error deleting CPT mapping:', error);
      addNotification('error', 'Failed to delete CPT mapping');
    }
  };

  const handleImportCSV = async (file: File) => {
    // Parse CSV and import mappings
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const mappings = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            input_code: values[headers.indexOf('input_code')] || values[0],
            output_code: values[headers.indexOf('output_code')] || values[1],
            display_name: values[headers.indexOf('display_name')] || values[2],
            description: values[headers.indexOf('description')] || values[3],
            tenant_id: currentTenant?.id,
            active: true
          };
        }).filter(m => m.input_code && m.output_code);

        const { error } = await supabase
          .from('cpt_mappings')
          .upsert(mappings, { onConflict: 'tenant_id,input_code' });

        if (error) throw error;

        addNotification('success', `Imported ${mappings.length} CPT mappings`);
        setShowImportModal(false);
        fetchMappings();
      } catch (error) {
        console.error('Error importing CSV:', error);
        addNotification('error', 'Failed to import CSV');
      }
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const csv = [
      'input_code,output_code,display_name,description',
      ...filteredMappings.map(m => 
        `${m.input_code},${m.output_code},"${m.display_name}","${m.description || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cpt-mappings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Render lookup mode (VLOOKUP-style)
  if (mode === 'lookup') {
    return (
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            placeholder="Search CPT code, name, or description..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* VLOOKUP Suggestions Dropdown */}
        {showSuggestions && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            {suggestions.map((mapping, index) => (
              <div
                key={mapping.id}
                onClick={() => handleSelectMapping(mapping)}
                className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                  index === selectedIndex ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{mapping.input_code}</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                      <span className="text-blue-600">{mapping.output_code}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{mapping.display_name}</p>
                    {mapping.description && (
                      <p className="text-xs text-gray-500 mt-1">{mapping.description}</p>
                    )}
                  </div>
                  {mapping.fee_schedule_items && mapping.fee_schedule_items.length > 0 && (
                    <div className="text-right">
                      <span className="text-sm font-medium text-green-600">
                        ${mapping.fee_schedule_items[0].price}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render management mode
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">CPT Code Mapping</h2>
          <p className="text-sm text-gray-600 mt-1">
            VLOOKUP-style mapping from lab codes to standard CPT codes
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-1"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-1"
          >
            <Upload className="h-4 w-4" />
            <span>Import</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add Mapping</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search CPT codes..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Mappings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Input Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Output CPT</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Display Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Default Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredMappings.map((mapping) => (
              <tr key={mapping.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {mapping.input_code}
                </td>
                <td className="px-6 py-4 text-sm text-blue-600 font-medium">
                  {mapping.output_code}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {mapping.display_name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {mapping.description || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {mapping.fee_schedule_items && mapping.fee_schedule_items.length > 0 ? (
                    <span className="text-green-600 font-medium">
                      ${mapping.fee_schedule_items[0].price}
                    </span>
                  ) : (
                    <span className="text-gray-400">Not set</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingMapping(mapping);
                        setFormData({
                          input_code: mapping.input_code,
                          output_code: mapping.output_code,
                          display_name: mapping.display_name,
                          description: mapping.description || '',
                          default_price: 0
                        });
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMapping(mapping.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMappings.length === 0 && !loading && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No CPT mappings found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingMapping) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h3 className="text-lg font-semibold mb-4">
              {editingMapping ? 'Edit CPT Mapping' : 'Add CPT Mapping'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Input Code (from lab)
                </label>
                <input
                  type="text"
                  value={formData.input_code}
                  onChange={(e) => setFormData({ ...formData, input_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., CBC_COMPLETE"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Output CPT Code
                </label>
                <input
                  type="text"
                  value={formData.output_code}
                  onChange={(e) => setFormData({ ...formData, output_code: e.target.value })}
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
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Complete Blood Count"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Additional details about this CPT code..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingMapping(null);
                    setFormData({
                      input_code: '',
                      output_code: '',
                      display_name: '',
                      description: '',
                      default_price: 0
                    });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={editingMapping ? handleUpdateMapping : handleAddMapping}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingMapping ? 'Update' : 'Add'} Mapping
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h3 className="text-lg font-semibold mb-4">Import CPT Mappings</h3>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  Upload a CSV file with columns: input_code, output_code, display_name, description
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportCSV(file);
                  }}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                >
                  Choose File
                </label>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <strong>CSV Format:</strong> The first row should contain column headers.
                      Duplicate input codes will be updated with new values.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CPTCodeMapping;