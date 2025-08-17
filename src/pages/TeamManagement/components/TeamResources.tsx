import React from 'react';
import {
  FolderOpen,
  FileText,
  Download,
  Upload,
  Book,
  Video,
  Calendar,
  Link,
  Plus
} from 'lucide-react';

const TeamResources: React.FC = () => {
  const documents = [
    { id: 1, name: 'Billing Procedures Manual', type: 'PDF', size: '2.4 MB', updated: '2 days ago', icon: FileText },
    { id: 2, name: 'CPT Code Reference Guide', type: 'XLSX', size: '1.8 MB', updated: '1 week ago', icon: Book },
    { id: 3, name: 'Insurance Guidelines', type: 'PDF', size: '3.2 MB', updated: '3 days ago', icon: FileText },
    { id: 4, name: 'Team Training Videos', type: 'Folder', size: '450 MB', updated: '1 month ago', icon: Video }
  ];

  const quickLinks = [
    { id: 1, name: 'Medicare Portal', url: 'https://medicare.gov', category: 'External' },
    { id: 2, name: 'CPT Code Lookup', url: '#', category: 'Internal' },
    { id: 3, name: 'Insurance Verification', url: '#', category: 'External' },
    { id: 4, name: 'Team Calendar', url: '#', category: 'Internal' }
  ];

  return (
    <div className="space-y-6">
      {/* Shared Documents */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FolderOpen className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Shared Documents</h3>
          </div>
          <button className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </button>
        </div>

        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center">
                <div className="p-2 bg-white rounded-lg mr-3">
                  <doc.icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                  <p className="text-xs text-gray-500">{doc.type} • {doc.size} • Updated {doc.updated}</p>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                <Download className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          ))}
        </div>

        <button className="w-full mt-4 text-sm text-blue-600 hover:text-blue-800">
          View All Documents
        </button>
      </div>

      {/* Knowledge Base */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Book className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Knowledge Base</h3>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-800">
            Add Article
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
            <h4 className="text-sm font-medium text-gray-900 mb-1">How to Process Medicare Claims</h4>
            <p className="text-xs text-gray-500">Step-by-step guide for Medicare billing</p>
          </div>
          <div className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
            <h4 className="text-sm font-medium text-gray-900 mb-1">Common CPT Code Errors</h4>
            <p className="text-xs text-gray-500">Avoid these common billing mistakes</p>
          </div>
          <div className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
            <h4 className="text-sm font-medium text-gray-900 mb-1">Payment Reconciliation Best Practices</h4>
            <p className="text-xs text-gray-500">Tips for accurate payment matching</p>
          </div>
          <div className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
            <h4 className="text-sm font-medium text-gray-900 mb-1">Lab Billing Workflow</h4>
            <p className="text-xs text-gray-500">Complete guide to lab test billing</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Link className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Quick Links</h3>
          </div>
          <button className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
            <Plus className="w-4 h-4 mr-1" />
            Add Link
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <p className="text-sm font-medium text-gray-900">{link.name}</p>
              <p className="text-xs text-gray-500 mt-1">{link.category}</p>
            </a>
          ))}
        </div>
      </div>

      {/* Team Calendar */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Calendar className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Team Calendar</h3>
        </div>
        <p className="text-sm text-gray-600">
          Upcoming team meetings, training sessions, and important deadlines will be displayed here.
        </p>
        <button className="mt-4 text-sm text-blue-600 hover:text-blue-800">
          View Full Calendar
        </button>
      </div>
    </div>
  );
};

export default TeamResources;