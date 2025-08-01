import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Download,
  Mail,
  Edit,
  Clock,
  // CheckCircle, // Removed unused import
  AlertTriangle,
  FileText,
  CreditCard,
  User,
  Building,
  Calendar,
  DollarSign
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { Invoice, Payment } from '../types'; // Removed unused InvoiceStatus import
import { format } from 'date-fns';

// Mock data for a single invoice
const mockInvoice: Invoice = {
  id: 'inv-001',
  invoiceNumber: 'INV-2023-1001',
  client: {
    id: 'client-1',
    name: 'Memorial Hospital',
    clinic: 'Main Campus', // Renamed property
  },
  patient: {
    id: 'patient-1',
    name: 'John Smith',
    dob: new Date(1980, 0, 1).toISOString(),
    accessionNumber: 'ACC-2001',
  },
  dateCreated: new Date(2023, 0, 15).toISOString(),
  dateDue: new Date(2023, 1, 15).toISOString(),
  status: 'partial',
  items: [
    {
      id: 'item-1',
      description: 'Complete Blood Count (CBC)',
      cptCode: '85025',
      dateOfService: new Date(2023, 0, 10).toISOString(),
      quantity: 1,
      unitPrice: 45.00,
      total: 45.00,
    },
    {
      id: 'item-2',
      description: 'Comprehensive Metabolic Panel',
      cptCode: '80053',
      dateOfService: new Date(2023, 0, 10).toISOString(),
      quantity: 1,
      unitPrice: 58.00,
      total: 58.00,
      disputed: true,
    },
    {
      id: 'item-3',
      description: 'Lipid Panel',
      cptCode: '80061',
      dateOfService: new Date(2023, 0, 10).toISOString(),
      quantity: 1,
      unitPrice: 42.00,
      total: 42.00,
    },
  ],
  subtotal: 145.00,
  total: 145.00,
  amountPaid: 45.00,
  balance: 100.00,
};

// Mock data for payments
const mockPayments: Payment[] = [
  {
    id: 'payment-1',
    invoiceId: 'inv-001',
    date: new Date(2023, 0, 20).toISOString(),
    amount: 45.00,
    method: 'credit_card',
    reference: '1234',
    notes: 'Partial payment',
  },
];

// Mock data for history events
const mockHistory = [
  {
    id: 'event-1',
    date: new Date(2023, 0, 15).toISOString(),
    type: 'created',
    description: 'Invoice created',
    user: 'John Doe',
  },
  {
    id: 'event-2',
    date: new Date(2023, 0, 16).toISOString(),
    type: 'sent',
    description: 'Invoice sent to client',
    user: 'John Doe',
  },
  {
    id: 'event-3',
    date: new Date(2023, 0, 20).toISOString(),
    type: 'payment',
    description: 'Partial payment received: $45.00',
    user: 'System',
  },
  {
    id: 'event-4',
    date: new Date(2023, 0, 25).toISOString(),
    type: 'dispute',
    description: 'Item "Comprehensive Metabolic Panel" disputed: Medical Necessity',
    user: 'Jane Smith',
  },
];

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');

  // In a real app, fetch the invoice data based on the ID
  const invoice = mockInvoice;
  const payments = mockPayments;
  const history = mockHistory;

  if (!invoice) {
    return <div>Loading...</div>;
  }

  const handleBack = () => {
    navigate('/invoices');
  };

  const handleEdit = () => {
    navigate(`/create-invoice?edit=${id}`);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <FileText size={16} className="text-blue-500" />;
      case 'sent':
        return <Mail size={16} className="text-indigo-500" />;
      case 'payment':
        return <CreditCard size={16} className="text-green-500" />;
      case 'dispute':
        return <AlertTriangle size={16} className="text-yellow-500" />;
      default:
        return <Clock size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoice {invoice.invoiceNumber}</h1>
            <div className="flex items-center mt-1">
              <StatusBadge status={invoice.status} />
              <span className="ml-2 text-sm text-gray-500">
                Created on {format(new Date(invoice.dateCreated), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none">
            <Printer size={20} />
          </button>
          <button className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none">
            <Download size={20} />
          </button>
          <button className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none">
            <Mail size={20} />
          </button>
          <button
            onClick={handleEdit}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Edit size={16} className="mr-2" />
            Edit Invoice
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'details'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Invoice Details
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'payments'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'history'
                  ? 'border-indigo-500 text-indigo-600'
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Building size={18} className="mr-2 text-gray-500" />
                    Client Information
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="font-medium">{invoice.client.name}</p>
                    <p className="text-sm text-gray-500">{invoice.client.clinic}</p> {/* Renamed property */}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <User size={18} className="mr-2 text-gray-500" />
                    Patient Information
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="font-medium">{invoice.patient.name}</p>
                    <p className="text-sm text-gray-500">
                      DOB: {format(new Date(invoice.patient.dob), 'MMM d, yyyy')}
                    </p>
                    {invoice.patient.accessionNumber && (
                      <p className="text-sm text-gray-500">
                        Accession #: {invoice.patient.accessionNumber}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Calendar size={18} className="mr-2 text-gray-500" />
                    Invoice Details
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          CPT Code
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date of Service
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoice.items.map((item) => (
                        <tr key={item.id} className={item.disputed ? 'bg-red-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex items-center">
                              {item.disputed && (
                                <AlertTriangle size={16} className="text-red-500 mr-2" />
                              )}
                              {item.description}
                              {item.disputed && (
                                <span className="ml-2 text-xs text-red-500 font-normal">
                                  (Disputed)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.cptCode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(item.dateOfService), 'MMM d, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            ${item.unitPrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            ${item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={5} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                          Subtotal
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                          ${invoice.subtotal.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                          Total
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                          ${invoice.total.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                          Amount Paid
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-medium text-green-600">
                          ${invoice.amountPaid.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                          Balance Due
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                          ${invoice.balance.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Download PDF
                </button>
                <button className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Send to Client
                </button>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
                <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  <DollarSign size={16} className="mr-2" />
                  Record Payment
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-md grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-lg font-medium">${invoice.total.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount Paid</p>
                  <p className="text-lg font-medium text-green-600">${invoice.amountPaid.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Balance Due</p>
                  <p className="text-lg font-medium">${invoice.balance.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <StatusBadge status={invoice.status} className="mt-1" />
                </div>
              </div>

              {payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payments recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Method
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reference
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(payment.date), 'MMM d, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${payment.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.method === 'credit_card' ? 'Credit Card' :
                             payment.method === 'check' ? 'Check' :
                             payment.method === 'ach' ? 'ACH Transfer' : 'Other'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.reference || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Invoice History</h3>

              <div className="flow-root">
                <ul className="-mb-8">
                  {history.map((event, eventIdx) => (
                    <li key={event.id}>
                      <div className="relative pb-8">
                        {eventIdx !== history.length - 1 ? (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          ></span>
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white bg-gray-100">
                              {getEventIcon(event.type)}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                {event.description}{' '}
                                <span className="font-medium text-gray-900">
                                  by {event.user}
                                </span>
                              </p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {format(new Date(event.date), 'MMM d, yyyy h:mm a')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
