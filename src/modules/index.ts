// Module Registry - Central export point for all modules
export * from './dashboard';
export * from './billing';
export * from './operations';
export * from './analytics';
export * from './admin';
export * from './account';

// Module configuration for dynamic loading
export const moduleConfig = {
  dashboard: {
    name: 'Dashboard',
    icon: 'LayoutDashboard',
    path: '/dashboard',
    enabled: true,
    roles: ['admin', 'lab', 'clinic']
  },
  billing: {
    name: 'Billing',
    icon: 'DollarSign',
    path: '/billing',
    enabled: true,
    roles: ['admin', 'lab'],
    submodules: {
      invoices: { name: 'Invoices', path: '/billing/invoices' },
      payments: { name: 'Payments', path: '/billing/payments' },
      credits: { name: 'Credits', path: '/billing/credits' },
      disputes: { name: 'Disputes', path: '/billing/disputes' }
    }
  },
  operations: {
    name: 'Operations',
    icon: 'Package',
    path: '/operations',
    enabled: true,
    roles: ['admin'],
    submodules: {
      import: { name: 'Import Data', path: '/operations/import' },
      export: { name: 'Export', path: '/operations/export' },
      queues: { name: 'Queues', path: '/operations/queues' }
    }
  },
  analytics: {
    name: 'Analytics',
    icon: 'BarChart',
    path: '/analytics',
    enabled: true,
    roles: ['admin', 'lab'],
    submodules: {
      financial: { name: 'Financial', path: '/analytics/financial' },
      operational: { name: 'Operational', path: '/analytics/operational' },
      custom: { name: 'Custom Reports', path: '/analytics/custom' }
    }
  },
  admin: {
    name: 'Admin',
    icon: 'Settings',
    path: '/admin',
    enabled: true,
    roles: ['admin'],
    submodules: {
      organization: { name: 'Organization', path: '/admin/organization' },
      users: { name: 'Users', path: '/admin/users' },
      configuration: { name: 'Configuration', path: '/admin/configuration' },
      system: { name: 'System', path: '/admin/system' }
    }
  },
  account: {
    name: 'Account',
    icon: 'User',
    path: '/account',
    enabled: true,
    roles: ['admin', 'lab', 'clinic'],
    submodules: {
      profile: { name: 'Profile', path: '/account/profile' },
      preferences: { name: 'Preferences', path: '/account/preferences' },
      security: { name: 'Security', path: '/account/security' }
    }
  }
} as const;

export type ModuleName = keyof typeof moduleConfig;
export type ModuleConfig = typeof moduleConfig[ModuleName];