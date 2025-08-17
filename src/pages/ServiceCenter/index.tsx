import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { 
  Users,
  UserPlus,
  Shield,
  FileText,
  Upload,
  Search,
  Filter,
  Download,
  Building2,
  TestTube,
  Activity
} from 'lucide-react';

// Service Center Components (universal for labs, clinics, facilities)
import ServiceDirectory from './components/ServiceDirectory';
import ServiceManagement from './components/ServiceManagement';
import InsuranceVerification from './components/InsuranceVerification';
import ServiceOperations from './components/ServiceOperations';

const ServiceCenter: React.FC = () => {
  const tabs = [
    { 
      path: '', 
      label: 'Service Registry', 
      icon: Users, 
      component: ServiceDirectory,
      description: 'Search and view all service recipients'
    },
    { 
      path: 'management', 
      label: 'Encounter Management', 
      icon: Activity, 
      component: ServiceManagement,
      description: 'Manage service encounters and charge capture'
    },
    { 
      path: 'insurance', 
      label: 'Coverage Verification', 
      icon: Shield, 
      component: InsuranceVerification,
      description: 'Verify and manage insurance coverage'
    },
    { 
      path: 'operations', 
      label: 'Service Operations', 
      icon: Upload, 
      component: ServiceOperations,
      description: 'Import, export, and batch operations'
    },
  ];

  // Dynamic terminology based on service location type
  const getServiceLocationLabel = () => {
    // This will be determined by the provider configuration
    // For now, using universal terms
    return {
      recipients: 'Service Recipients', // Universal term for patients/specimens
      encounters: 'Encounters', // Universal for visits/tests/procedures
      location: 'Service Locations' // Universal for labs/clinics/facilities
    };
  };

  const labels = getServiceLocationLabel();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Center</h1>
            <p className="text-gray-600 mt-1">Revenue Cycle Management for Healthcare Service Locations</p>
          </div>
          <div className="flex space-x-3">
            <button className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Upload className="w-4 h-4 mr-2 text-gray-600" />
              Import Records
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <UserPlus className="w-4 h-4 mr-2" />
              New Registration
            </button>
          </div>
        </div>

        {/* Quick Stats - Universal for all service locations */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Total {labels.recipients}</p>
            <p className="text-lg font-semibold text-gray-900">3,847</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Active {labels.encounters}</p>
            <p className="text-lg font-semibold text-gray-900">892</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Coverage Verified</p>
            <p className="text-lg font-semibold text-green-600">94%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Charge Capture Rate</p>
            <p className="text-lg font-semibold text-blue-600">98.2%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">Service Locations</p>
            <p className="text-lg font-semibold text-purple-600">12</p>
          </div>
        </div>

        {/* Service Location Type Indicators */}
        <div className="mt-4 flex items-center space-x-4 text-sm">
          <div className="flex items-center text-gray-600">
            <TestTube className="w-4 h-4 mr-1 text-blue-500" />
            <span>Laboratory Services</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Activity className="w-4 h-4 mr-1 text-green-500" />
            <span>Clinical Services</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Building2 className="w-4 h-4 mr-1 text-purple-500" />
            <span>Facility Services</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex overflow-x-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={`/service-center${tab.path ? '/' + tab.path : ''}`}
                end={tab.path === ''}
                className={({ isActive }) =>
                  `py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                <div className="flex items-center">
                  <tab.icon className="w-4 h-4 mr-2" />
                  <span>{tab.label}</span>
                </div>
              </NavLink>
            ))}
          </nav>
        </div>
        
        {/* Content Area */}
        <div className="p-6">
          <Routes>
            <Route index element={<ServiceDirectory />} />
            <Route path="management/*" element={<ServiceManagement />} />
            <Route path="insurance/*" element={<InsuranceVerification />} />
            <Route path="operations/*" element={<ServiceOperations />} />
            <Route path="*" element={<Navigate to="/service-center" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default ServiceCenter;