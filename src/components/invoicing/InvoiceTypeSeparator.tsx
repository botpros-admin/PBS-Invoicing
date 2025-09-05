import React, { useState, useEffect } from 'react';
import {
  Split,
  AlertTriangle,
  CheckCircle,
  FileText,
  DollarSign,
  TrendingUp,
  Info,
  Loader2,
  Filter,
  Package
} from 'lucide-react';
import { InvoiceTypeSeparationService, InvoiceType, SeparatedInvoices } from '../../services/invoicing/InvoiceTypeSeparationService';
import { useTenant } from '../../context/TenantContext';
import { supabase } from '../../api/supabase';

interface InvoiceAnalysis {
  id: string;
  invoice_number: string;
  client_name: string;
  total_amount: number;
  item_count: number;
  recommendation: 'keep' | 'split';
  reason: string;
  typeBreakdown: { [key: string]: number };
  potentialDelayRisk: 'low' | 'medium' | 'high';
}

export const InvoiceTypeSeparator: React.FC = () => {
  const { currentOrganization } = useTenant();
  const [invoices, setInvoices] = useState<InvoiceAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'mixed' | 'single'>('all');
  const [stats, setStats] = useState({
    total: 0,
    mixed: 0,
    single: 0,
    highRisk: 0
  });
  const [separationResults, setSeparationResults] = useState<{
    [invoiceId: string]: SeparatedInvoices;
  }>({});

  useEffect(() => {
    if (currentOrganization) {
      loadInvoices();
    }
  }, [currentOrganization]);

  const loadInvoices = async () => {
    if (!currentOrganization) return;

    setLoading(true);
    try {
      const service = new InvoiceTypeSeparationService(currentOrganization.id);

      // Get recent invoices
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          clients!inner(name),
          invoice_items(count)
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !invoices) {
        console.error('Failed to load invoices:', error);
        return;
      }

      // Analyze each invoice
      const analyzed: InvoiceAnalysis[] = [];
      let mixedCount = 0;
      let singleCount = 0;
      let highRiskCount = 0;

      for (const invoice of invoices) {
        const analysis = await service.analyzeInvoiceMix(invoice.id);
        
        const invoiceAnalysis: InvoiceAnalysis = {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          client_name: invoice.clients.name,
          total_amount: invoice.total_amount,
          item_count: invoice.invoice_items[0]?.count || 0,
          ...analysis
        };

        analyzed.push(invoiceAnalysis);

        const typeCount = Object.keys(analysis.typeBreakdown).length;
        if (typeCount > 1) mixedCount++;
        else singleCount++;
        
        if (analysis.potentialDelayRisk === 'high') highRiskCount++;
      }

      setInvoices(analyzed);
      setStats({
        total: analyzed.length,
        mixed: mixedCount,
        single: singleCount,
        highRisk: highRiskCount
      });

    } finally {
      setLoading(false);
    }
  };

  const handleSplitInvoice = async (invoiceId: string) => {
    if (!currentOrganization) return;

    setProcessing(invoiceId);
    try {
      const service = new InvoiceTypeSeparationService(currentOrganization.id);
      const result = await service.splitExistingInvoice(invoiceId);
      
      setSeparationResults(prev => ({
        ...prev,
        [invoiceId]: result
      }));

      // Reload invoices
      await loadInvoices();

      alert(`Successfully split invoice into ${Object.keys(result).length} separate invoices`);
    } catch (error) {
      console.error('Failed to split invoice:', error);
      alert('Failed to split invoice. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: InvoiceType) => {
    switch (type) {
      case 'SNF': return '🏥';
      case 'Invalids': return '⚠️';
      case 'Hospice': return '🕊️';
      case 'Regular': return '📋';
      default: return '📄';
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (filter === 'all') return true;
    const typeCount = Object.keys(inv.typeBreakdown).length;
    if (filter === 'mixed') return typeCount > 1;
    if (filter === 'single') return typeCount === 1;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Invoice Type Separation</h2>
            <p className="text-sm text-gray-500 mt-1">
              Automatically separate mixed invoices to improve payment velocity
            </p>
          </div>
          <button
            onClick={loadInvoices}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Analyze Invoices
              </>
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Mixed Type</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.mixed}</p>
              </div>
              <Split className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Single Type</p>
                <p className="text-2xl font-bold text-green-900">{stats.single}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">High Risk</p>
                <p className="text-2xl font-bold text-red-900">{stats.highRisk}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Why Separate Invoice Types?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>SNF invoices get paid immediately without waiting for invalid corrections</li>
                <li>Invalid items don't block payment for valid services</li>
                <li>Different invoice types have different payment terms and approval processes</li>
                <li>Cleaner reconciliation and faster cash flow</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilter('mixed')}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                filter === 'mixed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Mixed Type ({stats.mixed})
            </button>
            <button
              onClick={() => setFilter('single')}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                filter === 'single'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Single Type ({stats.single})
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
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
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type Breakdown
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Risk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Recommendation
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => {
                  const separated = separationResults[invoice.id];
                  
                  return (
                    <React.Fragment key={invoice.id}>
                      <tr className={invoice.recommendation === 'split' ? 'bg-yellow-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.invoice_number}
                          </div>
                          <div className="text-xs text-gray-500">
                            {invoice.item_count} items
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.client_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${invoice.total_amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(invoice.typeBreakdown).map(([type, count]) => (
                              <span
                                key={type}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100"
                              >
                                {getTypeIcon(type as InvoiceType)} {type}: {count}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(invoice.potentialDelayRisk)}`}>
                            {invoice.potentialDelayRisk} risk
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <span className={`text-sm font-medium ${
                              invoice.recommendation === 'split' ? 'text-yellow-700' : 'text-green-700'
                            }`}>
                              {invoice.recommendation === 'split' ? 'Split Recommended' : 'Keep As Is'}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {invoice.reason}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {invoice.recommendation === 'split' && !separated && (
                            <button
                              onClick={() => handleSplitInvoice(invoice.id)}
                              disabled={processing === invoice.id}
                              className="inline-flex items-center px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-md hover:bg-yellow-200 disabled:opacity-50"
                            >
                              {processing === invoice.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Splitting...
                                </>
                              ) : (
                                <>
                                  <Split className="h-3 w-3 mr-1" />
                                  Split Invoice
                                </>
                              )}
                            </button>
                          )}
                          {separated && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Split Complete
                            </span>
                          )}
                        </td>
                      </tr>
                      {separated && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-green-50">
                            <div className="text-sm">
                              <p className="font-medium text-green-900 mb-2">
                                Successfully split into {Object.keys(separated).length} invoices:
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(separated).map(([type, data]) => (
                                  <div key={type} className="flex items-center justify-between p-2 bg-white rounded">
                                    <span className="font-medium">
                                      {getTypeIcon(type as InvoiceType)} {type}
                                    </span>
                                    <span className="text-gray-600">
                                      {data.items.length} items • ${data.subtotal.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceTypeSeparator;