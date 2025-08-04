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
  DollarSign
} from 'lucide-react';
import UserManagement from '../components/settings/UserManagement';
import ClientsClinicsSettings from '../components/settings/ClinicSettings'; // Renamed import
// import UserSettings from '../components/settings/UserSettings';
import PaymentSettings from '../components/settings/PaymentSettings';
import SecuritySettings from '../components/settings/SecuritySettings';
import EmailSettings from '../components/settings/EmailSettings';
import InvoiceParameters from '../components/settings/InvoiceParameters';

const Settings: React.FC = () => {
  
  const tabs = [
    { path: '', label: 'Clients & Clinics', icon: Building, component: ClientsClinicsSettings }, // Index route
    { path: 'users', label: 'Users & Permissions', icon: Users, component: UserManagement },
    // { path: 'user-settings', label: 'User Settings', icon: Users, component: UserSettings },
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
                to={tab.path} // Relative path for nested routes
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
            {tabs.map((tab) => (
              <Route 
                key={tab.path}
                path={tab.path} 
                index={tab.path === ''} // Mark the default tab as index
                element={<tab.component />} 
              />
            ))}
            {/* Optional: Add a catch-all or default route within settings if needed */}
          </Routes>
          {/* Outlet is not needed here as we are defining the full nested routes */}
        </div>
      </div>
    </div>
  );
};

export default Settings;
