import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  Package,
  AlertTriangle,
  Download,
  Eye,
  Plus,
  Link,
  Unlink,
  BarChart3,
  Users,
  Calendar,
  Loader2
} from 'lucide-react';
import { ParentAccountService, ParentAccountStats, ChildLocation } from '../../services/clients/ParentAccountService';
import { useTenant } from '../../context/TenantContext';
import { formatCurrency } from '../../utils/formatters';

interface ExpandedState {
  [parentId: string]: boolean;
}

interface ChildrenData {
  [parentId: string]: ChildLocation[];
}

export const ParentAccountAggregation: React.FC = () => {
  const { currentOrganization } = useTenant();
  const [parentAccounts, setParentAccounts] = useState<ParentAccountStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<ExpandedState>({});
  const [childrenData, setChildrenData] = useState<ChildrenData>({});
  const [loadingChildren, setLoadingChildren] = useState<string | null>(null);
  const [selectedParent, setSelectedParent] = useState<ParentAccountStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const pageSize = 25;

  const service = useMemo(
    () => currentOrganization ? new ParentAccountService(currentOrganization.id) : null,
    [currentOrganization]
  );

  useEffect(() => {
    if (service) {
      loadParentAccounts();
    }
  }, [service, currentPage]);

  const loadParentAccounts = async () => {
    if (!service) return;

    setLoading(true);
    try {
      const result = await service.getParentAccountsWithStats(currentPage, pageSize);
      setParentAccounts(result.data);
      setTotalPages(Math.ceil(result.total / pageSize));
    } catch (error) {
      console.error('Failed to load parent accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = async (parentId: string) => {
    const isExpanded = expandedRows[parentId];
    
    if (!isExpanded && !childrenData[parentId] && service) {
      setLoadingChildren(parentId);
      try {
        const children = await service.getChildLocations(parentId);
        setChildrenData(prev => ({ ...prev, [parentId]: children }));
      } catch (error) {
        console.error('Failed to load child locations:', error);
      } finally {
        setLoadingChildren(null);
      }
    }

    setExpandedRows(prev => ({ ...prev, [parentId]: !isExpanded }));
  };

  const handleBulkInvoicing = async (parentId: string) => {
    if (!service) return;

    const confirmed = window.confirm('Create draft invoices for all child locations?');
    if (!confirmed) return;

    try {
      const billingPeriod = {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      };
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const result = await service.createBulkInvoicesForParent(parentId, billingPeriod, dueDate);
      
      alert(`Created ${result.created} invoices. ${result.failed} failed.${
        result.errors.length > 0 ? '\n\nErrors:\n' + result.errors.join('\n') : ''
      }`);
      
      loadParentAccounts();
    } catch (error) {
      console.error('Failed to create bulk invoices:', error);
      alert('Failed to create bulk invoices');
    }
  };

  const generateStatement = async (parentId: string) => {
    if (!service) return;

    try {
      const period = {
        start: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1),
        end: new Date()
      };

      const statement = await service.generateConsolidatedStatement(parentId, period);
      
      // In a real app, this would generate a PDF or open a preview
      console.log('Generated statement:', statement);
      alert(`Statement generated for ${statement.parent.name}\n\n` +
        `Total: ${formatCurrency(statement.summary.total_amount)}\n` +
        `Paid: ${formatCurrency(statement.summary.paid_amount)}\n` +
        `Outstanding: ${formatCurrency(statement.summary.outstanding_amount)}\n` +
        `Child Locations: ${statement.children.length}`);
    } catch (error) {
      console.error('Failed to generate statement:', error);
      alert('Failed to generate consolidated statement');
    }
  };

  const getPaymentTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4 bg-gray-300 rounded-full" />;
  };

  const getStatusColor = (outstanding: number) => {
    if (outstanding === 0) return 'text-green-600 bg-green-100';
    if (outstanding > 50000) return 'text-red-600 bg-red-100';
    if (outstanding > 10000) return 'text-yellow-600 bg-yellow-100';
    return 'text-blue-600 bg-blue-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Parent Account Aggregation</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage large healthcare systems with 150-300+ locations
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {viewMode === 'grid' ? (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Table View
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Grid View
                </>
              )}
            </button>
            <button
              onClick={loadParentAccounts}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Parent Accounts</p>
                <p className="text-2xl font-bold text-gray-900">{parentAccounts.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Total Child Locations</p>
                <p className="text-2xl font-bold text-blue-900">
                  {parentAccounts.reduce((sum, p) => sum + p.child_count, 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Total Outstanding</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {formatCurrency(parentAccounts.reduce((sum, p) => sum + p.total_outstanding, 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Avg Payment Days</p>
                <p className="text-2xl font-bold text-green-900">
                  {Math.round(
                    parentAccounts.reduce((sum, p) => sum + (p.avg_payment_days || 0), 0) / 
                    (parentAccounts.length || 1)
                  )}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Parent Accounts Table */}
      {viewMode === 'table' ? (
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
                    <th className="w-8"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Parent Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Child Locations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Outstanding
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Invoices
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Avg Payment Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Last Activity
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parentAccounts.map((parent) => {
                    const isExpanded = expandedRows[parent.id];
                    const children = childrenData[parent.id] || [];
                    
                    return (
                      <React.Fragment key={parent.id}>
                        <tr className={parent.child_count > 10 ? 'bg-blue-50' : ''}>
                          <td className="px-2">
                            {parent.child_count > 0 && (
                              <button
                                onClick={() => toggleExpanded(parent.id)}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                {loadingChildren === parent.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{parent.name}</div>
                              <div className="text-xs text-gray-500">Code: {parent.code}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">
                                {parent.child_count}
                              </span>
                              {parent.child_count > 50 && (
                                <span className="ml-2 inline-flex px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                                  Large System
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(parent.total_outstanding)}`}>
                              {formatCurrency(parent.total_outstanding)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {parent.total_invoices}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-900">
                                {parent.avg_payment_days ? `${Math.round(parent.avg_payment_days)} days` : 'N/A'}
                              </span>
                              {parent.avg_payment_days && getPaymentTrendIcon(30 - parent.avg_payment_days)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {parent.last_activity ? 
                              new Date(parent.last_activity).toLocaleDateString() : 
                              'No activity'
                            }
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => generateStatement(parent.id)}
                                className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Generate Statement"
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleBulkInvoicing(parent.id)}
                                className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                                title="Bulk Invoice"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setSelectedParent(parent)}
                                className="p-1 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Child Locations */}
                        {isExpanded && children.length > 0 && (
                          <tr>
                            <td colSpan={8} className="px-6 py-4 bg-gray-50">
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-gray-700 mb-2">
                                  Child Locations ({children.length})
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {children.map((child) => (
                                    <div
                                      key={child.id}
                                      className="bg-white rounded-lg border border-gray-200 p-3"
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-gray-900">
                                            {child.name}
                                          </div>
                                          <div className="text-xs text-gray-500 mt-1">
                                            Code: {child.code}
                                          </div>
                                          <div className="mt-2 space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                              <span className="text-gray-500">Outstanding:</span>
                                              <span className="font-medium text-gray-900">
                                                {formatCurrency(child.total_outstanding)}
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                              <span className="text-gray-500">Invoices:</span>
                                              <span className="font-medium text-gray-900">
                                                {child.invoice_count}
                                              </span>
                                            </div>
                                            {child.last_invoice_date && (
                                              <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500">Last Invoice:</span>
                                                <span className="font-medium text-gray-900">
                                                  {new Date(child.last_invoice_date).toLocaleDateString()}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                          child.status === 'active' ? 'text-green-700 bg-green-100' : 'text-gray-700 bg-gray-100'
                                        }`}>
                                          {child.status}
                                        </span>
                                      </div>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parentAccounts.map((parent) => (
            <div key={parent.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{parent.name}</h3>
                  <p className="text-sm text-gray-500">Code: {parent.code}</p>
                </div>
                {parent.child_count > 50 && (
                  <span className="inline-flex px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                    Large System
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Child Locations</p>
                  <p className="text-lg font-medium text-gray-900">{parent.child_count}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Invoices</p>
                  <p className="text-lg font-medium text-gray-900">{parent.total_invoices}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Outstanding</p>
                  <p className="text-lg font-medium text-orange-600">
                    {formatCurrency(parent.total_outstanding)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg Payment</p>
                  <p className="text-lg font-medium text-gray-900">
                    {parent.avg_payment_days ? `${Math.round(parent.avg_payment_days)}d` : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <button
                  onClick={() => toggleExpanded(parent.id)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View Locations
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateStatement(parent.id)}
                    className="p-1 text-gray-600 hover:text-blue-600"
                    title="Statement"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleBulkInvoicing(parent.id)}
                    className="p-1 text-gray-600 hover:text-green-600"
                    title="Bulk Invoice"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParentAccountAggregation;