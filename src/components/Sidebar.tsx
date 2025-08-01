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

interface SidebarProps {
  collapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  // Get isAuthenticated as well to handle potential user object lag
  const { user, logout, isAuthenticated } = useAuth(); 

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/dashboard/invoices', label: 'Invoices', icon: <FileText size={20} /> },
    { path: '/dashboard/reports', label: 'Reports', icon: <BarChart3 size={20} /> },
    { path: '/dashboard/settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  // Filter nav items based on user role, considering isAuthenticated
  const filteredNavItems = navItems.filter(item => {
    // If context isn't authenticated yet, show nothing (or a loading state if preferred)
    if (!isAuthenticated) return false; 
    
    // If authenticated but user object is momentarily null, assume admin temporarily to avoid flicker
    // Or, return true for basic items like Dashboard if that's safer
    const currentRole = user?.role || 'admin'; // Default to admin if user is null but authenticated

    // Admin can access everything
    if (currentRole === 'admin') return true;
    
    // AR Manager can't access settings
    if (currentRole === 'ar_manager' && item.path === '/dashboard/settings') return false;
    
    // Staff can't access settings or reports
    if (currentRole === 'staff' && (item.path === '/dashboard/settings' || item.path === '/dashboard/reports')) return false;
    
    return true;
  });

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
          // Collapsed View: Centered small logo
          <img src="/pbs-logo.png" alt="PBS" className="h-8 w-8" />
        ) : (
          // Expanded View: Larger logo with text
          <div className="flex items-center space-x-2">
            <img 
              src="https://storage.googleapis.com/prec_bill_sol/precision_billing_solution_tree.png" 
              alt="PBS Logo" 
              className="h-10" 
            />
            {/* Text appears next to logo on larger screens */}
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
                // Add the 'end' prop specifically for the dashboard link
                end={item.path === '/dashboard'} 
                className={({ isActive }) =>
                  `flex items-center py-3 px-4 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-secondary text-white'
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
