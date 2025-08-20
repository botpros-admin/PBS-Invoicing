/**
 * Aging Report
 * 
 * CRITICAL REPORT #2 for Ashley
 * Shows outstanding invoices by age buckets (30/60/90/120+ days)
 * Identifies which invoices need collection follow-up
 * Exportable to Excel for action items
 */

import React, { useState, useEffect } from 'react';
import { 
  Clock,
  Download,
  AlertTriangle,
  TrendingUp,
  Building,
  Calendar,
  DollarSign
} from 'lucide-react';
import { supabase } from '../../api/supabase';
import { useTenant } from '../../context/TenantContext';
import { format, differenceInDays } from 'date-fns';

interface AgingInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  client_name: string;
  client_code: string;
  total_amount: number;
  balance_due: number;
  days_outstanding: number;
  aging_bucket: 'current' | '30' | '60' | '90' | '120+';
  last_payment_date?: string;
  last_payment_amount?: number;
}

interface AgingSummary {
  bucket: string;
  count: number;
  amount: number;
  percentage: number;
}

export const AgingReport: React.FC = () => {
  const { currentOrganization } = useTenant();
  const [invoices, setInvoices] = useState<AgingInvoice[]>([]);
  const [summary, setSummary] = useState<AgingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [clientFilter, setClientFilter] = useState('all');
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  
  useEffect(() => {
    if (currentOrganization) {
      loadAgingData();
      loadClients();
    }
  }, [currentOrganization, asOfDate, clientFilter]);
  
  const loadClients = async () => {
    if (!currentOrganization) return;
    
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('organization_id', currentOrganization.id)
      .order('name');
    
    setClients(data || []);
  };
  
  const loadAgingData = async () => {
    if (!currentOrganization) return;
    
    setIsLoading(true);
    try {
      // Get unpaid invoices with payment history
      let query = supabase
        .from('invoices')
        .select(`
          *,
          client:clients!fk_invoices_client(name, code),
          payments:payment_allocations(
            allocated_amount,
            created_at,
            payment:payments(payment_date)
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .gt('balance_due', 0)
        .lte('invoice_date', asOfDate);
      
      if (clientFilter !== 'all') {
        query = query.eq('client_id', clientFilter);
      }
      
      const { data: unpaidInvoices, error } = await query;
      
      if (error) throw error;
      
      // Calculate aging for each invoice
      const aged = (unpaidInvoices || []).map(invoice => {
        const daysOld = differenceInDays(new Date(asOfDate), new Date(invoice.due_date));
        
        // Determine aging bucket
        let bucket: AgingInvoice['aging_bucket'] = 'current';
        if (daysOld > 120) bucket = '120+';
        else if (daysOld > 90) bucket = '90';
        else if (daysOld > 60) bucket = '60';
        else if (daysOld > 30) bucket = '30';
        else if (daysOld > 0) bucket = '30';
        
        // Get last payment info
        const lastPayment = invoice.payments
          ?.sort((a: any, b: any) => new Date(b.payment.payment_date).getTime() - new Date(a.payment.payment_date).getTime())[0];
        
        return {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date,
          client_name: invoice.client?.name || 'Unknown',
          client_code: invoice.client?.code || '',
          total_amount: invoice.total_amount,
          balance_due: invoice.balance_due,
          days_outstanding: Math.max(0, daysOld),
          aging_bucket: bucket,
          last_payment_date: lastPayment?.payment?.payment_date,
          last_payment_amount: lastPayment?.allocated_amount
        };
      });
      
      // Sort by days outstanding (oldest first)
      aged.sort((a, b) => b.days_outstanding - a.days_outstanding);
      
      // Calculate summary
      const buckets = {
        'current': { count: 0, amount: 0 },
        '30': { count: 0, amount: 0 },
        '60': { count: 0, amount: 0 },
        '90': { count: 0, amount: 0 },
        '120+': { count: 0, amount: 0 }
      };
      
      aged.forEach(invoice => {
        buckets[invoice.aging_bucket].count++;
        buckets[invoice.aging_bucket].amount += invoice.balance_due;
      });
      
      const totalAmount = aged.reduce((sum, inv) => sum + inv.balance_due, 0);
      
      const summaryData: AgingSummary[] = [
        {
          bucket: 'Current',
          count: buckets.current.count,
          amount: buckets.current.amount,
          percentage: totalAmount > 0 ? (buckets.current.amount / totalAmount) * 100 : 0
        },
        {
          bucket: '1-30 Days',
          count: buckets['30'].count,
          amount: buckets['30'].amount,
          percentage: totalAmount > 0 ? (buckets['30'].amount / totalAmount) * 100 : 0
        },
        {
          bucket: '31-60 Days',
          count: buckets['60'].count,
          amount: buckets['60'].amount,
          percentage: totalAmount > 0 ? (buckets['60'].amount / totalAmount) * 100 : 0
        },
        {
          bucket: '61-90 Days',
          count: buckets['90'].count,
          amount: buckets['90'].amount,
          percentage: totalAmount > 0 ? (buckets['90'].amount / totalAmount) * 100 : 0
        },
        {
          bucket: '120+ Days',
          count: buckets['120+'].count,
          amount: buckets['120+'].amount,
          percentage: totalAmount > 0 ? (buckets['120+'].amount / totalAmount) * 100 : 0
        }
      ];
      
      setInvoices(aged);
      setSummary(summaryData);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };
  
  const exportToCSV = () => {
    const headers = [
      'Invoice Number',
      'Invoice Date',
      'Due Date',
      'Days Outstanding',
      'Aging Bucket',
      'Client',
      'Client Code',
      'Invoice Total',
      'Balance Due',
      'Last Payment Date',
      'Last Payment Amount'
    ];
    
    const rows = invoices.map(invoice => [
      invoice.invoice_number,
      format(new Date(invoice.invoice_date), 'MM/dd/yyyy'),
      format(new Date(invoice.due_date), 'MM/dd/yyyy'),
      invoice.days_outstanding.toString(),
      invoice.aging_bucket === '120+' ? '120+ Days' : 
        invoice.aging_bucket === 'current' ? 'Current' : 
        `${invoice.aging_bucket} Days`,
      invoice.client_name,
      invoice.client_code,
      invoice.total_amount.toFixed(2),
      invoice.balance_due.toFixed(2),
      invoice.last_payment_date ? format(new Date(invoice.last_payment_date), 'MM/dd/yyyy') : '',
      invoice.last_payment_amount ? invoice.last_payment_amount.toFixed(2) : ''
    ]);
    
    // Add summary at the end
    rows.push([]);
    rows.push(['SUMMARY']);
    rows.push(['Aging Bucket', 'Count', 'Amount', 'Percentage']);
    summary.forEach(s => {
      rows.push([
        s.bucket,
        s.count.toString(),
        s.amount.toFixed(2),
        `${s.percentage.toFixed(1)}%`
      ]);
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aging-report-${asOfDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  const getBucketColor = (bucket: string) => {
    if (bucket.includes('120')) return 'text-red-600 bg-red-100';
    if (bucket.includes('90')) return 'text-orange-600 bg-orange-100';
    if (bucket.includes('60')) return 'text-yellow-600 bg-yellow-100';
    if (bucket.includes('30')) return 'text-blue-600 bg-blue-100';
    return 'text-green-600 bg-green-100';
  };
  
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balance_due, 0);
  
  if (isLoading) {
    return <div className="text-center py-8">Loading aging data...</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Accounts Receivable Aging Report</h2>
          <p className="mt-1 text-sm text-gray-600">
            Outstanding invoices by age - identify collection priorities
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
              As of Date
            </label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Filter
            </label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {summary.map(s => (
          <div key={s.bucket} className="bg-white rounded-lg shadow-sm p-4">
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getBucketColor(s.bucket)}`}>
              <Clock className="h-3 w-3 mr-1" />
              {s.bucket}
            </div>
            <p className="mt-2 text-2xl font-bold">${s.amount.toFixed(0)}</p>
            <p className="text-xs text-gray-500">
              {s.count} invoice{s.count !== 1 ? 's' : ''} ({s.percentage.toFixed(1)}%)
            </p>
          </div>
        ))}
      </div>
      
      {/* Total Outstanding */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Total Outstanding</p>
              <p className="text-3xl font-bold text-yellow-900">${totalOutstanding.toFixed(2)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-yellow-700">
              {invoices.length} unpaid invoice{invoices.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-yellow-600">
              Average age: {invoices.length > 0 
                ? Math.round(invoices.reduce((sum, inv) => sum + inv.days_outstanding, 0) / invoices.length)
                : 0} days
            </p>
          </div>
        </div>
      </div>
      
      {/* Detail Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aging
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Original
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance Due
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Payment
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map(invoice => (
                <tr key={invoice.id} className={invoice.days_outstanding > 90 ? 'bg-red-50' : invoice.days_outstanding > 60 ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </div>
                      <div className="text-xs text-gray-500">
                        Issued: {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-gray-400">
                        Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{invoice.client_name}</div>
                    {invoice.client_code && (
                      <div className="text-xs text-gray-500">{invoice.client_code}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-lg font-bold ${
                      invoice.days_outstanding > 90 ? 'text-red-600' :
                      invoice.days_outstanding > 60 ? 'text-orange-600' :
                      invoice.days_outstanding > 30 ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {invoice.days_outstanding}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getBucketColor(invoice.aging_bucket)}`}>
                      {invoice.aging_bucket === '120+' ? '120+ Days' : 
                       invoice.aging_bucket === 'current' ? 'Current' : 
                       `${invoice.aging_bucket} Days`}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    ${invoice.total_amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right">
                    ${invoice.balance_due.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    {invoice.last_payment_date ? (
                      <div>
                        <div className="text-xs text-gray-900">
                          ${invoice.last_payment_amount?.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(invoice.last_payment_date), 'MMM d')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No payments</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {invoices.length === 0 && (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">No outstanding invoices found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};