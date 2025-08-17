import React, { useState } from 'react';
import CPTCodeMapping from '../../../components/CPTCodeMapping';
import PricingSettings from '../../../components/settings/PricingSettings';
import { 
  ClipboardList, 
  DollarSign, 
  Search,
  Upload,
  Download,
  Plus,
  Settings
} from 'lucide-react';

const CPTManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'codes' | 'pricing'>('codes');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">CPT & Pricing Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage CPT codes, service catalog, and pricing rules in one place
            </p>
          </div>
          <div className="flex space-x-2">
            <button className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Upload className="w-4 h-4 mr-2 text-gray-600" />
              Import
            </button>
            <button className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4 mr-2 text-gray-600" />
              Export
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4 mr-2" />
              Add CPT Code
            </button>
          </div>
        </div>

        {/* Integrated Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Quick CPT lookup: Search by code, description, or category..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <kbd className="px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded">Ctrl+/</kbd>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Total CPT Codes</p>
            <p className="text-lg font-semibold text-gray-900">1,247</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Active Services</p>
            <p className="text-lg font-semibold text-gray-900">892</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Custom Codes</p>
            <p className="text-lg font-semibold text-gray-900">45</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Last Updated</p>
            <p className="text-lg font-semibold text-gray-900">Today</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('codes')}
              className={`flex-1 py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'codes'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center">
                <ClipboardList className="w-4 h-4 mr-2" />
                CPT Codes & VLOOKUP
              </div>
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`flex-1 py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pricing'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center">
                <DollarSign className="w-4 h-4 mr-2" />
                Pricing Rules & Tiers
              </div>
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {activeTab === 'codes' ? (
            <div>
              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <Settings className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900">Integrated CPT Management</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      CPT codes are now integrated directly into the billing workflow. 
                      Access them instantly while creating invoices without switching contexts.
                    </p>
                  </div>
                </div>
              </div>
              <CPTCodeMapping mode="management" />
            </div>
          ) : (
            <div>
              {/* Pricing Info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <DollarSign className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-semibold text-green-900">Smart Pricing Rules</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Configure pricing tiers, insurance rates, and custom pricing rules. 
                      These are automatically applied during invoice creation.
                    </p>
                  </div>
                </div>
              </div>
              <PricingSettings />
            </div>
          )}
        </div>
      </div>

      {/* Helper Text */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-sm text-gray-600">
          <strong>Pro Tip:</strong> Use the quick search (Ctrl+/) to find CPT codes instantly from anywhere in the Billing Hub. 
          Your frequently used codes will appear at the top of search results.
        </p>
      </div>
    </div>
  );
};

export default CPTManagement;