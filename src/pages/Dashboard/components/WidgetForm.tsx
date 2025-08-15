import React, { useEffect } from 'react';
import { Widget, WidgetConfig } from '../types'; // Import WidgetConfig

interface WidgetFormProps {
  widgetData: Partial<Widget> | Widget | null;
  // Replace setWidgetData with specific update functions
  updateField: (field: keyof Widget | keyof Partial<Widget>, value: string | number | boolean) => void;
  updateConfigField: (field: keyof WidgetConfig, value: string | number | boolean) => void;
  handleSubmit: () => void;
  handleCancel: () => void;
  isEdit: boolean;
}

export const WidgetForm: React.FC<WidgetFormProps> = ({
  widgetData,
  // setWidgetData, // Removed from destructuring
  updateField, // Added new props
  updateConfigField, // Added new props
  handleSubmit,
  handleCancel,
  isEdit,
}) => {
  if (!widgetData) return null; // Should not happen if modal logic is correct

  // Removed unused isPartialWidget type guard

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-update title when selecting a volume metric
    if (name === 'id' && widgetData.config?.dataSource === 'volume') {
      const metricTitles: Record<string, string> = {
        'daily-volume': 'Daily Volume',
        'daily-revenue': 'Daily Revenue',
        'processing-rate': 'Processing Rate',
        'active-labs': 'Active Labs',
        'pending-era': 'Pending ERA',
        'success-rate': 'Success Rate',
        'avg-processing-time': 'Avg Processing Time',
        'pgx-samples': 'PGX Samples',
        'pgx-revenue': 'PGX Revenue',
        'pgx-profit': 'PGX Profit'
      };
      
      // Update both ID and title
      updateField('id' as keyof Widget, value);
      if (metricTitles[value]) {
        updateField('title' as keyof Widget, metricTitles[value]);
      }
    } else {
      // Call the updateField prop passed from the hook
      // Need to cast 'name' because it could be a key of Widget or Partial<Widget>
      updateField(name as keyof Widget, value);
    }
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-update title and ID for specific data sources
    if (name === 'dataSource') {
      // Table widgets
      if (widgetData.type === 'table') {
        if (value === 'labs') {
          updateField('id' as keyof Widget, 'lab-performance');
          updateField('title' as keyof Widget, 'Lab Performance');
        } else if (value === 'clients') {
          updateField('id' as keyof Widget, 'top-clients');
          updateField('title' as keyof Widget, 'Top Clients');
        }
      }
      // Chart widgets
      else if (widgetData.type === 'chart') {
        if (value === 'volume') {
          updateField('id' as keyof Widget, 'pgx-performance');
          updateField('title' as keyof Widget, 'PGX Performance');
        } else if (value === 'aging') {
          updateField('id' as keyof Widget, 'aging-overview');
          updateField('title' as keyof Widget, 'Aging Overview');
        } else if (value === 'status') {
          updateField('id' as keyof Widget, 'status-distribution');
          updateField('title' as keyof Widget, 'Status Distribution');
        }
      }
    }
    
    // Call the updateConfigField prop passed from the hook
    // Need to cast 'name' because it's derived from the event target's name attribute
    updateConfigField(name as keyof WidgetConfig, value);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
      <div>
        <label htmlFor="widget-title" className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          id="widget-title"
          name="title"
          value={widgetData.title || ''}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="widget-type" className="block text-sm font-medium text-gray-700">Type</label>
        <select
          id="widget-type"
          name="type"
          value={widgetData.type || 'chart'}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm"
        >
          <option value="stat">Stat Card</option>
          <option value="chart">Chart</option>
          <option value="table">Table</option>
        </select>
      </div>
       <div>
        <label htmlFor="widget-size" className="block text-sm font-medium text-gray-700">Size</label>
        <select
          id="widget-size"
          name="size"
          value={widgetData.size || 'medium'}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>

      {/* Configuration specific fields based on type */}
      {widgetData.type === 'chart' && (
        <div>
          <label htmlFor="chart-type" className="block text-sm font-medium text-gray-700">Chart Type</label>
          <select
            id="chart-type"
            name="chartType" // Corresponds to config property
            value={widgetData.config?.chartType || 'bar'}
            onChange={handleConfigChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm"
          >
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            {/* Add other chart types */}
          </select>
        </div>
      )}
      {/* Data Source Selector */}
      <div>
        <label htmlFor="data-source" className="block text-sm font-medium text-gray-700">Data Source</label>
        <select 
          id="data-source" 
          name="dataSource" 
          value={widgetData.config?.dataSource || 'aging'} 
          onChange={handleConfigChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm"
        >
          <option value="aging">Aging Overview</option>
          <option value="status">Status Distribution</option>
          <option value="clients">Top Clients</option>
          <option value="volume">Volume Metrics</option>
          <option value="labs">Lab Performance</option>
        </select>
      </div>

      {/* Volume Metric Selector - Only show for stat widgets with volume data source */}
      {widgetData.type === 'stat' && widgetData.config?.dataSource === 'volume' && (
        <div>
          <label htmlFor="metric-id" className="block text-sm font-medium text-gray-700">Select Metric</label>
          <select
            id="metric-id"
            name="id"
            value={widgetData.id || 'daily-volume'}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm"
          >
            <optgroup label="Daily Metrics">
              <option value="daily-volume">Daily Volume</option>
              <option value="daily-revenue">Daily Revenue</option>
              <option value="processing-rate">Processing Rate</option>
              <option value="active-labs">Active Labs</option>
              <option value="pending-era">Pending ERA</option>
            </optgroup>
            <optgroup label="Performance Metrics">
              <option value="success-rate">Success Rate</option>
              <option value="avg-processing-time">Avg Processing Time</option>
            </optgroup>
            <optgroup label="PGX Metrics">
              <option value="pgx-samples">PGX Samples</option>
              <option value="pgx-revenue">PGX Revenue</option>
              <option value="pgx-profit">PGX Profit</option>
            </optgroup>
          </select>
        </div>
      )}

      {/* Color Picker for all widgets */}
      <div>
        <label htmlFor="widget-color" className="block text-sm font-medium text-gray-700">
          Widget Color
        </label>
        <div className="mt-1 flex items-center space-x-2">
          <input
            type="color"
            id="widget-color"
            name="color"
            value={widgetData.config?.color || '#0078D7'}
            onChange={handleConfigChange}
            className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
          />
          <input
            type="text"
            value={widgetData.config?.color || '#0078D7'}
            onChange={(e) => {
              const fakeEvent = {
                target: {
                  name: 'color',
                  value: e.target.value
                }
              } as React.ChangeEvent<HTMLInputElement>;
              handleConfigChange(fakeEvent);
            }}
            placeholder="#0078D7"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm"
          />
          <button
            type="button"
            onClick={() => {
              const fakeEvent = {
                target: {
                  name: 'color',
                  value: '#0078D7'
                }
              } as React.ChangeEvent<HTMLInputElement>;
              handleConfigChange(fakeEvent);
            }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">Choose a color theme for your widget</p>
      </div>

      {/* Note: Auto-setting of IDs is handled in handleConfigChange */}


      <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
         <button
          type="button"
          onClick={handleCancel}
          className="mr-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90"
        >
          {isEdit ? 'Save Changes' : 'Add Widget'}
        </button>
      </div>
    </form>
  );
};
