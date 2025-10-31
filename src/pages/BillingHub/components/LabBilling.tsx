import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  DollarSign,
  Building2,
  Upload,
  Package,
  TrendingUp,
  CheckCircle,
  Shield
} from 'lucide-react';

const LabBilling: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: 'Duplicate Prevention System',
      description: 'Prevent double billing with accession + CPT unique constraint',
      icon: <Shield className="h-8 w-8" />,
      path: '/billing/duplicate-review',
      status: 'critical',
      benefits: ['Real-time warnings', 'Override with audit trail', 'Review queue for conflicts']
    },
    {
      title: 'Dispute Management',
      description: 'Full ticketing system for dispute resolution and tracking',
      icon: <AlertTriangle className="h-8 w-8" />,
      path: '/billing/disputes',
      status: 'new',
      benefits: ['Complete workflow', 'Message threading', 'Status tracking']
    },
    {
      title: 'Dynamic Pricing',
      description: 'Pricing management with mandatory lab default fallback',
      icon: <DollarSign className="h-8 w-8" />,
      path: '/billing/pricing',
      status: 'new',
      benefits: ['Never fail imports', 'Bulk pricing import', 'Clinic overrides']
    },
    {
      title: 'Parent Account Aggregation',
      description: 'Manage healthcare systems with 150-300+ locations',
      icon: <Building2 className="h-8 w-8" />,
      path: '/service-center/parent-accounts',
      status: 'new',
      benefits: ['Consolidated statements', 'Bulk invoicing', 'Child location management']
    },
    {
      title: 'High-Volume Invoice Creation',
      description: 'Handle 10,000+ line invoices with virtualization',
      icon: <FileText className="h-8 w-8" />,
      path: '/invoices/create',
      status: 'enhanced',
      benefits: ['10,000+ lines', 'No freezing', 'Smooth scrolling']
    },
    {
      title: 'Interactive Import Queue',
      description: 'Fix import errors inline without re-uploading',
      icon: <Upload className="h-8 w-8" />,
      path: '/import',
      status: 'enhanced',
      benefits: ['Inline fixes', 'Add clinics on-the-fly', 'No re-uploads']
    }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laboratory Billing Features</h1>
            <p className="text-gray-500 mt-1">
              Specialized features for high-volume laboratory billing operations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full">
              <CheckCircle className="h-4 w-4 mr-1" />
              All Features Active
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600">Line Capacity</p>
            <p className="text-2xl font-bold text-blue-900">10,000+</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600">Location Support</p>
            <p className="text-2xl font-bold text-green-900">300+</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-600">Invoice Types</p>
            <p className="text-2xl font-bold text-purple-900">4</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm text-orange-600">Error Recovery</p>
            <p className="text-2xl font-bold text-orange-900">100%</p>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <div
            key={feature.path}
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(feature.path)}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${
                  feature.status === 'critical' ? 'bg-red-100 text-red-600' : 
                  feature.status === 'new' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {feature.icon}
                </div>
                {feature.status === 'critical' && (
                  <span className="inline-flex px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                    CRITICAL
                  </span>
                )}
                {feature.status === 'new' && (
                  <span className="inline-flex px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                    NEW
                  </span>
                )}
                {feature.status === 'enhanced' && (
                  <span className="inline-flex px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                    ENHANCED
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {feature.description}
              </p>

              <div className="space-y-1">
                {feature.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center text-xs text-gray-500">
                    <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                    {benefit}
                  </div>
                ))}
              </div>

              <button className="mt-4 w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                Open Feature
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <TrendingUp className="h-6 w-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              Laboratory Billing Transformation Complete
            </h3>
            <p className="text-sm text-blue-800 mb-3">
              The system has been upgraded from a generic billing platform to a specialized laboratory billing system capable of:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
              <li>Processing 10,000+ line invoices without performance issues</li>
              <li>Automatically separating invoice types to prevent payment delays</li>
              <li>Managing large healthcare systems with hundreds of locations</li>
              <li>Handling disputes with a complete ticketing workflow</li>
              <li>Preventing import failures with dynamic pricing fallbacks</li>
              <li>Fixing import errors inline without re-uploading files</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabBilling;