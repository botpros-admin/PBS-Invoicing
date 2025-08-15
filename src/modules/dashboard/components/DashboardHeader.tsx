import React from 'react';
import { Calendar, RefreshCw, Plus } from 'lucide-react';
import { DateRange } from '../../../types';

interface DashboardHeaderProps {
  defaultDateRange: DateRange;
  handleGlobalDateRangeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleRefreshAllData: () => void;
  handleAddWidgetClick: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  defaultDateRange,
  handleGlobalDateRangeChange,
  handleRefreshAllData,
  handleAddWidgetClick,
}) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
      <div className="flex items-center space-x-4">
        {/* Global Date Range Selector */}
        <div className="flex items-center space-x-2 bg-white p-2 rounded-md shadow-sm border border-gray-200">
          <Calendar size={16} className="text-gray-500" />
          <select
            value={defaultDateRange}
            onChange={handleGlobalDateRangeChange}
            className="text-sm border-none focus:outline-none focus:ring-0 bg-transparent"
            aria-label="Select dashboard date range"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="ytd">Year to Date</option>
          </select>
        </div>
        {/* Refresh Button */}
        <button
          onClick={handleRefreshAllData}
          className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
          title="Refresh Data"
        >
          <RefreshCw size={20} />
        </button>
        {/* Add Widget Button */}
        <button
          onClick={handleAddWidgetClick}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90" // Changed color
        >
          <Plus size={16} className="mr-2" />
          Add Widget
        </button>
      </div>
    </div>
  );
};
