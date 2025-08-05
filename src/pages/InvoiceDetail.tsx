import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Download,
  Mail,
  Edit,
  Clock,
  AlertTriangle,
  FileText,
  CreditCard,
  User,
  Building,
  Calendar,
  DollarSign,
  ShieldAlert
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { Invoice, Payment, InvoiceItem, Patient } from '../types';
import { format } from 'date-fns';
import Modal from '../components/Modal';
import { getInvoiceById } from '../api/services/invoice.service';
import { useQuery } from '@tanstack/react-query';

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InvoiceItem | null>(null);

  // Fetch invoice data
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoiceById(id!),
    enabled: !!id,
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading invoice details...</div>
      </div>
    );
  }

  // Show error state
  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard/invoices')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Invoices
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="text-red-500 mr-2" size={20} />
            <p className="text-red-700">
              Error loading invoice details. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Group items by patient ID
  const itemsByPatient = invoice.items?.reduce((acc, item) => {
    const patientId = item.patientId || 'unknown';
    if (!acc[patientId]) {
      acc[patientId] = [];
    }
    acc[patientId].push(item);
    return acc;
  }, {} as Record<string, InvoiceItem[]>) || {};

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // TODO: Implement PDF download
    console.log('Download PDF');
  };

  const handleEmail = () => {
    // TODO: Implement email functionality
    console.log('Send email');
  };

  const handleEdit = () => {
    navigate(`/dashboard/invoices/edit/${id}`);
  };

  const handleDisputeItem = (item: InvoiceItem) => {
    setSelectedItem(item);
    setIsDisputeModalOpen(true);
  };

  const handleDisputeSubmit = () => {
    // TODO: Implement dispute submission
    console.log('Submit dispute for item:', selectedItem);
    setIsDisputeModalOpen(false);
    setSelectedItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard/invoices')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Invoices
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
            title="Print Invoice"
          >
            <Printer size={20} />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
            title="Download PDF"
          >
            <Download size={20} />
          </button>
          <button
            onClick={handleEmail}
            className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
            title="Email Invoice"
          >
            <Mail size={20} />
          </button>
          <button
            onClick={handleEdit}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Edit size={16} className="mr-2" />
            Edit Invoice
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Invoice Details
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payments'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              History
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'details' && (
            <div className="space-y-8">
              {/* Client Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Client Information</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Client</dt>
                      <dd className="text-sm text-gray-900">{invoice.client?.name || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Clinic</dt>
                      <dd className="text-sm text-gray-900">{invoice.clinic?.name || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Information</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Date Created</dt>
                      <dd className="text-sm text-gray-900">
                        {format(new Date(invoice.dateCreated), 'MMM dd, yyyy')}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                      <dd className="text-sm text-gray-900">
                        {format(new Date(invoice.dateDue), 'MMM dd, yyyy')}
                      </dd>
                    </div>
                    {invoice.invoiceType && (
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Type</dt>
                        <dd className="text-sm text-gray-900">{invoice.invoiceType}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {/* Invoice Items by Patient */}
              {Object.entries(itemsByPatient).map(([patientId, items]) => (
                <div key={patientId} className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <User size={18} className="mr-2 text-gray-500" />
                    Patient ID: {patientId}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Service Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            CPT Code
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Qty
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item) => (
                          <tr key={item.id} className={item.isDisputed ? 'bg-yellow-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {format(new Date(item.dateOfService), 'MM/dd/yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.cptCode}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div>
                                {item.descriptionOverride || item.description}
                                {item.isDisputed && (
                                  <div className="flex items-center mt-1 text-yellow-600">
                                    <ShieldAlert size={14} className="mr-1" />
                                    <span className="text-xs">Disputed: {item.disputeReason}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${item.unitPrice.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ${item.total.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {!item.isDisputed && (
                                <button
                                  onClick={() => handleDisputeItem(item)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  Dispute
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="mt-8 bg-gray-50 rounded-lg p-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-500">Subtotal</span>
                    <span className="text-gray-900">${invoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-500">Total</span>
                    <span className="text-gray-900">${invoice.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-500">Amount Paid</span>
                    <span className="text-gray-900">${invoice.amountPaid.toFixed(2)}</span>
                  </div>
                  {invoice.writeOffAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-500">Write-off</span>
                      <span className="text-gray-900">-${invoice.writeOffAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between">
                      <span className="text-base font-medium text-gray-900">Balance Due</span>
                      <span className="text-base font-medium text-gray-900">
                        ${invoice.balance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <CreditCard size={48} className="mx-auto mb-4 text-gray-400" />
                <p>No payments recorded yet</p>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <Clock size={48} className="mx-auto mb-4 text-gray-400" />
                <p>No history available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dispute Modal */}
      <Modal
        isOpen={isDisputeModalOpen}
        onClose={() => {
          setIsDisputeModalOpen(false);
          setSelectedItem(null);
        }}
        title="Dispute Item"
      >
        <div className="space-y-4">
          {selectedItem && (
            <>
              <div>
                <p className="text-sm text-gray-500">Item</p>
                <p className="font-medium">{selectedItem.description}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reason for Dispute
                </label>
                <textarea
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  rows={4}
                  placeholder="Please provide details about why this item is being disputed..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsDisputeModalOpen(false);
                    setSelectedItem(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisputeSubmit}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                >
                  Submit Dispute
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default InvoiceDetail;