import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { 
  Building, 
  Users, 
  DollarSign,
  FileText,
  Shield,
  Settings,
  Database,
  Activity
} from 'lucide-react';

// Import existing components
import ClientsClinicsSettings from '../../components/settings/ClinicSettings';
import UserManagement from '../../components/settings/UserManagement';
import RoleManagement from '../../components/settings/RoleManagement';
import PricingSettings from '../../components/settings/PricingSettings';
import InvoiceParameters from '../../components/settings/InvoiceParameters';

// Placeholder components for new features
const CPTCodeManagement = () => (
  <div className="text-center py-8">
    <Database className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-medium text-gray-900">CPT Code Management</h3>
    <p className="mt-1 text-sm text-gray-500">Configure CPT codes and mapping rules</p>
  </div>
);

const SystemSettings = () => (
  <div className="text-center py-8">
    <Settings className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-medium text-gray-900">System Settings</h3>
    <p className="mt-1 text-sm text-gray-500">Configure system-wide settings and integrations</p>
  </div>
);

const AuditLogs = () => (
  <div className="text-center py-8">
    <Activity className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-medium text-gray-900">Audit Logs</h3>
    <p className="mt-1 text-sm text-gray-500">View system activity and audit trails</p>
  </div>
);

export const AdminModule: React.FC = () => {
  const tabs = [
    { 
      path: '', 
      label: 'Organization', 
      icon: Building, 
      component: ClientsClinicsSettings,
      description: 'Manage labs and clinics'
    },
    { 
      path: 'users', 
      label: 'User Management', 
      icon: Users, 
      component: UserManagement,
      description: 'Manage user accounts and assignments'
    },
    { 
      path: 'roles', 
      label: 'Roles & Permissions', 
      icon: Shield, 
      component: RoleManagement,
      description: 'Configure roles and access controls'
    },
    { 
      path: 'pricing', 
      label: 'Pricing Schedules', 
      icon: DollarSign, 
      component: PricingSettings,
      description: 'Set up pricing schedules and rules'
    },
    { 
      path: 'cpt-codes', 
      label: 'CPT Codes', 
      icon: Database, 
      component: CPTCodeManagement,
      description: 'Manage CPT codes and mappings'
    },
    { 
      path: 'invoice', 
      label: 'Invoice Configuration', 
      icon: FileText, 
      component: InvoiceParameters,
      description: 'Configure invoice templates and parameters'
    },
    { 
      path: 'system', 
      label: 'System', 
      icon: Settings, 
      component: SystemSettings,
      description: 'System configuration and integrations'
    },
    { 
      path: 'audit', 
      label: 'Audit Logs', 
      icon: Activity, 
      component: AuditLogs,
      description: 'View activity logs and audit trails'
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage organization settings, users, and system configuration
        </p>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex overflow-x-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={`/admin${tab.path ? '/' + tab.path : ''}`}
                end={tab.path === ''}
                className={({ isActive }) =>
                  `py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                <div className="flex items-center">
                  <tab.icon size={16} className="mr-2" />
                  {tab.label}
                </div>
              </NavLink>
            ))}
          </nav>
        </div>
        
        <div className="p-6">
          <Routes>
            {tabs.map((tab) => (
              <Route 
                key={tab.path} 
                path={tab.path || '/'} 
                element={<tab.component />} 
              />
            ))}
            <Route path="*" element={<ClientsClinicsSettings />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AdminModule;