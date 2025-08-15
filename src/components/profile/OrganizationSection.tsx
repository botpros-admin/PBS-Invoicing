import React, { useState } from 'react';
import { 
  Building, 
  Shield, 
  Users,
  Crown,
  Key,
  Clock,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  UserCheck,
  Settings,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const OrganizationSection: React.FC = () => {
  const { user, permissions, hasPermission } = useAuth();
  
  // Mock organization data
  const organizationData = {
    id: 'org_123',
    name: 'Pacific Billing Solutions',
    type: 'Healthcare Billing',
    established: '2018-03-15',
    address: {
      street: '123 Healthcare Drive',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'United States'
    },
    contact: {
      phone: '+1 (555) 123-4567',
      email: 'admin@pacificbilling.com',
      website: 'https://pacificbilling.com'
    },
    stats: {
      totalUsers: 45,
      activeUsers: 38,
      totalClients: 127,
      monthlyInvoices: 1250
    },
    subscription: {
      plan: 'Enterprise',
      status: 'active',
      nextBilling: '2024-02-01',
      features: [
        'Unlimited users',
        'Advanced reporting',
        'Priority support',
        'Custom integrations',
        'Multi-tenant architecture'
      ]
    }
  };

  const getRoleDetails = () => {
    if (user?.userType === 'staff') {
      switch (user.role) {
        case 'super_admin':
          return {
            title: 'Super Administrator',
            description: 'Full system access across all organizations',
            icon: Crown,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200'
          };
        case 'admin':
          return {
            title: 'Administrator',
            description: 'Full access to organization management',
            icon: Shield,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200'
          };
        case 'ar_manager':
          return {
            title: 'AR Manager',
            description: 'Accounts receivable and billing management',
            icon: UserCheck,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200'
          };
        default:
          return {
            title: 'Staff Member',
            description: 'Standard access to assigned features',
            icon: Users,
            color: 'text-gray-600',
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200'
          };
      }
    } else {
      return {
        title: `Client ${user?.role === 'admin' ? 'Administrator' : 'User'}`,
        description: user?.role === 'admin' 
          ? 'Manage client organization and users'
          : 'Access to client portal features',
        icon: Building,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
      };
    }
  };

  const roleDetails = getRoleDetails();

  const permissionGroups = [
    {
      name: 'Invoice Management',
      permissions: [
        { key: 'invoices', action: 'create', label: 'Create Invoices' },
        { key: 'invoices', action: 'read', label: 'View Invoices' },
        { key: 'invoices', action: 'update', label: 'Edit Invoices' },
        { key: 'invoices', action: 'delete', label: 'Delete Invoices' },
      ]
    },
    {
      name: 'Client Management',
      permissions: [
        { key: 'clients', action: 'create', label: 'Add Clients' },
        { key: 'clients', action: 'read', label: 'View Clients' },
        { key: 'clients', action: 'update', label: 'Edit Clients' },
        { key: 'clients', action: 'delete', label: 'Remove Clients' },
      ]
    },
    {
      name: 'Reporting',
      permissions: [
        { key: 'reports', action: 'read', label: 'View Reports' },
        { key: 'reports', action: 'create', label: 'Generate Reports' },
        { key: 'reports', action: 'export', label: 'Export Reports' },
      ]
    },
    {
      name: 'System Administration',
      permissions: [
        { key: 'users', action: 'create', label: 'Add Users' },
        { key: 'users', action: 'update', label: 'Manage Users' },
        { key: 'settings', action: 'update', label: 'System Settings' },
      ]
    }
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Your Role */}
      <div className={`${roleDetails.bgColor} ${roleDetails.borderColor} border rounded-lg p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <roleDetails.icon className={`w-6 h-6 ${roleDetails.color} mr-3`} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{roleDetails.title}</h3>
              <p className="text-sm text-gray-600">{roleDetails.description}</p>
            </div>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            user?.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {user?.status || 'Active'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Type
            </label>
            <p className="text-gray-900 capitalize">{user?.userType} Member</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role Level
            </label>
            <p className="text-gray-900">{roleDetails.title}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member Since
            </label>
            <p className="text-gray-900">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Not available'}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              MFA Status
            </label>
            <div className="flex items-center space-x-2">
              {user?.mfaEnabled ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-700 text-sm font-medium">Enabled</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-700 text-sm font-medium">Disabled</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Organization Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Building className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Organization Details</h3>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1">
            <span>View Full Profile</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Basic Information</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name
                </label>
                <p className="text-gray-900">{organizationData.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <p className="text-gray-900">{organizationData.type}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Established
                </label>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-900">
                    {new Date(organizationData.established).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-4">Contact Information</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div className="text-gray-900 text-sm">
                    <p>{organizationData.address.street}</p>
                    <p>
                      {organizationData.address.city}, {organizationData.address.state} {organizationData.address.zipCode}
                    </p>
                    <p>{organizationData.address.country}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <p className="text-gray-900 text-sm">{organizationData.contact.phone}</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <p className="text-gray-900 text-sm">{organizationData.contact.email}</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <a 
                  href={organizationData.contact.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  {organizationData.contact.website}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Statistics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-6">
          <Users className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Organization Statistics</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{organizationData.stats.totalUsers}</p>
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-xs text-green-600">({organizationData.stats.activeUsers} active)</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Building className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{organizationData.stats.totalClients}</p>
            <p className="text-sm text-gray-600">Total Clients</p>
            <p className="text-xs text-gray-500">All time</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{organizationData.stats.monthlyInvoices}</p>
            <p className="text-sm text-gray-600">Monthly Invoices</p>
            <p className="text-xs text-gray-500">This month</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Crown className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{organizationData.subscription.plan}</p>
            <p className="text-sm text-gray-600">Plan Type</p>
            <p className="text-xs text-green-600">Active</p>
          </div>
        </div>
      </div>

      {/* Your Permissions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Key className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Your Permissions</h3>
          </div>
          <span className="text-sm text-gray-500">
            {permissions.length} permission{permissions.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {permissionGroups.map((group) => (
            <div key={group.name} className="space-y-3">
              <h4 className="font-medium text-gray-900 border-b border-gray-200 pb-2">
                {group.name}
              </h4>
              <div className="space-y-2">
                {group.permissions.map((perm) => (
                  <div key={`${perm.key}-${perm.action}`} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{perm.label}</span>
                    {hasPermission(perm.key, perm.action) ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 border border-gray-300 rounded-full" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Need Additional Access?</h4>
              <p className="text-sm text-blue-800 mt-1">
                Contact your organization administrator to request additional permissions or role changes.
              </p>
              <button className="mt-2 text-sm text-blue-700 hover:text-blue-800 font-medium">
                Request Access →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Information */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Crown className="w-5 h-5 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-purple-900">Subscription Details</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-purple-800">Current Plan</span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                {organizationData.subscription.plan}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-purple-700">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <span className="font-medium capitalize">{organizationData.subscription.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Next Billing:</span>
                <span className="font-medium">
                  {new Date(organizationData.subscription.nextBilling).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div>
            <span className="text-sm font-medium text-purple-800 mb-3 block">Included Features</span>
            <div className="space-y-2">
              {organizationData.subscription.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-purple-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSection;