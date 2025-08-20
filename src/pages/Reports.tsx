import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Building,
  BarChart2,
  PieChart,
  TrendingUp,
  FileText
  // AlertTriangle // Removed unused import
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import Modal from '../components/Modal';
import { format } from 'date-fns';
import { AgingBucket } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  getAgingReport, 
  getStatusDistribution, 
  getClientPerformance, 
  getTopCptCodes,
  getMonthlyTrends,
  parseDateRange,
  DateRangeOption,
  ClientPerformance,
  CptCodeData,
  MonthlyTrend
} from '../api/services/report.service';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('aging');
  const [dateRange, setDateRange] = useState('30days');
  const [customDateFrom, setCustomDateFrom] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [customDateTo, setCustomDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedClinics, setSelectedClinics] = useState<string[]>([]); // Renamed state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClientDetailModal, setShowClientDetailModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  // const [currentPage, setCurrentPage] = useState(1); // Removed unused state
  // const [rowsPerPage, setRowsPerPage] = useState(10); // Removed unused state

  // Create data state for each report section
  const [agingData, setAgingData] = useState<AgingBucket[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [clientData, setClientData] = useState<ClientPerformance[]>([]);
  const [cptData, setCptData] = useState<CptCodeData[]>([]);
  const [trendData, setTrendData] = useState<MonthlyTrend[]>([]);

  // Convert date range selection to actual filter dates
  const dateFilter = useMemo(() => {
    return parseDateRange(
      dateRange as DateRangeOption, 
      customDateFrom, 
      customDateTo
    );
  }, [dateRange, customDateFrom, customDateTo]);

  // Fetch report data based on filters
  useEffect(() => {
    const fetchReportData = async () => {
      setIsLoading(true);
      setError(null); // Clear previous errors
      try {
        // Fetch data for the active tab only to improve performance
        switch (activeTab) {
          case 'aging':
            const agingResult = await getAgingReport(dateFilter);
            setAgingData(agingResult);
            break;
          case 'status':
            const statusResult = await getStatusDistribution(dateFilter);
            setStatusData(statusResult);
            break;
          case 'clients':
            const clientResult = await getClientPerformance(dateFilter);
            setClientData(clientResult);
            break;
          case 'cpt':
            const cptResult = await getTopCptCodes(dateFilter, 10);
            setCptData(cptResult);
            break;
          case 'trends':
            const trendResult = await getMonthlyTrends(dateFilter);
            setTrendData(trendResult);
            break;
        }
      } catch (error: any) {
        setError(error?.message || `Error loading ${activeTab} data. Please try again.`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, [activeTab, dateFilter, selectedClinics]);

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDateRange(e.target.value);

    // Set custom date range based on selection
    const now = new Date();
    let fromDate = new Date();

    switch (e.target.value) {
      case '7days':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'ytd':
        fromDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        // Don't change the custom dates
        return;
    }

    setCustomDateFrom(format(fromDate, 'yyyy-MM-dd'));
    setCustomDateTo(format(now, 'yyyy-MM-dd'));
  };

  // Removed unused handleClinicToggle function
  // const handleClinicToggle = (clinicId: string) => {
  //   setSelectedClinics(prev => { // Renamed state setter
  //     if (prev.includes(clinicId)) { // Renamed parameter
  //       return prev.filter(id => id !== clinicId); // Renamed parameter
  //     } else {
  //       return [...prev, clinicId]; // Renamed parameter
  //     }
  //   });
  // };

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Re-fetch data for the current active tab
      switch (activeTab) {
        case 'aging':
          const agingResult = await getAgingReport(dateFilter);
          setAgingData(agingResult);
          break;
        case 'status':
          const statusResult = await getStatusDistribution(dateFilter);
          setStatusData(statusResult);
          break;
        case 'clients':
          const clientResult = await getClientPerformance(dateFilter);
          setClientData(clientResult);
          break;
        case 'cpt':
          const cptResult = await getTopCptCodes(dateFilter, 10);
          setCptData(cptResult);
          break;
        case 'trends':
          const trendResult = await getMonthlyTrends(dateFilter);
          setTrendData(trendResult);
          break;
      }
    } catch (error: any) {
      setError(error?.message || `Error refreshing ${activeTab} data. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = () => {
    // In a real app, you would generate and download a report
    alert('Report export functionality would be implemented here');
  };

  // Removed unused index parameter from handleBarClick
  const handleBarClick = (data: any) => {
    // Navigate directly to invoices page with aging filter
    if (data && data.activePayload && data.activePayload.length > 0) {
      // Get the data from the clicked bar
      const clickedData = data.activePayload[0].payload;

      // Convert bucket label to query parameter
      let agingParam = '';
      const label = clickedData.label;

      switch (label) {
        case 'Current':
          agingParam = 'current';
          break;
        case '1-30 Days':
          agingParam = '1-30';
          break;
        case '31-60 Days':
          agingParam = '31-60';
          break;
        case '61-90 Days':
          agingParam = '61-90';
          break;
        case '90+ Days':
          agingParam = '90plus';
          break;
      }

      // Navigate to invoices page with the aging filter
      navigate(`/invoices?aging=${agingParam}`);
    }
  };


  const handleClientRowClick = (client: any) => {
    setSelectedClient(client);
    setShowClientDetailModal(true);
  };

  // Removed unused handleRowsPerPageChange function
  // const handleRowsPerPageChange = (newRowsPerPage: number) => {
  //   setRowsPerPage(newRowsPerPage);
  //   // setCurrentPage(1); // Reset to first page when changing rows per page - Removed as currentPage state is removed
  // };

  // Removed unused bucketColumns definition
  // const bucketColumns = [ ... ];

  const clientColumns = [
    {
      header: 'Client',
      accessor: 'name',
      sortable: true,
    },
    {
      header: 'Clinic', // Renamed header
      accessor: 'clinic', // Renamed accessor
      sortable: true,
    },
    {
      header: 'Invoices',
      accessor: 'invoiceCount',
      sortable: true,
      className: 'text-right',
    },
    {
      header: 'Total Value',
      accessor: (row: any) => `$${row.totalValue.toLocaleString()}`,
      sortable: true,
      className: 'text-right',
    },
    {
      header: 'Dispute Rate',
      accessor: (row: any) => `${row.disputeRate}%`,
      sortable: true,
      className: 'text-right',
    },
    {
      header: 'Avg. Days to Payment',
      accessor: 'avgDaysToPayment',
      sortable: true,
      className: 'text-right',
    },
  ];

  const cptCodeColumns = [
    {
      header: 'CPT Code',
      accessor: 'code',
      sortable: true,
    },
    {
      header: 'Description',
      accessor: 'description',
      sortable: true,
    },
    {
      header: 'Count',
      accessor: 'count',
      sortable: true,
      className: 'text-right',
    },
    {
      header: 'Total Value',
      accessor: (row: any) => `$${row.value.toLocaleString()}`,
      sortable: true,
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
            disabled={isLoading}
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleExportReport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0078D7]"
          >
            <Download size={16} className="mr-2" />
            Export Report
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar size={18} className="text-gray-400" />
              <select
                value={dateRange}
                onChange={handleDateRangeChange}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#0078D7] focus:border-[#0078D7] sm:text-sm rounded-md"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="ytd">Year to Date</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#0078D7] focus:border-[#0078D7] sm:text-sm rounded-md"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#0078D7] focus:border-[#0078D7] sm:text-sm rounded-md"
                />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter size={18} className="text-gray-400" />
              </div>
              <select
                className="block w-full pl-10 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#0078D7] focus:border-[#0078D7] sm:text-sm rounded-md"
              >
                <option value="all">All Clinics</option> {/* Renamed text */}
                {/* TODO: Replace [] with fetched clinic/client data */}
                {[].map((client: any) => ( 
                  <option key={client.id} value={client.id}>
                    {client.name} - {client.clinic} {/* Adjust property names if needed */}
                  </option> 
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('aging')}
              className={`py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'aging'
                  ? 'border-[#0078D7] text-[#0078D7]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <BarChart2 size={16} className="mr-2" />
                AR Aging
              </div>
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'status'
                  ? 'border-[#0078D7] text-[#0078D7]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <PieChart size={16} className="mr-2" />
                Status Distribution
              </div>
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'clients'
                  ? 'border-[#0078D7] text-[#0078D7]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Building size={16} className="mr-2" />
                Client Performance
              </div>
            </button>
            <button
              onClick={() => setActiveTab('cpt')}
              className={`py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'cpt'
                  ? 'border-[#0078D7] text-[#0078D7]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <FileText size={16} className="mr-2" />
                Top CPT Codes
              </div>
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`py-4 px-6 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'trends'
                  ? 'border-[#0078D7] text-[#0078D7]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <TrendingUp size={16} className="mr-2" />
                Monthly Trends
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0078D7]"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 p-6 bg-red-50 border border-red-200 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-700 font-medium text-lg mb-2">Error Loading Data</p>
              <p className="text-red-600 text-center">{error}</p>
              <button 
                onClick={handleRefresh} 
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <RefreshCw size={16} className="mr-2" />
                Try Again
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'aging' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900">AR Aging Overview</h2>
                    <p className="text-sm text-gray-500">
                      Click on a bar to view invoices in that aging bucket
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    {agingData.map((bucket) => (
                      <div key={bucket.label} className="bg-gray-50 p-4 rounded-md">
                        <p className="text-sm text-gray-500">{bucket.label}</p>
                        <p className="text-xl font-medium">${bucket.value.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">{bucket.count} invoices</p>
                      </div>
                    ))}
                  </div>

                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={agingData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        onClick={handleBarClick}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => [`$${value.toLocaleString()}`, 'Amount']}
                        />
                        <Bar dataKey="value" fill="#0078D7" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {activeTab === 'status' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-900">Invoice Status Distribution</h2>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {statusData.map((status) => (
                      <div 
                        key={status.name} 
                        className="p-4 rounded-md" 
                        style={{ backgroundColor: status.color + '15' }} // Adding transparency to the background
                      >
                        <p className="text-sm font-medium" style={{ color: status.color }}>{status.name}</p>
                        <p className="text-xl font-medium">{status.value}%</p>
                      </div>
                    ))}
                  </div>

                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
          <Pie
            data={statusData}
            cx="50%"
            cy="50%"
            labelLine={true}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
            label={({ name, value }) => `${value}%`}
          >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {activeTab === 'clients' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-900">Client Performance</h2>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {clientColumns.map((column, index) => (
                            <th
                              key={index}
                              scope="col"
                              className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                            >
                              {column.header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {clientData.map((client) => (
                          <tr
                            key={client.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleClientRowClick(client)}
                          >
                            {clientColumns.map((column, index) => (
                              <td
                                key={index}
                                className={`px-6 py-4 whitespace-nowrap text-sm ${column.className || ''}`}
                              >
                                {typeof column.accessor === 'function'
                                  ? column.accessor(client)
                                  : client[column.accessor as keyof typeof client]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'cpt' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-900">Top CPT Codes</h2>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {cptCodeColumns.map((column, index) => (
                            <th
                              key={index}
                              scope="col"
                              className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                            >
                              {column.header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {cptData.map((cpt, index) => (
                          <tr key={index}>
                            {cptCodeColumns.map((column, colIndex) => (
                              <td
                                key={colIndex}
                                className={`px-6 py-4 whitespace-nowrap text-sm ${column.className || ''}`}
                              >
                                {typeof column.accessor === 'function'
                                  ? column.accessor(cpt)
                                  : cpt[column.accessor as keyof typeof cpt]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'trends' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-900">Monthly Trends</h2>

                  <div className="h-80">
                    {/* TODO: Replace MOCK_MONTHLY_TRENDS with fetched data */}
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={trendData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                        <Legend />
                        <Bar dataKey="invoiced" name="Invoiced" fill="#0078D7" />
                        <Bar dataKey="collected" name="Collected" fill="#10B981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-sm text-gray-500">Total Invoiced (Period)</p>
                      <p className="text-xl font-medium">${trendData.reduce((sum, month) => sum + month.invoiced, 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">From {customDateFrom} to {customDateTo}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-sm text-gray-500">Total Collected (Period)</p>
                      <p className="text-xl font-medium">${trendData.reduce((sum, month) => sum + month.collected, 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">From {customDateFrom} to {customDateTo}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Client Detail Modal */}
      <Modal
        isOpen={showClientDetailModal}
        onClose={() => setShowClientDetailModal(false)}
        title={selectedClient ? `${selectedClient.name} - ${selectedClient.clinic}` : ''} 
        size="lg"
      >
        {selectedClient && (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="font-medium text-gray-900">Client Details</h3>
                <p className="text-sm text-gray-500 mt-1">ID: {selectedClient.id}</p>
                <p className="text-sm text-gray-500">Clinic: {selectedClient.clinic}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Performance Summary</h3>
                <p className="text-sm text-gray-500 mt-1">Total Invoices: {selectedClient.invoiceCount}</p>
                <p className="text-sm text-gray-500">Total Value: ${selectedClient.totalValue.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Dispute Rate: {selectedClient.disputeRate}%</p>
                <p className="text-sm text-gray-500">Avg. Days to Payment: {selectedClient.avgDaysToPayment}</p>
              </div>
            </div>
            
            <div className="mt-4">
              <button
                onClick={() => {
                  setShowClientDetailModal(false);
                  navigate(`/invoices?client=${selectedClient.id}`);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0078D7] hover:bg-blue-700 focus:outline-none"
              >
                View Invoices for {selectedClient.name}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Reports;
