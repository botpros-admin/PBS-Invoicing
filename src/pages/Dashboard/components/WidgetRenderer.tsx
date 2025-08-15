import React from 'react';
import { Widget } from '../types';
import { AgingBucket, StatusDistribution, TopClient } from '../../../api/services/dashboard.service'; // Removed DashboardStat
import { VolumeMetrics, LabMetric } from '../../../api/services/volumeMetrics.service';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
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
  volumeMetrics?: VolumeMetrics;
  labMetrics?: LabMetric[];
  // Loading and error states for the specific data source
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

// Helper: Loading state with skeleton for better CLS
const renderLoading = (widgetType: string) => {
  if (widgetType === 'chart') {
    return (
      <div className="w-full h-full">
        <div className="w-full h-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
          <div className="text-gray-400">Loading chart...</div>
        </div>
      </div>
    );
  }
  if (widgetType === 'table') {
    return (
      <div className="w-full h-full">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex space-x-4 mb-3">
            <div className="w-1/3 h-4 bg-gray-200 animate-pulse rounded" />
            <div className="w-1/4 h-4 bg-gray-200 animate-pulse rounded" />
            <div className="w-1/4 h-4 bg-gray-200 animate-pulse rounded" />
            <div className="w-1/6 h-4 bg-gray-200 animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center h-full py-10 text-gray-500">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      <span>Loading data...</span>
    </div>
  );
};

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


// Helper function to capitalize first letter
const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widget,
  agingData,
  statusData,
  topClientsData,
  volumeMetrics,
  labMetrics,
  isLoading,
  isError,
  error,
  // Destructure stat props
  value,
  change,
  link,
}) => {
  // Default color is the secondary blue (#0078D7)
  const widgetColor = widget.config.color || '#0078D7';
  const renderContent = () => {
    if (isLoading) return renderLoading(widget.type);

    // --- Stat Widgets ---
    if (widget.type === 'stat') {
        // Check if this is a volume metric stat
        if (widget.config.dataSource === 'volume' && volumeMetrics) {
            let displayValue: string | number = 'N/A';
            let displayChange: number | undefined;
            
            // Map widget ID to volume metric fields
            switch (widget.id) {
                case 'daily-volume':
                    displayValue = volumeMetrics.dailyVolume;
                    break;
                case 'daily-revenue':
                    displayValue = volumeMetrics.dailyRevenue;
                    break;
                case 'processing-rate':
                    displayValue = `${volumeMetrics.processingRate.toFixed(1)}/hr`;
                    break;
                case 'active-labs':
                    displayValue = volumeMetrics.activeLabsCount;
                    break;
                case 'pending-era':
                    displayValue = volumeMetrics.pendingERA;
                    break;
                case 'success-rate':
                    displayValue = `${volumeMetrics.successRate.toFixed(1)}%`;
                    break;
                case 'pgx-samples':
                    displayValue = volumeMetrics.pgxSamples;
                    break;
                case 'pgx-revenue':
                    displayValue = volumeMetrics.pgxRevenue;
                    break;
                case 'pgx-profit':
                    displayValue = volumeMetrics.pgxProfit;
                    break;
                case 'avg-processing-time':
                    displayValue = `${volumeMetrics.avgProcessingTime.toFixed(1)} min`;
                    break;
            }
            
            return (
                <StatCard
                    title=""
                    id={widget.id}
                    value={displayValue}
                    change={displayChange}
                    link={link}
                    className="shadow-none p-0"
                />
            );
        }
        
        // Original stat card logic
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
          <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={agingData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} fontSize={12} />
                <Tooltip formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Amount']} />
                <Bar dataKey="value" fill={widgetColor} radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        );
      }
      if (widget.id === 'status-distribution') {
         if (isError) return renderError(error, 'Status Distribution');
         if (!statusData || statusData.length === 0) return renderEmpty('No status data available.');
        return (
          <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={statusData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis unit="%" domain={[0, 100]} fontSize={12} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Percentage']} />
                <Bar dataKey="value" fill={widgetColor} radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
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
      // Lab Performance Table
      if (widget.id === 'lab-performance' && widget.config.dataSource === 'labs') {
        if (isError) return renderError(error, 'Lab Performance');
        if (!labMetrics || labMetrics.length === 0) return renderEmpty('No lab data available.');
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lab Name</th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Samples</th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th scope="col" className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {labMetrics.slice(0, 5).map((lab) => (
                  <tr key={lab.labId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{lab.labName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{lab.samplesProcessed}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      ${lab.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        lab.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : lab.status === 'delayed'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {lab.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      // Add other table types here
    }

    // PGX Performance Chart
    if (widget.type === 'chart' && widget.id === 'pgx-performance' && volumeMetrics) {
      const pgxData = [
        { name: 'Samples', value: volumeMetrics.pgxSamples, target: 300 },
        { name: 'Revenue', value: volumeMetrics.pgxRevenue / 1000, target: 15 }, // in thousands
        { name: 'Profit', value: volumeMetrics.pgxProfit / 1000, target: 13.8 } // in thousands
      ];
      
      return (
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pgxData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(value: number, name: string) => {
                if (name === 'value') return [`${value}`, 'Actual'];
                if (name === 'target') return [`${value}`, 'Target'];
                return [value, name];
              }} />
              <Bar dataKey="value" fill={widgetColor} radius={[4, 4, 0, 0]} />
              <Bar dataKey="target" fill={`${widgetColor}33`} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Fallback for unknown widget types or configurations
    return <div className="text-center text-gray-500 py-10">Widget type not supported or data unavailable.</div>;
  };

  // Define fixed heights based on widget size to prevent layout shifts
  // Stat cards get smaller fixed height, charts get larger
  const heightClass = widget.type === 'stat' 
    ? 'h-[120px]' 
    : widget.size === 'large' 
    ? 'h-[350px]' 
    : widget.size === 'medium'
    ? 'h-[300px]'
    : 'h-[250px]';

  return (
    // Apply consistent height classes to prevent layout shifts
    <div className={`widget-content ${heightClass} flex flex-col`}>
      {renderContent()}
    </div>
  );
};
