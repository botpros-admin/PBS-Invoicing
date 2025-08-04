import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ClientUserRole } from '../types';

interface SidebarProps {
  collapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const { user, logout, isAuthenticated } = useAuth(); 

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, allowedRoles: ['admin', 'ar_manager', 'staff', 'user'] },
    { path: '/dashboard/invoices', label: 'Invoices', icon: <FileText size={20} />, allowedRoles: ['admin', 'ar_manager', 'staff', 'user'] },
    { path: '/dashboard/reports', label: 'Reports', icon: <BarChart3 size={20} />, allowedRoles: ['admin', 'ar_manager'] },
    { path: '/dashboard/settings', label: 'Settings', icon: <Settings size={20} />, allowedRoles: ['admin'] },
  ];

  const filteredNavItems = isAuthenticated && user 
    ? navItems.filter(item => item.allowedRoles.includes(user.role as any))
    : [];

  return (
    <aside 
      className={`bg-primary text-white transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      } h-screen fixed left-0 top-0 z-10`}
      style={{ position: 'fixed', height: '100vh', overflowY: 'auto' }}
    >
      {/* Header Section */}
      <div className={`h-16 border-b border-white/10 flex items-center ${collapsed ? 'justify-center' : 'px-4'}`}>
        {collapsed ? (
          <img src="/pbs-logo.png" alt="PBS" className="h-8 w-8" />
        ) : (
          <div className="flex items-center space-x-2">
            <img 
              src="https://storage.googleapis.com/prec_bill_sol/precision_billing_solution_tree.png" 
              alt="PBS Logo" 
              className="h-10" 
            />
            <div className="text-left uppercase tracking-wider"> 
              <div className="text-xl font-bold text-white">Precision</div> 
              <div className="text-xs text-gray-300 -mt-1">Billing Solution</div>
            </div>
          </div>
        )}
      </div>

      <nav className="mt-6">
        <ul>
          {filteredNavItems.map((item) => (
            <li key={item.path} className="mb-2 px-2">
              <NavLink
                to={item.path}
                end={item.path === '/dashboard'} 
                className={({ isActive }) =>
                  `flex items-center py-3 px-4 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                      : 'text-white hover:bg-white/10'
                  }`
                }
              >
                <span className="mr-3">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="absolute bottom-0 w-full p-4 border-t border-white/10">
        <button 
          onClick={logout}
          className="flex items-center w-full py-2 px-4 text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <LogOut size={20} className="mr-3" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
