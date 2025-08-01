import React, { useState } from 'react';
import { Save, Eye, Download, X } from 'lucide-react'; // Removed unused FileText, Edit2
import Modal from '../Modal';
import { TwoPageInvoicePreview } from './TwoPageInvoicePreview';

const InvoiceParameters: React.FC = () => {
  const [activeSection, setActiveSection] = useState('layout');
  const [showPreview, setShowPreview] = useState(false);
  const [settings, setSettings] = useState({ // Restore state variable
    layout: {
      showLogo: true,
      logoPosition: 'top-left',
      headerStyle: 'modern',
      footerStyle: 'simple',
    },
    content: {
      invoiceTitle: 'INVOICE',
      companyName: 'Laboratory Name',
      companyAddress: 'Address Line 1\nAddress Line 2\nCity, State Zip',
      companyEmail: 'email@example.com',
      companyPhone: '(555) 555-5555',
      customMessage: 'Thank you for your business',
    },
    styling: {
      primaryColor: '#0078D7',
      highlightColor: 'rgb(207, 240, 253)',
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '14px',
    },
    sections: {
      showInvoiceInfo: true,
      showPaymentInfo: true,
      showContactInfo: true,
    },
  }); // Restore state variable

  const handleSaveSettings = () => {
    alert('Invoice settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Invoice Parameters</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowPreview(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary" // Changed focus color
          >
            <Eye size={16} className="mr-2" />
            Preview
          </button>
          <button
            onClick={handleSaveSettings}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary" // Changed color
          >
            <Save size={16} className="mr-2" />
            Save Changes
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* tab nav */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveSection('layout')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeSection === 'layout'
                  ? 'border-secondary text-secondary' // Changed color
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Layout
            </button>
            <button
              onClick={() => setActiveSection('content')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeSection === 'content'
                  ? 'border-secondary text-secondary' // Changed color
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Content
            </button>
            <button
              onClick={() => setActiveSection('styling')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeSection === 'styling'
                  ? 'border-secondary text-secondary' // Changed color
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Styling
            </button>
            <button
              onClick={() => setActiveSection('sections')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeSection === 'sections'
                  ? 'border-secondary text-secondary' // Changed color
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sections
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* your existing tab logic – unchanged */}
          {activeSection === 'layout' && (
            <div className="space-y-6">
              {/* ... your layout settings code ... */}
            </div>
          )}
          {activeSection === 'content' && (
            <div className="space-y-6">
              {/* ... your content settings code ... */}
            </div>
          )}
          {activeSection === 'styling' && (
            <div className="space-y-6">
              {/* ... your styling settings code ... */}
            </div>
          )}
          {activeSection === 'sections' && (
            <div className="space-y-6">
              {/* ... your sections code ... */}
            </div>
          )}
        </div>
      </div>

      {/* PREVIEW MODAL */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Invoice Preview"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowPreview(false)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary" // Changed focus color
            >
              <X size={16} className="mr-2" />
              Close
            </button>
            <button
              onClick={() => { /* handle PDF export or printing here */ }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary" // Changed color
            >
              <Download size={16} className="mr-2" />
              Download PDF
            </button>
          </div>

          {/* Replaced the overflow-auto and max-h to ensure no scaling occurs */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <TwoPageInvoicePreview />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InvoiceParameters;
