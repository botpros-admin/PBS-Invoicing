/**
 * Monthly Summary Report
 * 
 * CRITICAL REPORT #3 for Ashley
 * Shows monthly totals: billed, collected, outstanding
 * Provides the high-level numbers Ashley needs to report upward
 * Simple, clear, exportable
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Building,
  FileText,
  CreditCard
} from 'lucide-react';
import { supabase } from '../../api/supabase';
import { useTenant } from '../../context/TenantContext';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface MonthlySummary {
  month: string;
  invoices_created: number;
  total_billed: number;
  payments_received: number;
  total_collected: number;
  outstanding_balance: number;
  collection_rate: number;
  average_invoice: number;
  average_payment: number;
}

interface ClientSummary {
  client_name: string;
  invoices: number;
  billed: number;
  collected: number;
  outstanding: number;
  collection_rate: number;
}

export const MonthlySummaryReport: React.FC = () => {
  const { currentOrganization } = useTenant();
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [clientSummaries, setClientSummaries] = useState<ClientSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [monthRange, setMonthRange] = useState(6); // Last 6 months by default
  
  useEffect(() => {
    if (currentOrganization) {
      loadSummaryData();
    }
  }, [currentOrganization, selectedMonth, monthRange]);
  
  const loadSummaryData = async () => {
    if (!currentOrganization) return;
    
    setIsLoading(true);
    try {
      const summaryData: MonthlySummary[] = [];
      const clientData: Map<string, ClientSummary> = new Map();
      
      // Generate months to analyze
      const months: Date[] = [];
      for (let i = 0; i < monthRange; i++) {
        months.push(subMonths(new Date(selectedMonth + '-01'), i));
      }
      
      // Process each month
      for (const monthDate of months) {
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthKey = format(monthDate, 'yyyy-MM');
        
        // Get invoices created this month
        const { data: invoices, error: invError } = await supabase
          .from('invoices')
          .select('*, client:clients!fk_invoices_client(name)')
          .eq('organization_id', currentOrganization.id)
          .gte('invoice_date', monthStart.toISOString())
          .lte('invoice_date', monthEnd.toISOString());
        
        if (invError) throw invError;
        
        // Get payments received this month
        const { data: payments, error: payError } = await supabase
          .from('payments')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .gte('payment_date', monthStart.toISOString())
          .lte('payment_date', monthEnd.toISOString());
        
        if (payError) throw payError;
        
        // Calculate totals
        const totalBilled = (invoices || []).reduce((sum, inv) => sum + inv.total_amount, 0);
        const totalCollected = (payments || []).reduce((sum, pay) => sum + pay.amount, 0);
        
        // Get current outstanding (all unpaid invoices as of month end)
        const { data: outstanding, error: outError } = await supabase
          .from('invoices')
          .select('balance_due')
          .eq('organization_id', currentOrganization.id)
          .gt('balance_due', 0)
          .lte('invoice_date', monthEnd.toISOString());
        
        if (outError) throw outError;
        
        const totalOutstanding = (outstanding || []).reduce((sum, inv) => sum + inv.balance_due, 0);
        
        // Build monthly summary
        summaryData.push({
          month: format(monthDate, 'MMM yyyy'),
          invoices_created: invoices?.length || 0,
          total_billed: totalBilled,
          payments_received: payments?.length || 0,
          total_collected: totalCollected,
          outstanding_balance: totalOutstanding,
          collection_rate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
          average_invoice: invoices?.length ? totalBilled / invoices.length : 0,
          average_payment: payments?.length ? totalCollected / payments.length : 0
        });
        
        // Build client summaries for selected month only
        if (monthKey === selectedMonth) {
          (invoices || []).forEach(invoice => {
            const clientName = invoice.client?.name || 'Unknown';
            const existing = clientData.get(clientName) || {
              client_name: clientName,
              invoices: 0,
              billed: 0,
              collected: 0,
              outstanding: 0,
              collection_rate: 0
            };
            
            existing.invoices++;
            existing.billed += invoice.total_amount;
            existing.collected += invoice.total_amount - invoice.balance_due;
            existing.outstanding += invoice.balance_due;
            
            clientData.set(clientName, existing);
          });
        }
      }
      
      // Calculate collection rates for clients
      clientData.forEach(client => {
        client.collection_rate = client.billed > 0 ? (client.collected / client.billed) * 100 : 0;
      });
      
      // Sort summaries by month (newest first)
      summaryData.reverse();
      
      // Sort clients by outstanding amount (highest first)
      const sortedClients = Array.from(clientData.values())
        .sort((a, b) => b.outstanding - a.outstanding);
      
      setSummaries(summaryData);
      setClientSummaries(sortedClients);
    } catch (error) {
      console.error('Error loading summary data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const exportToCSV = () => {
    const headers1 = ['Month', 'Invoices Created', 'Total Billed', 'Payments Received', 'Total Collected', 'Outstanding', 'Collection Rate', 'Avg Invoice', 'Avg Payment'];
    const rows1 = summaries.map(s => [
      s.month,
      s.invoices_created.toString(),
      s.total_billed.toFixed(2),
      s.payments_received.toString(),
      s.total_collected.toFixed(2),
      s.outstanding_balance.toFixed(2),
      `${s.collection_rate.toFixed(1)}%`,
      s.average_invoice.toFixed(2),
      s.average_payment.toFixed(2)
    ]);
    
    const headers2 = ['Client', 'Invoices', 'Billed', 'Collected', 'Outstanding', 'Collection Rate'];
    const rows2 = clientSummaries.map(c => [
      c.client_name,
      c.invoices.toString(),
      c.billed.toFixed(2),
      c.collected.toFixed(2),
      c.outstanding.toFixed(2),
      `${c.collection_rate.toFixed(1)}%`
    ]);
    
    const csvContent = [
      'MONTHLY SUMMARY REPORT',
      `Generated: ${format(new Date(), 'MM/dd/yyyy HH:mm')}`,
      '',
      'MONTHLY TRENDS',
      headers1.join(','),
      ...rows1.map(row => row.map(cell => `"${cell}"`).join(',')),
      '',
      `CLIENT BREAKDOWN - ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}`,
      headers2.join(','),
      ...rows2.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-summary-${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  // Calculate current month stats
  const currentMonth = summaries.find(s => s.month === format(new Date(selectedMonth + '-01'), 'MMM yyyy'));
  const previousMonth = summaries[summaries.indexOf(currentMonth!) + 1];
  
  const billedChange = currentMonth && previousMonth 
    ? ((currentMonth.total_billed - previousMonth.total_billed) / previousMonth.total_billed) * 100 
    : 0;
  
  const collectedChange = currentMonth && previousMonth
    ? ((currentMonth.total_collected - previousMonth.total_collected) / previousMonth.total_collected) * 100
    : 0;
  
  if (isLoading) {
    return <div className="text-center py-8">Loading summary data...</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Monthly Summary Report</h2>
          <p className="mt-1 text-sm text-gray-600">
            High-level billing and collection metrics
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Focus Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trend Period
            </label>
            <select
              value={monthRange}
              onChange={(e) => setMonthRange(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="3">Last 3 Months</option>
              <option value="6">Last 6 Months</option>
              <option value="12">Last 12 Months</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Current Month Highlights */}
      {currentMonth && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Billed</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${currentMonth.total_billed.toFixed(0)}
                </p>
                {billedChange !== 0 && (
                  <div className={`flex items-center text-sm ${billedChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {billedChange > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                    {Math.abs(billedChange).toFixed(1)}% vs last month
                  </div>
                )}
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Collected</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${currentMonth.total_collected.toFixed(0)}
                </p>
                {collectedChange !== 0 && (
                  <div className={`flex items-center text-sm ${collectedChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {collectedChange > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                    {Math.abs(collectedChange).toFixed(1)}% vs last month
                  </div>
                )}
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-yellow-600">
                  ${currentMonth.outstanding_balance.toFixed(0)}
                </p>
                <p className="text-xs text-gray-500">
                  Needs collection
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Collection Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentMonth.collection_rate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  Of billed amount
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}
      
      {/* Monthly Trend Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Monthly Trends</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoices
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Billed
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payments
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collected
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outstanding
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collection %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {summaries.map((summary, idx) => (
                <tr key={idx} className={summary.month === currentMonth?.month ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {summary.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {summary.invoices_created}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    ${summary.total_billed.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {summary.payments_received}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                    ${summary.total_collected.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-yellow-600">
                    ${summary.outstanding_balance.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      summary.collection_rate >= 90 ? 'bg-green-100 text-green-800' :
                      summary.collection_rate >= 75 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {summary.collection_rate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Client Breakdown for Selected Month */}
      {clientSummaries.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Client Breakdown - {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoices
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Billed
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Collected
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outstanding
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Collection %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clientSummaries.slice(0, 10).map((client, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{client.client_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {client.invoices}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      ${client.billed.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                      ${client.collected.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-yellow-600 font-medium">
                      ${client.outstanding.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        client.collection_rate >= 90 ? 'bg-green-100 text-green-800' :
                        client.collection_rate >= 75 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {client.collection_rate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};