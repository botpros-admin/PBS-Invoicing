import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  Settings,
  Building2,
  Upload,
  DollarSign,
  LogOut,
  Wallet,
  User,
  Users,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Calculator,
  Building,
  Briefcase,
  FileCheck,
  Shield,
  UserCheck,
  ClipboardList,
  TrendingUp,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  collapsed: boolean;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles: string[];
  isNew?: boolean;
  children?: NavItem[];
}

const NestedSidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Define navigation structure with nested items
  const navItems: NavItem[] = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: <LayoutDashboard size={20} />, 
      allowedRoles: ['admin', 'ar_manager', 'staff', 'user'] 
    },
    
    // Billing Hub with nested sub-tabs
    { 
      path: '/billing', 
      label: 'Billing Hub', 
      icon: <Wallet size={20} />, 
      allowedRoles: ['admin', 'ar_manager', 'staff'], 
      children: [
        { 
          path: '/billing/dashboard', 
          label: 'Dashboard', 
          icon: <LayoutDashboard size={16} />,
          allowedRoles: ['admin', 'ar_manager', 'staff']
        },
        { 
          path: '/billing/invoices', 
          label: 'Invoices', 
          icon: <FileText size={16} />,
          allowedRoles: ['admin', 'ar_manager', 'staff']
        },
        { 
          path: '/billing/payments', 
          label: 'Payments', 
          icon: <CreditCard size={16} />,
          allowedRoles: ['admin', 'ar_manager', 'staff']
        },
        { 
          path: '/billing/cpt', 
          label: 'CPT & Pricing', 
          icon: <Calculator size={16} />,
          allowedRoles: ['admin', 'ar_manager', 'staff']
        },
        { 
          path: '/billing/lab-billing', 
          label: 'Lab Billing', 
          icon: <Building size={16} />,
          allowedRoles: ['admin', 'ar_manager', 'staff']
        },
        { 
          path: '/billing/operations', 
          label: 'Operations', 
          icon: <Briefcase size={16} />,
          allowedRoles: ['admin', 'ar_manager', 'staff']
        },
      ]
    },
    
    // Service Center with nested sub-tabs
    { 
      path: '/service-center', 
      label: 'Service Center', 
      icon: <Users size={20} />, 
      allowedRoles: ['admin', 'ar_manager', 'staff'], 
      children: [
        { 
          path: '/service-center/service-registry', 
          label: 'Service Registry', 
          icon: <ClipboardList size={16} />,
          allowedRoles: ['admin', 'ar_manager', 'staff']
        },
        { 
          path: '/service-center/encounter-management', 
          label: 'Encounter Management', 
          icon: <UserCheck size={16} />,
          allowedRoles: ['admin', 'ar_manager', 'staff']
        },
        { 
          path: '/service-center/coverage-verification', 
          label: 'Coverage Verification', 
          icon: <Shield size={16} />,
          allowedRoles: ['admin', 'ar_manager', 'staff']
        },
        { 
          path: '/service-center/service-operations', 
          label: 'Service Operations', 
          icon: <Briefcase size={16} />,
          allowedRoles: ['admin', 'ar_manager', 'staff']
        },
      ]
    },
    
    // Team operations
    { 
      path: '/team', 
      label: 'Team Operations', 
      icon: <Users size={20} />, 
      allowedRoles: ['admin', 'ar_manager'],
      children: [
        { 
          path: '/team/members', 
          label: 'Team Members', 
          icon: <User size={16} />,
          allowedRoles: ['admin', 'ar_manager']
        },
        { 
          path: '/team/tasks', 
          label: 'Task Management', 
          icon: <FileCheck size={16} />,
          allowedRoles: ['admin', 'ar_manager']
        },
      ]
    },
    
    // Analytics & reporting
    { 
      path: '/analytics', 
      label: 'Analytics', 
      icon: <BarChart3 size={20} />, 
      allowedRoles: ['admin', 'ar_manager'],
      children: [
        { 
          path: '/analytics/reports', 
          label: 'Reports', 
          icon: <FileText size={16} />,
          allowedRoles: ['admin', 'ar_manager']
        },
        { 
          path: '/analytics/trends', 
          label: 'Trends', 
          icon: <TrendingUp size={16} />,
          allowedRoles: ['admin', 'ar_manager']
        },
      ]
    },
    
    // Data import/export operations
    { 
      path: '/data', 
      label: 'Data Operations', 
      icon: <Database size={20} />, 
      allowedRoles: ['admin', 'ar_manager'], 
      isNew: true,
      children: [
        { 
          path: '/data/import', 
          label: 'Import', 
          icon: <Upload size={16} />,
          allowedRoles: ['admin', 'ar_manager']
        },
        { 
          path: '/data/export', 
          label: 'Export', 
          icon: <Database size={16} />,
          allowedRoles: ['admin', 'ar_manager']
        },
      ]
    },
  ];

  // Auto-expand sections based on current path
  useEffect(() => {
    const currentPath = location.pathname;
    const newExpanded = new Set<string>();
    
    navItems.forEach(item => {
      if (item.children && currentPath.startsWith(item.path)) {
        newExpanded.add(item.path);
      }
    });
    
    setExpandedSections(newExpanded);
  }, [location.pathname]);

  const toggleSection = (path: string, hasChildren: boolean) => {
    if (collapsed) return; // Don't expand when sidebar is collapsed
    
    // Navigate to default child when clicking parent
    if (hasChildren) {
      const newExpanded = new Set(expandedSections);
      
      // If not expanded, expand and navigate to first child
      if (!newExpanded.has(path)) {
        newExpanded.add(path);
        setExpandedSections(newExpanded);
        
        // Navigate to the default (first) child route
        if (path === '/billing') {
          navigate('/billing/dashboard');
        } else if (path === '/service-center') {
          navigate('/service-center/service-registry');
        } else if (path === '/team') {
          navigate('/team/members');
        } else if (path === '/analytics') {
          navigate('/analytics/reports');
        } else if (path === '/data') {
          navigate('/data/import');
        }
      } else {
        // If already expanded, just collapse
        newExpanded.delete(path);
        setExpandedSections(newExpanded);
      }
    }
  };

  const filteredNavItems = isAuthenticated && user 
    ? navItems.filter(item => item.allowedRoles.includes(user.role as any))
    : [];

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.has(item.path);
    const isActive = location.pathname === item.path || 
                    (hasChildren && location.pathname.startsWith(item.path));
    
    // Filter children based on user role
    const filteredChildren = hasChildren && isAuthenticated && user
      ? item.children.filter(child => child.allowedRoles.includes(user.role as any))
      : [];

    return (
      <li key={item.path} className={level === 0 ? 'mb-2 px-2' : 'mb-1'}>
        {hasChildren ? (
          <>
            {/* Parent item with expand/collapse */}
            <button
              onClick={() => toggleSection(item.path, true)}
              className={`w-full flex items-center py-3 px-4 rounded-lg transition-colors ${
                isActive
                  ? 'bg-gray-600 text-white'  // Darker shade for parent sections
                  : 'text-white hover:bg-gray-600'  // Darker hover for parent sections
              } ${level > 0 ? 'pl-8' : ''}`}
            >
              <span className="mr-3">{item.icon}</span>
              {!collapsed && (
                <>
                  <div className="flex items-center justify-between flex-1">
                    <span className={level > 0 ? 'text-sm' : ''}>{item.label}</span>
                    <div className="flex items-center">
                      {item.isNew && (
                        <span className="mr-2 px-2 py-0.5 text-xs bg-green-500 text-white rounded-full">
                          NEW
                        </span>
                      )}
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </div>
                </>
              )}
            </button>
            
            {/* Children items */}
            {!collapsed && isExpanded && filteredChildren.length > 0 && (
              <ul className="mt-1 ml-4">
                {filteredChildren.map(child => renderNavItem(child, level + 1))}
              </ul>
            )}
          </>
        ) : (
          /* Leaf item (no children) */
          <NavLink
            to={item.path}
            end={item.path === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center py-3 px-4 rounded-lg transition-colors ${
                isActive
                  ? level > 0 
                    ? 'bg-gray-400 text-white'  // Lighter shade for active sub-items
                    : 'bg-gray-600 text-white'  // Darker shade for active main items
                  : level > 0
                    ? 'text-gray-300 hover:bg-gray-500 hover:text-white'  // Lighter text and hover for sub-items
                    : 'text-white hover:bg-gray-600'  // Original darker for main items
              } ${level > 0 ? 'pl-8' : ''}`
            }
          >
            <span className="mr-3">{item.icon}</span>
            {!collapsed && (
              <div className="flex items-center justify-between flex-1">
                <span className={level > 0 ? 'text-sm' : ''}>{item.label}</span>
                {item.isNew && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-green-500 text-white rounded-full">
                    NEW
                  </span>
                )}
              </div>
            )}
          </NavLink>
        )}
      </li>
    );
  };

  return (
    <aside 
      className={`bg-primary text-white transition-all duration-300 ease-in-out ${
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto mt-6">
        <ul>
          {filteredNavItems.map(item => renderNavItem(item))}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-white/10">
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

export default NestedSidebar;