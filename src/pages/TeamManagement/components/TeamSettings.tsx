import React from 'react';
import {
  Settings,
  FileText,
  Clock,
  Bell,
  Shield,
  Workflow,
  Save
} from 'lucide-react';

const TeamSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Team Defaults */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Settings className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Team Defaults</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Work Hours</label>
            <div className="grid grid-cols-2 gap-3">
              <input type="time" defaultValue="09:00" className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <input type="time" defaultValue="17:00" className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Time Zone</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Eastern Time (ET)</option>
              <option>Central Time (CT)</option>
              <option>Mountain Time (MT)</option>
              <option>Pacific Time (PT)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Processing Goal</label>
            <div className="flex items-center space-x-3">
              <input type="number" defaultValue="20" className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <span className="text-sm text-gray-600">invoices per day</span>
            </div>
          </div>
        </div>
      </div>

      {/* Team Workflows */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Workflow className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Team Workflows</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <FileText className="w-4 h-4 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Invoice Approval Workflow</p>
                <p className="text-xs text-gray-500">Requires manager approval for invoices over $10,000</p>
              </div>
            </div>
            <input type="checkbox" defaultChecked className="rounded" />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Auto-Assignment</p>
                <p className="text-xs text-gray-500">Automatically distribute new tasks to available team members</p>
              </div>
            </div>
            <input type="checkbox" defaultChecked className="rounded" />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Bell className="w-4 h-4 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Team Notifications</p>
                <p className="text-xs text-gray-500">Notify team of important updates and deadlines</p>
              </div>
            </div>
            <input type="checkbox" className="rounded" />
          </div>
        </div>
      </div>

      {/* Team Templates */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Shared Templates</h3>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-800">Add Template</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
            <p className="text-sm font-medium text-gray-900">Standard Invoice Template</p>
            <p className="text-xs text-gray-500 mt-1">Used by 8 team members</p>
          </div>
          <div className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
            <p className="text-sm font-medium text-gray-900">Lab Billing Template</p>
            <p className="text-xs text-gray-500 mt-1">Used by 5 team members</p>
          </div>
          <div className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
            <p className="text-sm font-medium text-gray-900">Insurance Claim Template</p>
            <p className="text-xs text-gray-500 mt-1">Used by 6 team members</p>
          </div>
          <div className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
            <p className="text-sm font-medium text-gray-900">Payment Receipt Template</p>
            <p className="text-xs text-gray-500 mt-1">Used by 4 team members</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Save className="w-4 h-4 mr-2" />
          Save Team Settings
        </button>
      </div>
    </div>
  );
};

export default TeamSettings;