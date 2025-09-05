import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  ChevronDown
} from 'lucide-react';
import { getClients, getClientById } from '../../../api/services/client.service';
import { Client } from '../../../types';

const ClientDashboard: React.FC = () => {
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [mainAccount, setMainAccount] = useState<Client | null>(null);
  const [subAccounts, setSubAccounts] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // In a real app, you would get the current user's client ID
        const currentClientId = '1'; // Mocking parent client ID
        const parentAccount = await getClientById(currentClientId);
        setMainAccount(parentAccount);

        if (parentAccount.isParent) {
          const paginatedResponse = await getClients({ parentId: parentAccount.id });
          setSubAccounts(paginatedResponse.data);
        }
      } catch (error) {
        console.error("Failed to fetch client data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const displayedData = useMemo(() => {
    const accountsToAggregate = selectedAccountId === 'all'
      ? [mainAccount, ...subAccounts].filter(Boolean)
      : [mainAccount, ...subAccounts].filter(acc => acc && acc.id === selectedAccountId);

    const aggregated = {
      metrics: {
        totalClaims: accountsToAggregate.reduce((sum, acc) => sum + (acc?.totalClaims || 0), 0),
        claimsApproved: accountsToAggregate.reduce((sum, acc) => sum + (acc?.claimsApproved || 0), 0),
        outstandingBalance: accountsToAggregate.reduce((sum, acc) => sum + (acc?.outstandingBalance || 0), 0),
        avgProcessingTime: accountsToAggregate.length > 0
          ? accountsToAggregate.reduce((sum, acc) => sum + (acc?.avgProcessingTime || 0), 0) / accountsToAggregate.length
          : 0,
      },
      recentClaims: accountsToAggregate.flatMap(acc => acc?.recentClaims || [])
    };
    return aggregated;
  }, [selectedAccountId, mainAccount, subAccounts]);

  const metrics = [
    {
      label: 'Total Claims This Month',
      value: displayedData.metrics.totalClaims.toLocaleString(),
      icon: FileText,
      color: 'blue'
    },
    {
      label: 'Claims Approved',
      value: displayedData.metrics.claimsApproved.toLocaleString(),
      percentage: `${displayedData.metrics.totalClaims > 0 ? ((displayedData.metrics.claimsApproved / displayedData.metrics.totalClaims) * 100).toFixed(1) : 0}%`,
      icon: CheckCircle,
      color: 'green'
    },
    {
      label: 'Outstanding Balance',
      value: `$${displayedData.metrics.outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'red'
    },
    {
      label: 'Avg. Processing Time',
      value: `${displayedData.metrics.avgProcessingTime.toFixed(1)} days`,
      icon: Clock,
      color: 'purple'
    }
  ];

  const getStatusBadge = (status: string) => {
    const styles = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      denied: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const AccountSelector = () => (
    <div className="relative">
      <select
        value={selectedAccountId}
        onChange={(e) => setSelectedAccountId(e.target.value)}
        className="appearance-none w-full md:w-auto bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Sub-Accounts (Aggregated)</option>
        {mainAccount && <option value={mainAccount.id}>{mainAccount.name} (Parent)</option>}
        {subAccounts.map(child => (
          <option key={child.id} value={child.id}>{child.name}</option>
        ))}
      </select>
      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
    </div>
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time overview of your claims and billing</p>
        </div>
        {mainAccount?.isParent && <div className="mt-4 md:mt-0"><AccountSelector /></div>}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <metric.icon className={`w-8 h-8 text-${metric.color}-500`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
            <p className="text-sm text-gray-600 mt-1">{metric.label}</p>
            {metric.percentage && (
              <p className="text-xs text-gray-500 mt-1">{metric.percentage} of total</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Claims */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Claims</h2>
              <a href="/client-portal/claims" className="text-sm text-blue-600 hover:text-blue-700">
                View all →
              </a>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {displayedData.recentClaims.map((claim) => (
              <div key={claim.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{claim.id}</p>
                    <p className="text-sm text-gray-600">{claim.patient}</p>
                    <p className="text-xs text-gray-500 mt-1">{claim.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 mb-1">${claim.amount.toLocaleString()}</p>
                    {getStatusBadge(claim.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Summary */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Billing Summary</h2>
              <a href="/client-portal/billing" className="text-sm text-blue-600 hover:text-blue-700">
                Manage billing →
              </a>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Balance</span>
                <span className="text-lg font-semibold text-gray-900">${displayedData.metrics.outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-4 border-t">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Make Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
