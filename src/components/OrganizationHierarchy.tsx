import React, { useState, useEffect, useRef } from 'react';
import {
  Building,
  ChevronDown,
  ChevronRight,
  Users,
  Home,
  Check,
  Search,
  Plus,
  Edit2,
  Trash2,
  Building2,
  User
} from 'lucide-react';
import { supabase } from '../api/supabase';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useNotifications } from '../context/NotificationContext';
import { BillingCompany, Laboratory, Clinic } from '../types/laboratory';

interface HierarchyNode {
  id: string;
  name: string;
  type: 'billing' | 'laboratory' | 'clinic';
  level: 1 | 2 | 3;
  parentId?: string;
  children?: HierarchyNode[];
  salesRep?: string;
  active: boolean;
  metadata?: any;
}

interface OrganizationHierarchyProps {
  mode?: 'switcher' | 'management';
  onSelect?: (node: HierarchyNode) => void;
}

const OrganizationHierarchy: React.FC<OrganizationHierarchyProps> = ({ 
  mode = 'switcher',
  onSelect 
}) => {
  const { user } = useAuth();
  const { currentTenant, setCurrentTenant } = useTenant();
  const { addNotification } = useNotifications();
  
  const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Modal states for management mode
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'laboratory' | 'clinic'>('laboratory');
  const [parentNode, setParentNode] = useState<HierarchyNode | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    salesRep: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchHierarchy();
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      
      // Fetch billing companies
      const { data: billingCompanies, error: bcError } = await supabase
        .from('billing_companies')
        .select('*')
        .order('name');

      if (bcError) {
        // If tables don't exist, show a helpful message
        if (bcError.code === '42P01') {
          console.warn('Hierarchy tables not found. Please run the database migration.');
          addNotification('warning', 'Database tables need to be created. Please check setup_hierarchy_tables.md for instructions.');
          setLoading(false);
          // Use mock data for now
          const mockHierarchy = [{
            id: 'mock-pbs-1',
            name: 'PBS Billing Company',
            type: 'billing' as const,
            level: 1 as const,
            active: true,
            children: [{
              id: 'mock-lab-1',
              name: 'Main Laboratory',
              type: 'laboratory' as const,
              level: 2 as const,
              parentId: 'mock-pbs-1',
              active: true,
              children: []
            }]
          }];
          setHierarchyData(mockHierarchy);
          return;
        }
        throw bcError;
      }

      // Fetch laboratories
      const { data: laboratories, error: labError } = await supabase
        .from('laboratories')
        .select('*')
        .eq('active', true)
        .order('name');

      if (labError) throw labError;

      // Fetch clinics
      const { data: clinics, error: clinicError } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (clinicError) throw clinicError;

      // Build hierarchy tree
      const tree: HierarchyNode[] = [];
      
      // Add PBS as root
      const pbsNode: HierarchyNode = {
        id: billingCompanies?.[0]?.id || 'pbs',
        name: 'Precision Billing Solutions',
        type: 'billing',
        level: 1,
        active: true,
        children: []
      };

      // Add laboratories as children of PBS
      laboratories?.forEach(lab => {
        const labNode: HierarchyNode = {
          id: lab.id,
          name: lab.name,
          type: 'laboratory',
          level: 2,
          parentId: pbsNode.id,
          active: lab.active,
          metadata: lab,
          children: []
        };

        // Add clinics as children of laboratories
        const labClinics = clinics?.filter(c => c.laboratory_id === lab.id) || [];
        labClinics.forEach(clinic => {
          const clinicNode: HierarchyNode = {
            id: clinic.id,
            name: clinic.name,
            type: 'clinic',
            level: 3,
            parentId: lab.id,
            salesRep: clinic.sales_rep,
            active: clinic.active,
            metadata: clinic,
            children: clinic.parent_clinic_id ? [] : undefined
          };
          
          labNode.children?.push(clinicNode);
        });

        pbsNode.children?.push(labNode);
      });

      tree.push(pbsNode);
      setHierarchy(tree);
      
      // Auto-expand PBS level
      setExpandedNodes(new Set([pbsNode.id]));
      
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
      addNotification('error', 'Failed to load organization hierarchy');
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSelectNode = (node: HierarchyNode) => {
    setSelectedNode(node);
    
    if (mode === 'switcher') {
      // Update tenant context based on selection
      setCurrentTenant({
        id: node.id,
        name: node.name,
        type: node.type,
        level: node.level,
        parentId: node.parentId
      });
      
      if (onSelect) {
        onSelect(node);
      }
      
      setShowDropdown(false);
      addNotification('success', `Switched to ${node.name}`);
    }
  };

  const handleAddNode = async () => {
    try {
      if (addType === 'laboratory') {
        const { error } = await supabase
          .from('laboratories')
          .insert([{
            billing_company_id: hierarchy[0]?.id,
            name: formData.name,
            code: formData.code,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            active: true
          }]);

        if (error) throw error;
        addNotification('success', 'Laboratory added successfully');
      } else if (addType === 'clinic' && parentNode) {
        const { error } = await supabase
          .from('clients')
          .insert([{
            laboratory_id: parentNode.id,
            name: formData.name,
            sales_rep: formData.salesRep,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            active: true
          }]);

        if (error) throw error;
        addNotification('success', 'Clinic added successfully');
      }

      setShowAddModal(false);
      setFormData({ name: '', code: '', salesRep: '', email: '', phone: '', address: '' });
      fetchHierarchy();
    } catch (error) {
      console.error('Error adding node:', error);
      addNotification('error', 'Failed to add organization');
    }
  };

  const handleDeleteNode = async (node: HierarchyNode) => {
    if (!confirm(`Are you sure you want to deactivate ${node.name}?`)) return;

    try {
      if (node.type === 'laboratory') {
        const { error } = await supabase
          .from('laboratories')
          .update({ active: false })
          .eq('id', node.id);

        if (error) throw error;
      } else if (node.type === 'clinic') {
        const { error } = await supabase
          .from('clients')
          .update({ active: false })
          .eq('id', node.id);

        if (error) throw error;
      }

      addNotification('success', `${node.name} deactivated`);
      fetchHierarchy();
    } catch (error) {
      console.error('Error deleting node:', error);
      addNotification('error', 'Failed to deactivate organization');
    }
  };

  const renderNode = (node: HierarchyNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    
    const matchesSearch = !searchTerm || 
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (node.salesRep && node.salesRep.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch && !hasChildren) return null;

    const getNodeIcon = () => {
      switch (node.type) {
        case 'billing':
          return <Building className="h-4 w-4 text-blue-600" />;
        case 'laboratory':
          return <Building2 className="h-4 w-4 text-green-600" />;
        case 'clinic':
          return <Home className="h-4 w-4 text-purple-600" />;
        default:
          return <Building className="h-4 w-4 text-gray-600" />;
      }
    };

    return (
      <div key={node.id}>
        <div
          className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 ${
            isSelected ? 'bg-blue-50 border-l-2 border-blue-600' : ''
          }`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => handleSelectNode(node)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="mr-2"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}
          
          <div className="flex items-center flex-1">
            {getNodeIcon()}
            <span className="ml-2 text-sm font-medium text-gray-900">
              {node.name}
            </span>
            {node.salesRep && (
              <span className="ml-2 text-xs text-gray-500">
                (Rep: {node.salesRep})
              </span>
            )}
          </div>

          {mode === 'management' && node.type !== 'billing' && (
            <div className="flex items-center space-x-1">
              {node.type === 'laboratory' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setParentNode(node);
                    setAddType('clinic');
                    setShowAddModal(true);
                  }}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                  title="Add Clinic"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Edit functionality
                }}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                title="Edit"
              >
                <Edit2 className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNode(node);
                }}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="Deactivate"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}

          {mode === 'switcher' && currentTenant?.id === node.id && (
            <Check className="h-4 w-4 text-green-600" />
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children?.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render switcher mode (dropdown)
  if (mode === 'switcher') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Building className="h-4 w-4" />
          <span>{currentTenant?.name || 'Select Organization'}</span>
          <ChevronDown className="h-4 w-4" />
        </button>

        {showDropdown && (
          <div className="absolute z-50 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search organizations..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : (
                hierarchy.map(node => renderNode(node))
              )}
            </div>

            <div className="p-3 border-t border-gray-200 text-xs text-gray-500">
              <div className="flex items-center justify-between">
                <span>Current: {currentTenant?.name}</span>
                <span className="capitalize">{currentTenant?.type}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render management mode (full page)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Organization Hierarchy</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage laboratories and clinics in the billing hierarchy
          </p>
        </div>
        <button
          onClick={() => {
            setAddType('laboratory');
            setParentNode(null);
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add Laboratory</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search organizations or sales reps..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading hierarchy...</div>
          ) : (
            <div className="space-y-1">
              {hierarchy.map(node => renderNode(node))}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h3 className="text-lg font-semibold mb-4">
              Add {addType === 'laboratory' ? 'Laboratory' : 'Clinic'}
              {parentNode && ` to ${parentNode.name}`}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={`Enter ${addType} name`}
                />
              </div>

              {addType === 'laboratory' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., LAB001"
                  />
                </div>
              )}

              {addType === 'clinic' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sales Rep
                  </label>
                  <input
                    type="text"
                    value={formData.salesRep}
                    onChange={(e) => setFormData({ ...formData, salesRep: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Sales representative name"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="contact@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Street address"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ name: '', code: '', salesRep: '', email: '', phone: '', address: '' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNode}
                disabled={!formData.name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add {addType === 'laboratory' ? 'Laboratory' : 'Clinic'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationHierarchy;