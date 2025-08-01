import React from 'react';
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
    // Call the updateField prop passed from the hook
    // Need to cast 'name' because it could be a key of Widget or Partial<Widget>
    updateField(name as keyof Widget, value);
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
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
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
          className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          {/* Only allow chart/table for now, stat is derived */}
          <option value="chart">Chart</option>
          <option value="table">Table</option>
          {/* <option value="stat">Stat Card</option> */}
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
          className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            {/* Add other chart types */}
          </select>
        </div>
      )}
       {/* Add more config fields as needed based on widget type/dataSource */}
       {/* Example: Data Source Selector */}
       {/* <div>
            <label htmlFor="data-source" className="block text-sm font-medium text-gray-700">Data Source</label>
            <select id="data-source" name="dataSource" value={widgetData.config?.dataSource || ''} onChange={handleConfigChange} ... >
                <option value="aging">Aging Overview</option>
                <option value="status">Status Distribution</option>
                <option value="clients">Top Clients</option>
                <option value="custom">Custom (Not Implemented)</option>
            </select>
       </div> */}


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
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {isEdit ? 'Save Changes' : 'Add Widget'}
        </button>
      </div>
    </form>
  );
};
