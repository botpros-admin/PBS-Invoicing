import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Upload,
  Download,
  Search,
  Edit2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Building2,
  FileText,
  Loader2
} from 'lucide-react';
import { DynamicPricingService } from '../../services/pricing/DynamicPricingService';
import { useTenant } from '../../context/TenantContext';
import { supabase } from '../../api/supabase';

interface PriceEntry {
  cpt_code: string;
  description: string;
  lab_default_price: number | null;
  clinic_custom_price: number | null;
  effective_date: string;
  source: 'lab_default' | 'clinic_custom' | 'none';
}

interface Clinic {
  id: string;
  name: string;
  code: string;
}

export const PricingManagement: React.FC = () => {
  const { currentOrganization } = useTenant();
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState<'lab' | 'clinic'>('lab');
  const [stats, setStats] = useState({
    totalCpts: 0,
    withLabDefault: 0,
    withClinicCustom: 0,
    missingPrices: 0
  });

  useEffect(() => {
    if (currentOrganization) {
      loadClinics();
    }
  }, [currentOrganization]);

  useEffect(() => {
    if (selectedClinic) {
      loadPrices();
    }
  }, [selectedClinic]);

  const loadClinics = async () => {
    if (!currentOrganization) return;

    const { data, error } = await supabase
      .from('healthcare_providers')
      .select('id, name, provider_code')
      .eq('organization_id', currentOrganization.id)
      .eq('provider_type', 'clinic')
      .order('name');

    if (!error && data) {
      setClinics(data.map(c => ({
        id: c.id,
        name: c.name,
        code: c.provider_code || ''
      })));
    }
  };

  const loadPrices = async () => {
    if (!currentOrganization || !selectedClinic) return;
    
    setLoading(true);
    try {
      // Get all CPT codes
      const { data: cptCodes } = await supabase
        .from('cpt_codes')
        .select('code, description')
        .eq('organization_id', currentOrganization.id)
        .order('code');

      if (!cptCodes) {
        setPrices([]);
        return;
      }

      // Get lab default prices
      const { data: labPrices } = await supabase
        .from('pricing_rules')
        .select('cpt_code, base_price')
        .eq('organization_id', currentOrganization.id)
        .eq('is_default', true)
        .is('end_date', null);

      const labPriceMap = new Map(
        labPrices?.map(p => [p.cpt_code, p.base_price]) || []
      );

      // Get clinic custom prices
      const { data: clinicPrices } = await supabase
        .from('clinic_pricing_overrides')
        .select('cpt_code, price')
        .eq('organization_id', currentOrganization.id)
        .eq('clinic_id', selectedClinic)
        .is('end_date', null);

      const clinicPriceMap = new Map(
        clinicPrices?.map(p => [p.cpt_code, p.price]) || []
      );

      // Combine into price entries
      const priceEntries: PriceEntry[] = cptCodes.map(cpt => {
        const labPrice = labPriceMap.get(cpt.code);
        const clinicPrice = clinicPriceMap.get(cpt.code);
        
        return {
          cpt_code: cpt.code,
          description: cpt.description || '',
          lab_default_price: labPrice ? Number(labPrice) : null,
          clinic_custom_price: clinicPrice ? Number(clinicPrice) : null,
          effective_date: new Date().toISOString().split('T')[0],
          source: clinicPrice ? 'clinic_custom' : labPrice ? 'lab_default' : 'none'
        };
      });

      setPrices(priceEntries);

      // Calculate stats
      setStats({
        totalCpts: priceEntries.length,
        withLabDefault: priceEntries.filter(p => p.lab_default_price !== null).length,
        withClinicCustom: priceEntries.filter(p => p.clinic_custom_price !== null).length,
        missingPrices: priceEntries.filter(p => !p.lab_default_price && !p.clinic_custom_price).length
      });

    } finally {
      setLoading(false);
    }
  };

  const handlePriceUpdate = async (cptCode: string, isClinicPrice: boolean) => {
    if (!currentOrganization || newPrice <= 0) return;

    const pricingService = new DynamicPricingService(
      currentOrganization.id,
      currentOrganization.id // Using org as lab ID for now
    );

    let success = false;
    if (isClinicPrice && selectedClinic) {
      success = await pricingService.updateClinicPrice(
        selectedClinic,
        cptCode,
        newPrice
      );
    } else {
      success = await pricingService.updateLabDefaultPrice(
        cptCode,
        newPrice
      );
    }

    if (success) {
      await loadPrices();
      setEditingPrice(null);
      setNewPrice(0);
    } else {
      alert('Failed to update price');
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!currentOrganization) return;

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const prices: Array<{ cpt_code: string; price: number }> = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const [cptCode, price] = lines[i].split(',').map(s => s.trim());
      if (cptCode && price) {
        prices.push({
          cpt_code: cptCode,
          price: parseFloat(price)
        });
      }
    }

    const pricingService = new DynamicPricingService(
      currentOrganization.id,
      currentOrganization.id
    );

    if (uploadType === 'lab') {
      const results = await pricingService.importLabDefaultPrices(prices);
      alert(`Imported ${results.success} prices, ${results.failed} failed`);
    } else if (selectedClinic) {
      // Import clinic prices
      let success = 0;
      for (const item of prices) {
        const result = await pricingService.updateClinicPrice(
          selectedClinic,
          item.cpt_code,
          item.price
        );
        if (result) success++;
      }
      alert(`Imported ${success} clinic prices`);
    }

    await loadPrices();
    setShowUpload(false);
  };

  const downloadTemplate = () => {
    const csv = [
      'cpt_code,price',
      '80053,150.00',
      '80061,125.00',
      '80076,175.00'
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pricing_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPrices = () => {
    const csv = [
      'cpt_code,description,lab_default_price,clinic_custom_price,effective_price',
      ...prices.map(p => [
        p.cpt_code,
        `"${p.description}"`,
        p.lab_default_price || '',
        p.clinic_custom_price || '',
        p.clinic_custom_price || p.lab_default_price || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pricing_${selectedClinic}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredPrices = prices.filter(p =>
    p.cpt_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dynamic Pricing Management</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage lab default prices and clinic custom overrides
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Prices
            </button>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </button>
            {selectedClinic && (
              <button
                onClick={exportPrices}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export Prices
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total CPT Codes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCpts}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Lab Defaults</p>
                <p className="text-2xl font-bold text-blue-900">{stats.withLabDefault}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Clinic Custom</p>
                <p className="text-2xl font-bold text-green-900">{stats.withClinicCustom}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Missing Prices</p>
                <p className="text-2xl font-bold text-red-900">{stats.missingPrices}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Clinic
            </label>
            <select
              value={selectedClinic}
              onChange={(e) => setSelectedClinic(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a clinic...</option>
              {clinics.map(clinic => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name} ({clinic.code})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search CPT Codes
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by code or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Price Table */}
      {selectedClinic && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      CPT Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Lab Default
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Clinic Custom
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Effective Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Source
                    </th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPrices.map((price) => (
                    <tr key={price.cpt_code} className={price.source === 'none' ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {price.cpt_code}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {price.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {editingPrice === `${price.cpt_code}-lab` ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={newPrice}
                              onChange={(e) => setNewPrice(parseFloat(e.target.value))}
                              className="w-24 px-2 py-1 border border-gray-300 rounded"
                              step="0.01"
                              min="0"
                            />
                            <button
                              onClick={() => handlePriceUpdate(price.cpt_code, false)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingPrice(null)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            ${price.lab_default_price?.toFixed(2) || '—'}
                            <button
                              onClick={() => {
                                setEditingPrice(`${price.cpt_code}-lab`);
                                setNewPrice(price.lab_default_price || 0);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {editingPrice === `${price.cpt_code}-clinic` ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={newPrice}
                              onChange={(e) => setNewPrice(parseFloat(e.target.value))}
                              className="w-24 px-2 py-1 border border-gray-300 rounded"
                              step="0.01"
                              min="0"
                            />
                            <button
                              onClick={() => handlePriceUpdate(price.cpt_code, true)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingPrice(null)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            ${price.clinic_custom_price?.toFixed(2) || '—'}
                            <button
                              onClick={() => {
                                setEditingPrice(`${price.cpt_code}-clinic`);
                                setNewPrice(price.clinic_custom_price || 0);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ${(price.clinic_custom_price || price.lab_default_price || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          price.source === 'clinic_custom' ? 'bg-green-100 text-green-800' :
                          price.source === 'lab_default' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {price.source === 'clinic_custom' ? 'Clinic' :
                           price.source === 'lab_default' ? 'Lab Default' :
                           'Missing'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {price.source === 'none' && (
                          <AlertCircle className="h-5 w-5 text-red-500" title="No price set - will require manual review" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Import Prices</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Import Type
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as 'lab' | 'clinic')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="lab">Lab Default Prices</option>
                  <option value="clinic" disabled={!selectedClinic}>
                    Clinic Custom Prices {!selectedClinic && '(Select clinic first)'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: cpt_code,price (one per line)
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowUpload(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
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

export default PricingManagement;