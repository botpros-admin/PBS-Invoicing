import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import PricingSettings from '../components/settings/PricingSettings';
import { 
  Building, 
  Users, 
  CreditCard, 
  Lock,
  Mail,
  FileText,
  DollarSign,
  Shield
} from 'lucide-react';
import UserManagement from '../components/settings/UserManagement';
import ClientsClinicsSettings from '../components/settings/ClinicSettings'; // Renamed import
import PaymentSettings from '../components/settings/PaymentSettings';
import SecuritySettings from '../components/settings/SecuritySettings';
import EmailSettings from '../components/settings/EmailSettings';
import InvoiceParameters from '../components/settings/InvoiceParameters';
import RoleManagement from '../components/settings/RoleManagement'; // Import the new component
import CPTCodeMapping from '../components/CPTCodeMapping';
import OrganizationHierarchy from '../components/OrganizationHierarchy';

const Settings: React.FC = () => {
  
  const tabs = [
    { path: '', label: 'Organization Hierarchy', icon: Building, component: () => <OrganizationHierarchy mode="management" /> }, // Index route
    { path: 'clinics', label: 'Clients & Clinics', icon: Building, component: ClientsClinicsSettings },
    { path: 'users', label: 'User Assignments', icon: Users, component: UserManagement },
    { path: 'roles', label: 'Roles & Permissions', icon: Shield, component: RoleManagement },
    { path: 'cpt', label: 'CPT Codes', icon: FileText, component: () => <CPTCodeMapping mode="management" /> },
    { path: 'pricing', label: 'Pricing', icon: DollarSign, component: PricingSettings },
    { path: 'payment', label: 'Payment Settings', icon: CreditCard, component: PaymentSettings },
    { path: 'email', label: 'Email Settings', icon: Mail, component: EmailSettings },
    { path: 'invoice', label: 'Invoice Parameters', icon: FileText, component: InvoiceParameters },
    { path: 'security', label: 'Security', icon: Lock, component: SecuritySettings },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex overflow-x-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={`/settings${tab.path ? '/' + tab.path : ''}`} // Use absolute paths
                end={tab.path === ''} // Ensure index route matches exactly
                className={({ isActive }) =>
                  `py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap ${
                    isActive
                      ? 'border-[#0078D7] text-[#0078D7]'
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
          {/* Use Routes for nested routing */}
          <Routes>
            {/* Index route for /settings */}
            <Route index element={<OrganizationHierarchy mode="management" />} />
            {/* Explicitly define each route */}
            <Route path="clinics" element={<ClientsClinicsSettings />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="roles" element={<RoleManagement />} />
            <Route path="cpt" element={<CPTCodeMapping mode="management" />} />
            <Route path="pricing" element={<PricingSettings />} />
            <Route path="payment" element={<PaymentSettings />} />
            <Route path="email" element={<EmailSettings />} />
            <Route path="invoice" element={<InvoiceParameters />} />
            <Route path="security" element={<SecuritySettings />} />
            {/* Catch-all fallback to default tab */}
            <Route path="*" element={<OrganizationHierarchy mode="management" />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Settings;
