import React, { useState } from 'react';
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

// Mock data for a single invoice with multiple patients
const mockInvoice: Invoice = {
  id: 'inv-001',
  invoiceNumber: 'INV-2023-1001',
  client: {
    id: 'client-1',
    name: 'Memorial Hospital',
    clinic: 'Main Campus',
  },
  dateCreated: new Date(2023, 0, 15).toISOString(),
  dateDue: new Date(2023, 1, 15).toISOString(),
  status: 'partial',
  items: [
    { id: 'item-1', patientId: 'p-1', description: 'CBC', cptCode: '85025', dateOfService: '2023-01-10', total: 45.00 },
    { id: 'item-2', patientId: 'p-1', description: 'CMP', cptCode: '80053', dateOfService: '2023-01-10', total: 58.00, isDisputed: true },
    { id: 'item-3', patientId: 'p-2', description: 'Lipid Panel', cptCode: '80061', dateOfService: '2023-01-11', total: 42.00 },
  ],
  subtotal: 145.00,
  total: 145.00,
  amountPaid: 45.00,
  balance: 100.00,
};

const mockPatients: Patient[] = [
    { id: 'p-1', first_name: 'John', last_name: 'Smith' },
    { id: 'p-2', first_name: 'Jane', last_name: 'Doe' },
];

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InvoiceItem | null>(null);

  const invoice = mockInvoice;
  const patients = mockPatients;

  const getPatientName = (patientId: ID) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient';
  };

  const itemsByPatient = invoice.items.reduce((acc, item) => {
    const patientId = item.patientId;
    if (!acc[patientId]) {
      acc[patientId] = [];
    }
    acc[patientId].push(item);
    return acc;
  }, {} as Record<ID, InvoiceItem[]>);

  // ... (other handlers)

  return (
    <div className="space-y-6">
      {/* ... (header) */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* ... (tabs) */}
        <div className="p-6">
          {activeTab === 'details' && (
            <div className="space-y-8">
              {/* ... (client info) */}
              {Object.entries(itemsByPatient).map(([patientId, items]) => (
                <div key={patientId} className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <User size={18} className="mr-2 text-gray-500" />
                    {getPatientName(patientId)}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      {/* ... (table head) */}
                      <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item) => (
                          <tr key={item.id} className={item.isDisputed ? 'bg-yellow-50' : ''}>
                            {/* ... (table cells) */}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* ... (other tabs) */}
        </div>
      </div>
      {/* ... (modal) */}
    </div>
  );
};

export default InvoiceDetail;
