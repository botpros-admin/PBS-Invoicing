import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  Settings,
  Building2,
  Upload,
  DollarSign,
  LogOut,
  User,
  Package,
  CreditCard,
  AlertTriangle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { moduleConfig } from '../modules';
import PermissionGuard from './common/PermissionGuard';

interface SidebarProps {
  collapsed: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={20} />,
  DollarSign: <DollarSign size={20} />,
  Package: <Package size={20} />,
  BarChart: <BarChart3 size={20} />,
  Settings: <Settings size={20} />,
  User: <User size={20} />,
  FileText: <FileText size={20} />,
  CreditCard: <CreditCard size={20} />,
  Building2: <Building2 size={20} />,
  Upload: <Upload size={20} />,
  AlertTriangle: <AlertTriangle size={20} />
};

const EnhancedSidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { currentTenant, currentOrganization, canAccessModule, switchOrganization, organizations } = useTenant();
  const [expandedModules, setExpandedModules] = React.useState<Set<string>>(new Set());

  // Filter modules based on tenant access
  const accessibleModules = useMemo(() => {
    if (!isAuthenticated || !currentTenant) return [];
    
    return Object.entries(moduleConfig).filter(([moduleName]) => 
      canAccessModule(moduleName)
    ).map(([name, config]) => ({
      name,
      ...config,
      icon: iconMap[config.icon] || <FileText size={20} />
    }));
  }, [isAuthenticated, currentTenant, canAccessModule]);

  const toggleModule = (moduleName: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleName)) {
      newExpanded.delete(moduleName);
    } else {
      newExpanded.add(moduleName);
    }
    setExpandedModules(newExpanded);
  };

  return (
    <aside 
      className={`bg-gradient-to-b from-gray-900 to-gray-800 text-white transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      } h-screen fixed left-0 top-0 z-10 flex flex-col`}
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

      {/* Organization Selector */}
      {!collapsed && currentOrganization && organizations.length > 1 && (
        <div className="px-4 py-3 border-b border-white/10">
          <label className="text-xs text-gray-400 uppercase tracking-wider">Organization</label>
          <select 
            value={currentOrganization.id}
            onChange={(e) => switchOrganization(e.target.value)}
            className="mt-1 w-full bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            {organizations.map(org => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.type})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tenant Badge */}
      {!collapsed && currentTenant && (
        <div className="px-4 py-2 border-b border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Access Level</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              currentTenant === 'billing' ? 'bg-purple-600' :
              currentTenant === 'lab' ? 'bg-blue-600' :
              'bg-green-600'
            }`}>
              {currentTenant}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto mt-4">
        <ul>
          {accessibleModules.map((module) => (
            <li key={module.name} className="mb-1 px-2">
              {module.submodules && !collapsed ? (
                // Module with submodules
                <div>
                  <button
                    onClick={() => toggleModule(module.name)}
                    className="flex items-center justify-between w-full py-3 px-4 rounded-lg transition-colors text-white hover:bg-white/10"
                  >
                    <div className="flex items-center">
                      <span className="mr-3">{module.icon}</span>
                      <span>{module.name}</span>
                    </div>
                    {expandedModules.has(module.name) ? 
                      <ChevronDown size={16} /> : 
                      <ChevronRight size={16} />
                    }
                  </button>
                  
                  {expandedModules.has(module.name) && (
                    <ul className="ml-4 mt-1">
                      {Object.entries(module.submodules).map(([key, sub]) => (
                        <li key={key}>
                          <NavLink
                            to={sub.path}
                            className={({ isActive }) =>
                              `flex items-center py-2 px-4 rounded-lg transition-colors text-sm ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
                              }`
                            }
                          >
                            {sub.name}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                // Simple module
                <NavLink
                  to={module.path}
                  end={module.path === '/dashboard'}
                  className={({ isActive }) =>
                    `flex items-center py-3 px-4 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-white hover:bg-white/10'
                    }`
                  }
                >
                  <span className="mr-3">{module.icon}</span>
                  {!collapsed && <span>{module.name}</span>}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* User Section */}
      <div className="border-t border-white/10">
        {!collapsed && user && (
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3">
                <User size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.email}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user.role || 'User'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <button 
          onClick={logout}
          className="flex items-center w-full py-3 px-4 text-white hover:bg-white/10 transition-colors"
        >
          <LogOut size={20} className={collapsed ? '' : 'mr-3'} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default EnhancedSidebar;