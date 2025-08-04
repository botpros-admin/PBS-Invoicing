import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  FileText,
  Edit,
  Trash2,
  Upload,
  X,
  FileUp,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Download,
  Clock,
  Loader2
} from 'lucide-react';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { Invoice, InvoiceStatus, FilterOptions, PaginatedResponse } from '../types';
import { format, differenceInDays } from 'date-fns';
import { getInvoices } from '../api/services/invoice.service';

const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Removed useState for invoices
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [agingFilter, setAgingFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Fetch invoices using React Query
  const { data, isLoading, isError, error } = useQuery<PaginatedResponse<Invoice>, Error>({
    queryKey: ['invoices'], // Unique key for this query
    queryFn: async () => {
      // Create a wrapper function that doesn't take any parameters to satisfy React Query
      return await getInvoices();
    }
  });
  
  // Extract the invoices array from the paginated response
  const invoices = data?.data || [];

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [importStats, setImportStats] = useState<{
    total: number;
    success: number;
    duplicates: number;
    errors: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const agingParam = queryParams.get('aging');

    if (agingParam) {
      setAgingFilter(agingParam);
    }
  }, [location.search]);

  // Calculate aging for each invoice
  const calculateAging = (invoice: Invoice): number => {
    const today = new Date();
    const dueDate = new Date(invoice.dateDue);
    return differenceInDays(today, dueDate);
  };

  // Filter invoices based on search term, status filter, and aging filter
  // Use useMemo to avoid re-filtering on every render unless dependencies change
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice: Invoice) => {
      const matchesSearch =
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    // Apply aging filter
    let matchesAging = true;
    if (agingFilter !== 'all') {
      const aging = calculateAging(invoice);

      switch (agingFilter) {
        case 'current':
          matchesAging = aging <= 0;
          break;
        case '1-30':
          matchesAging = aging > 0 && aging <= 30;
          break;
        case '31-60':
          matchesAging = aging > 30 && aging <= 60;
          break;
        case '61-90':
          matchesAging = aging > 60 && aging <= 90;
          break;
        case '90plus':
          matchesAging = aging > 90;
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesAging;
    });
  }, [invoices, searchTerm, statusFilter, agingFilter]); // Dependencies for useMemo

  // Paginate invoices
  const paginatedInvoices = useMemo(() => {
    return filteredInvoices.slice(
      (currentPage - 1) * rowsPerPage,
      currentPage * rowsPerPage
    );
  }, [filteredInvoices, currentPage, rowsPerPage]); // Dependencies for useMemo

  const totalPages = Math.ceil(filteredInvoices.length / rowsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, agingFilter, rowsPerPage]);

  const handleRowClick = (invoice: Invoice) => {
    navigate(`/invoices/${invoice.id}`);
  };

  const handleCreateInvoice = () => {
    navigate('/invoices/create'); // Corrected path
  };

  const handleImportData = () => {
    setIsImportModalOpen(true);
  };
  const handleDeleteInvoice = () => {
    if (selectedInvoice) {
      // TODO: Replace with useMutation call to delete invoice via API
      // For now, just filter local state (which won't persist after refetch)
      // setInvoices(invoices.filter(invoice => invoice.id !== selectedInvoice.id));
      console.warn("Delete functionality needs API integration.");
      setIsDeleteModalOpen(false);
      setSelectedInvoice(null);
    }
  };

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
  };

  // Import modal functions
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  // Helper function to safely get client name from preview data
  const getClientName = (row: any): string => {
    if (!row || !row.client) return '';
    return typeof row.client === 'string' ? row.client : row.client.name || '';
  };

  // Helper function to check if client data is missing
  const isClientDataMissing = (row: any): boolean => {
    return !row.client || (typeof row.client === 'object' && !row.client.name);
  };
  
  // Render client cell content based on row data
// Define a type for the preview data row
interface PreviewRow {
  id: number;
  invoiceNumber: string;
  client?: { name?: string } | string;
  patient: string;
  accessionNumber: string;
  cptCode: string;
  description: string;
  dateOfService: string;
  amount: number;
  status: string;
}

const renderClientCell = (row: PreviewRow) => {
  // Check if client is undefined first
  if (!row.client) {
    if (row.status === 'error') {
      return (
        <input
          type="text"
          placeholder="Enter client"
          className="border-red-300 focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-red-300 rounded-md"
        />
      );
    }
    return '';
  }
  
  // Handle string client
  if (typeof row.client === 'string') {
    return row.client;
  }
  
  // Handle object client with optional name
  const clientName = row.client.name || '';
  
  // Show input for error rows with missing client name
  if (row.status === 'error' && !clientName) {
    return (
      <input
        type="text"
        placeholder="Enter client"
        className="border-red-300 focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-red-300 rounded-md"
      />
    );
  }
  
  return clientName;
};

  const handleFile = (file: File) => {
    // Check if file is CSV or Excel
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a CSV or Excel file');
      return;
    }

    setFile(file);

    // In a real app, you would parse the file here.
    // For this demo, we'll simulate parsing with mock data.
    setTimeout(() => {
      const mockData = [
        {
          id: 1,
          invoiceNumber: 'INV-2023-1001',
          client: { name: 'Memorial Hospital' },
          patient: 'John Smith',
          accessionNumber: 'ACC-2001',
          cptCode: '85025',
          description: 'Complete Blood Count (CBC)',
          dateOfService: '2023-01-10',
          amount: 45.0,
          status: 'valid'
        },
        {
          id: 2,
          invoiceNumber: 'INV-2023-1002',
          client: { name: 'City Medical Center' },
          patient: 'Jane Doe',
          accessionNumber: 'ACC-2002',
          cptCode: '80053',
          description: 'Comprehensive Metabolic Panel',
          dateOfService: '2023-01-11',
          amount: 58.0,
          status: 'duplicate'
        },
        {
          id: 3,
          invoiceNumber: 'INV-2023-1003',
          client: { name: '' },
          patient: 'Bob Johnson',
          accessionNumber: 'ACC-2003',
          cptCode: '80061',
          description: 'Lipid Panel',
          dateOfService: '2023-01-12',
          amount: 42.0,
          status: 'error'
        },
        {
          id: 4,
          invoiceNumber: 'INV-2023-1004',
          client: { name: 'Riverside Clinic' },
          patient: 'Alice Brown',
          accessionNumber: 'ACC-2004',
          cptCode: '84443',
          description: 'Thyroid Stimulating Hormone (TSH)',
          dateOfService: '2023-01-13',
          amount: 0,
          status: 'error'
        },
        {
          id: 5,
          invoiceNumber: 'INV-2023-1005',
          client: { name: 'Valley Health Partners' },
          patient: 'Charlie Wilson',
          accessionNumber: 'ACC-2005',
          cptCode: '83036',
          description: 'Hemoglobin A1C',
          dateOfService: '2023-01-14',
          amount: 38.0,
          status: 'valid'
        }
      ];

      setPreviewData(mockData);

      // Set mock errors
      setErrors({
        'row-3': ['Missing client information'],
        'row-4': ['Price cannot be zero']
      });
    }, 1000);
  };

  const handleProcessFile = () => {
    setIsProcessing(true);

    // Simulate processing delay
    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);
      setImportStats({
        total: previewData.length,
        success: previewData.filter(row => row.status === 'valid').length,
        duplicates: previewData.filter(row => row.status === 'duplicate').length,
        errors: previewData.filter(row => row.status === 'error').length
      });
    }, 2000);
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData([]);
    setErrors({});
    setIsComplete(false);
    setImportStats(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getRowStatusClass = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-50';
      case 'duplicate':
        return 'bg-yellow-50';
      case 'error':
        return 'bg-red-50';
      default:
        return '';
    }
  };

  const getRowStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'duplicate':
        return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'error':
        return <X size={16} className="text-red-500" />;
      default:
        return null;
    }
  };

  // Updated columns with display and sortValue for all sortable columns
  const columns = [
    {
      header: 'Invoice #',
      accessor: (row: Invoice) => ({
        display: row.invoiceNumber,
        sortValue: row.invoiceNumber.toLowerCase(),
      }),
      sortable: true,
    },
    {
      header: 'Client',
      accessor: (row: Invoice) => ({
        display: row.client?.name || '',
        sortValue: (row.client?.name || '').toLowerCase(),
      }),
      sortable: true,
    },
    {
      header: 'Date',
      accessor: (row: Invoice) => ({
        display: format(new Date(row.dateCreated), 'MMM d, yyyy'),
        sortValue: new Date(row.dateCreated).getTime(),
      }),
      sortable: true,
    },
    {
      header: 'Due Date',
      accessor: (row: Invoice) => ({
        display: format(new Date(row.dateDue), 'MMM d, yyyy'),
        sortValue: new Date(row.dateDue).getTime(),
      }),
      sortable: true,
    },
    {
      header: 'Amount',
      accessor: (row: Invoice) => ({
        display: `$${row.total.toFixed(2)}`,
        sortValue: row.total,
      }),
      sortable: true,
      className: 'text-right',
    },
    {
      header: 'Balance',
      accessor: (row: Invoice) => ({
        display: `$${row.balance.toFixed(2)}`,
        sortValue: row.balance,
      }),
      sortable: true,
      className: 'text-right',
    },
    {
      header: 'Status',
      accessor: (row: Invoice) => ({
        display: <StatusBadge status={row.status} />,
        sortValue: row.status,
      }),
      sortable: true,
    },
    {
      header: 'Aging',
      accessor: (row: Invoice) => {
        const aging = calculateAging(row); // Corrected parameter name
        let colorClass = 'text-gray-500';
        if (aging > 90) colorClass = 'text-red-600 font-medium';
        else if (aging > 60) colorClass = 'text-orange-500';
        else if (aging > 30) colorClass = 'text-yellow-500';
        else if (aging <= 0) colorClass = 'text-green-500';
        return {
          display: <span className={colorClass}>{aging > 0 ? `${aging} days` : 'Current'}</span>,
          sortValue: aging,
        };
      },
      sortable: true,
    },
  ];

  const renderActions = (invoice: Invoice) => (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <div className="dropdown inline-block relative group"> {/* Added group class */}
        <button className="text-gray-500 hover:text-gray-700">
          <MoreHorizontal size={20} />
        </button>
        <div className="dropdown-menu absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
          <button
            onClick={() => navigate(`/invoices/${invoice.id}`)}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <FileText size={16} className="mr-2 text-blue-500" />
            View Details
          </button>
          <button
            onClick={() => navigate(`/create-invoice?edit=${invoice.id}`)}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <Edit size={16} className="mr-2 text-[#0078D7]" />
            Edit Invoice
          </button>
          <button
            onClick={() => {
              setSelectedInvoice(invoice);
              setIsDeleteModalOpen(true);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
          >
            <Trash2 size={16} className="mr-2" />
            Delete Invoice
          </button>
        </div>
      </div>
    </div>
  );

  // Get aging filter label for display
  const getAgingFilterLabel = () => {
    switch (agingFilter) {
      case 'current':
        return 'Current';
      case '1-30':
        return '1-30 Days';
      case '31-60':
        return '31-60 Days';
      case '61-90':
        return '61-90 Days';
      case '90plus':
        return '90+ Days';
      default:
        return 'All Aging Periods';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleImportData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0078D7]"
          >
            <Upload size={16} className="mr-2" />
            Import Data
          </button>
          <button
            onClick={handleCreateInvoice}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0078D7] hover:bg-[#0078D7] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0078D7]"
          >
            <Plus size={16} className="mr-2" />
            Create Invoice
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:items-center sm:justify-between">
          <div className="relative rounded-md w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#0078D7] focus:border-[#0078D7] sm:text-sm"
            />
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter size={18} className="text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
                className="block w-full pl-10 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#0078D7] focus:border-[#0078D7] sm:text-sm rounded-md"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="partial">Partially Paid</option>
                <option value="paid">Paid in Full</option>
                <option value="dispute">In Dispute</option>
                <option value="overdue">Overdue</option>
                <option value="write_off">Write Off</option>
                <option value="exhausted">Exhausted</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Clock size={18} className="text-gray-400" />
              </div>
              <select
                value={agingFilter}
                onChange={(e) => setAgingFilter(e.target.value)}
                className="block w-full pl-10 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#0078D7] focus:border-[#0078D7] sm:text-sm rounded-md"
              >
                <option value="all">All Aging Periods</option>
                <option value="current">Current</option>
                <option value="1-30">1-30 Days</option>
                <option value="31-60">31-60 Days</option>
                <option value="61-90">61-90 Days</option>
                <option value="90plus">90+ Days</option>
              </select>
            </div>
          </div>
        </div>

        {agingFilter !== 'all' && (
          <div className="p-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <div className="flex items-center">
              <Clock size={16} className="text-blue-500 mr-2" />
              <span className="text-sm text-blue-700">
                Showing invoices in aging period: <strong>{getAgingFilterLabel()}</strong>
              </span>
            </div>
            <button
              onClick={() => setAgingFilter('all')}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
            >
              <X size={14} className="mr-1" />
              Clear Filter
            </button>
          </div>
        )}

        {/* Loading and Error States */}
        {isLoading && (
          <div className="flex justify-center items-center p-10">
            <Loader2 size={32} className="animate-spin text-[#0078D7]" />
            <span className="ml-3 text-gray-500">Loading invoices...</span>
          </div>
        )}
        {isError && (
          <div className="flex justify-center items-center p-10 bg-red-50 border border-red-200 rounded-md">
            <AlertTriangle size={32} className="text-red-500" />
            <span className="ml-3 text-red-700">Error loading invoices: {error?.message}</span>
          </div>
        )}
        {!isLoading && !isError && (
          <DataTable
            columns={columns}
            data={paginatedInvoices} // Use paginated data from useMemo
            keyField="id"
            onRowClick={handleRowClick}
            actions={renderActions}
            pagination={{
              currentPage,
              totalPages,
              onPageChange: setCurrentPage,
            }}
            sortable={true}
            initialSortField="dateCreated"
            initialSortDirection="desc"
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Invoice"
        size="sm"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0078D7]"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteInvoice}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-500">
          Are you sure you want to delete invoice{' '}
          <span className="font-medium text-gray-900">
            {selectedInvoice?.invoiceNumber}
          </span>
          ? This action cannot be undone.
        </p>
      </Modal>

      {/* Import Data Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => !isProcessing && setIsImportModalOpen(false)}
        title="Import Invoice Data" // Changed title to string
        size="xl"
        footer={
          <div className="flex justify-between">
            {file && (
              <button
                onClick={handleReset}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0078D7]"
                disabled={isProcessing}
              >
                Reset
              </button>
            )}

            <div>
              <button
                onClick={() => !isProcessing && setIsImportModalOpen(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0078D7] mr-3"
                disabled={isProcessing}
              >
                Cancel
              </button>

              {file && previewData.length > 0 && !isComplete && (
                <button
                  onClick={handleProcessFile}
                  disabled={isProcessing}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0078D7] hover:bg-[#0078D7] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0078D7]"
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      Process File
                    </>
                  )}
                </button>
              )}

              {isComplete && (
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <FileUp size={16} className="mr-2" />
                  Done
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center ${
                isDragging ? 'border-[#0078D7] bg-[#0078D7]' : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-3 bg-[#0078D7] rounded-full">
                  <Upload size={24} className="text-[#0078D7]" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Drag and drop your file here
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    or <button onClick={() => fileInputRef.current?.click()} className="text-[#0078D7] hover:text-[#0078D7] font-medium">browse</button> to select a file
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Supported formats: CSV, Excel (.xls, .xlsx)
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInput}
                  accept=".csv,.xls,.xlsx"
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {isComplete ? (
                <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-medium text-gray-900">Import Results</h2>
                      <div className="flex items-center space-x-2">
                        <FileText size={20} className="text-gray-400" />
                        <span className="text-sm text-gray-500">{file.name}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-gray-50 p-4 rounded-md">
                        <p className="text-sm text-gray-500">Total Records</p>
                        <p className="text-xl font-medium">{importStats?.total}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-md">
                        <p className="text-sm text-green-500">Successfully Imported</p>
                        <p className="text-xl font-medium">{importStats?.success}</p>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-md">
                        <p className="text-sm text-yellow-500">Duplicates</p>
                        <p className="text-xl font-medium">{importStats?.duplicates}</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-md">
                        <p className="text-sm text-red-500">Errors</p>
                        <p className="text-xl font-medium">{importStats?.errors}</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-md font-medium text-gray-900 mb-4">Next Steps</h3>
                      <div className="space-y-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <CheckCircle size={20} className="text-green-500" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-gray-700">
                              {importStats?.success} records have been successfully imported into the system.
                            </p>
                          </div>
                        </div>

                        {importStats?.duplicates ? (
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <AlertTriangle size={20} className="text-yellow-500" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-gray-700">
                                {importStats.duplicates} duplicate records were found and skipped.
                              </p>
                            </div>
                          </div>
                        ) : null}

                        {importStats?.errors ? (
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <X size={20} className="text-red-500" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-gray-700">
                                {importStats.errors} records had errors and were not imported.
                              </p>
                              <button className="mt-2 inline-flex items-center text-sm text-[#0078D7] hover:text-[#0078D7]">
                                <Download size={14} className="mr-1" />
                                Download error report
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">File Preview</h3>
                    <div className="flex items-center space-x-2">
                      <FileText size={18} className="text-gray-400" />
                      <span className="text-sm text-gray-500">{file.name}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoice #
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Client
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Patient
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previewData.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                              <div className="flex justify-center">
                                <svg className="animate-spin h-5 w-5 text-[#0078D7]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              </div>
                              <p className="mt-2">Parsing file...</p>
                            </td>
                          </tr>
                        ) : (
                          previewData.map((row) => (
                            <tr key={row.id} className={getRowStatusClass(row.status)}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {getRowStatusIcon(row.status)}
                                  <span className="ml-2 text-xs font-medium capitalize">
                                    {row.status}
                                  </span>
                                </div>
                                {errors[`row-${row.id}`] && (
                                  <div className="mt-1 text-xs text-red-500">
                                    {errors[`row-${row.id}`].map((error, i) => (
                                      <div key={i}>{error}</div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.invoiceNumber}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {renderClientCell(row)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.patient}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                {row.status === 'error' && row.amount === 0 ? (
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="border-red-300 focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-red-300 rounded-md"
                                  />
                                ) : (
                                  `$${row.amount.toFixed(2)}`
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <div className="h-3 w-3 bg-green-100 rounded-full mr-2"></div>
                        <span className="text-xs text-gray-500">Valid</span>
                      </div>
                      <div className="flex items-center">
                        <div className="h-3 w-3 bg-yellow-100 rounded-full mr-2"></div>
                        <span className="text-xs text-gray-500">Duplicate</span>
                      </div>
                      <div className="flex items-center">
                        <div className="h-3 w-3 bg-red-100 rounded-full mr-2"></div>
                        <span className="text-xs text-gray-500">Error</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const detailsElement = document.getElementById('import-details');
                        if (detailsElement) {
                          detailsElement.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="text-xs text-[#0078D7] hover:text-[#0078D7] flex items-center"
                    >
                      View all columns
                      <ChevronRight size={14} className="ml-1" />
                    </button>
                  </div>

                  {/* Detailed view */}
                  <div id="import-details" className="mt-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">All Columns</h3>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Invoice #
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Client
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Patient
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Accession #
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              CPT Code
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date of Service
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {previewData.map((row) => (
                            <tr key={`detail-${row.id}`} className={getRowStatusClass(row.status)}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.invoiceNumber}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {renderClientCell(row)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.patient}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.accessionNumber}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.cptCode}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.description}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.dateOfService}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                {row.status === 'error' && row.amount === 0 ? (
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="border-red-300 focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-red-300 rounded-md"
                                  />
                                ) : (
                                  `$${row.amount.toFixed(2)}`
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Invoices;
