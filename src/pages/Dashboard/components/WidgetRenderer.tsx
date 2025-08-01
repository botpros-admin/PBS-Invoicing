import React from 'react';
import { Widget } from '../types';
import { AgingBucket, StatusDistribution, TopClient } from '../../../api/services/dashboard.service'; // Removed DashboardStat
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, AlertCircle } from 'lucide-react';
import StatCard from '../../../components/StatCard'; // Fixed import path

interface WidgetRendererProps {
  widget: Widget;
  // Stat card specific props (passed from Dashboard index)
  value?: string | number;
  change?: number;
  link?: string;
  // Data props - pass only the relevant data for this widget type
  agingData?: AgingBucket[];
  statusData?: StatusDistribution[];
  topClientsData?: TopClient[];
  // Loading and error states for the specific data source
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

// Helper: Loading state
const renderLoading = () => (
    <div className="flex items-center justify-center h-full py-10 text-gray-500">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      <span>Loading data...</span>
    </div>
);

// Helper: Error state
const renderError = (error: Error | null, context: string) => (
    <div className="flex items-center justify-center h-full py-10 text-red-600 bg-red-50 p-4 rounded-md">
      <AlertCircle className="h-6 w-6 mr-2" />
      <span>Error loading {context}: {error?.message || 'Unknown error'}</span>
    </div>
);

// Helper: Empty state
const renderEmpty = (message: string) => (
     <div className="flex items-center justify-center h-full py-10 text-gray-500">
        <span>{message}</span>
     </div>
);


export const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widget,
  agingData,
  statusData,
  topClientsData,
  isLoading,
  isError,
  error,
  // Destructure stat props
  value,
  change,
  link,
}) => {
  const renderContent = () => {
    if (isLoading) return renderLoading();

    // --- Stat Widgets ---
    if (widget.type === 'stat') {
        // StatCard handles its own internal display based on props
        // We don't need loading/error wrappers here as the parent handles it
        // Ensure value is passed correctly
        const displayValue = value !== undefined ? value : 'N/A';
        return (
            <StatCard
                title="" // Title is handled by WidgetWrapper but pass id for type checking
                id={widget.id} // Pass widget ID
                value={displayValue}
                change={change}
                link={link}
                className="shadow-none p-0" // Remove StatCard's default padding/shadow
            />
        );
    }

    // --- Chart Widgets ---
    if (widget.type === 'chart') {
      if (widget.id === 'aging-overview') {
        if (isError) return renderError(error, 'Aging Overview');
        if (!agingData || agingData.length === 0) return renderEmpty('No aging data available.');
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={agingData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} fontSize={12} />
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Amount']} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        );
      }
      if (widget.id === 'status-distribution') {
         if (isError) return renderError(error, 'Status Distribution');
         if (!statusData || statusData.length === 0) return renderEmpty('No status data available.');
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={statusData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis unit="%" domain={[0, 100]} fontSize={12} />
              <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Percentage']} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        );
      }
      // Add other chart types here based on widget.config.dataSource or widget.id
    }

    // --- Table Widgets ---
    if (widget.type === 'table') {
      if (widget.id === 'top-clients') {
        if (isError) return renderError(error, 'Top Clients');
        if (!topClientsData || topClientsData.length === 0) return renderEmpty('No client data available.');
        return (
           <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Invoices</th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Dispute Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topClientsData.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{client.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{client.invoiceCount}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">${client.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{client.disputeRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      // Add other table types here
    }

    // Fallback for unknown widget types or configurations
    return <div className="text-center text-gray-500 py-10">Widget type not supported or data unavailable.</div>;
  };

  // Define height based on widget size, adjust as needed
  // Stat cards don't need a fixed height container from the renderer
  const heightClass = widget.type === 'stat' ? '' : (widget.size === 'large' ? 'h-96' : 'h-80');

  return (
    // Remove height class for stat cards as StatCard defines its own size
    <div className={`widget-content ${widget.type !== 'stat' ? heightClass : ''}`}>
      {renderContent()}
    </div>
  );
};
