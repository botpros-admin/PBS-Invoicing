// src/pages/DisputesDashboardPage.tsx
import React, { useState, useMemo } from 'react';
import { DisputeTicket, DisputeStatus } from '../types';

// Mock data for demonstration purposes
const mockTickets: DisputeTicket[] = [
  { id: '1', ticket_number: 'DT-001', status: 'open', priority: 'high', reason_category: 'pricing', reason_details: 'Incorrect rate applied for CPT 12345.', created_at: new Date().toISOString(), invoice_item_id: 'ii_1', organization_id: 'org_1', disputed_amount: 150.00 },
  { id: '2', ticket_number: 'DT-002', status: 'in_review', priority: 'normal', reason_category: 'duplicate', reason_details: 'This charge appears to be a duplicate of a previous invoice.', created_at: new Date(Date.now() - 86400000).toISOString(), invoice_item_id: 'ii_2', organization_id: 'org_1', disputed_amount: 75.50 },
  { id: '3', ticket_number: 'DT-003', status: 'resolved', priority: 'low', reason_category: 'service_not_rendered', reason_details: 'Service was cancelled but still billed.', created_at: new Date(Date.now() - 172800000).toISOString(), invoice_item_id: 'ii_3', organization_id: 'org_1', disputed_amount: 200.00 },
  { id: '4', ticket_number: 'DT-004', status: 'closed', priority: 'normal', reason_category: 'other', reason_details: 'Patient information is incorrect.', created_at: new Date(Date.now() - 259200000).toISOString(), invoice_item_id: 'ii_4', organization_id: 'org_1', disputed_amount: 0.00 },
];


const DisputesDashboardPage: React.FC = () => {
  const [tickets] = useState<DisputeTicket[]>(mockTickets);
  const [filterStatus, setFilterStatus] = useState<DisputeStatus | 'all'>('all');

  const filteredTickets = useMemo(() => {
    if (filterStatus === 'all') {
      return tickets;
    }
    return tickets.filter(ticket => ticket.status === filterStatus);
  }, [tickets, filterStatus]);

  const handleTicketClick = (ticketId: string) => {
    // In a real app, this would navigate to the ticket details page
    alert(`Navigating to ticket ${ticketId}`);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Disputes Dashboard</h1>
        <p className="text-sm text-gray-600">Manage and resolve client disputes.</p>
      </header>

      <div className="mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as DisputeStatus | 'all')}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_review">In Review</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket #</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disputed Amount</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Created</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTickets.map((ticket) => (
              <tr key={ticket.id} onClick={() => handleTicketClick(ticket.id)} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.ticket_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    ticket.status === 'open' ? 'bg-red-100 text-red-800' :
                    ticket.status === 'in_review' ? 'bg-yellow-100 text-yellow-800' :
                    ticket.status === 'resolved' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {ticket.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{ticket.priority}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.reason_category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${ticket.disputed_amount?.toFixed(2) ?? 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(ticket.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DisputesDashboardPage;
