import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  User,
  Paperclip,
  Send,
  ChevronDown
} from 'lucide-react';

const SupportTickets: React.FC = () => {
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Sample ticket data
  const tickets = [
    {
      id: 1,
      ticketNumber: 'TKT-2024-0089',
      subject: 'Claim CLM-2024-001 denied - need review',
      category: 'Claims',
      status: 'open',
      priority: 'high',
      createdDate: '2024-01-22',
      lastUpdate: '2 hours ago',
      assignedTo: 'Sarah Johnson',
      messages: [
        {
          sender: 'John Smith',
          role: 'Client',
          message: 'We received a denial for claim CLM-2024-001. The denial reason states "Missing Prior Authorization" but we have the auth on file.',
          timestamp: '2024-01-22 09:30 AM'
        },
        {
          sender: 'Sarah Johnson',
          role: 'Support Agent',
          message: 'I\'m reviewing your claim now. Let me check the authorization records.',
          timestamp: '2024-01-22 10:15 AM'
        }
      ]
    },
    {
      id: 2,
      ticketNumber: 'TKT-2024-0088',
      subject: 'Need help with CPT code mapping for new lab tests',
      category: 'Laboratory',
      status: 'in_progress',
      priority: 'medium',
      createdDate: '2024-01-21',
      lastUpdate: '1 day ago',
      assignedTo: 'Mike Chen',
      messages: []
    },
    {
      id: 3,
      ticketNumber: 'TKT-2024-0087',
      subject: 'Billing report not showing correct totals',
      category: 'Reports',
      status: 'resolved',
      priority: 'low',
      createdDate: '2024-01-20',
      lastUpdate: '2 days ago',
      assignedTo: 'Emily Davis',
      messages: []
    },
    {
      id: 4,
      ticketNumber: 'TKT-2024-0086',
      subject: 'Unable to download Excel reports',
      category: 'Technical',
      status: 'open',
      priority: 'high',
      createdDate: '2024-01-22',
      lastUpdate: '30 minutes ago',
      assignedTo: 'Tech Team',
      messages: []
    }
  ];

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'open':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'closed':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[priority as keyof typeof styles]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const filteredTickets = tickets.filter(ticket => 
    filterStatus === 'all' || ticket.status === filterStatus
  );

  const currentTicket = tickets.find(t => t.id === selectedTicket);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-600 mt-1">Get help from our support team</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search tickets..." 
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Tickets */}
          <div className="space-y-2">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket.id)}
                className={`bg-white rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedTicket === ticket.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    {getStatusIcon(ticket.status)}
                    <span className="ml-2 text-xs text-gray-500">{ticket.ticketNumber}</span>
                  </div>
                  {getPriorityBadge(ticket.priority)}
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">{ticket.subject}</h3>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{ticket.category}</span>
                  <span>{ticket.lastUpdate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ticket Detail */}
        <div className="lg:col-span-2">
          {currentTicket ? (
            <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
              {/* Ticket Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusIcon(currentTicket.status)}
                      <span className="text-sm text-gray-500">{currentTicket.ticketNumber}</span>
                      {getPriorityBadge(currentTicket.priority)}
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">{currentTicket.subject}</h2>
                  </div>
                  <button className="px-3 py-1 border rounded-lg hover:bg-gray-50 text-sm">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Category</p>
                    <p className="font-medium">{currentTicket.category}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Assigned To</p>
                    <p className="font-medium">{currentTicket.assignedTo}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="font-medium">{currentTicket.createdDate}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6">
                {currentTicket.messages.length > 0 ? (
                  <div className="space-y-4">
                    {currentTicket.messages.map((msg, index) => (
                      <div key={index} className={`flex ${msg.role === 'Client' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${msg.role === 'Client' ? 'order-2' : ''}`}>
                          <div className="flex items-center space-x-2 mb-1">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{msg.sender}</span>
                            <span className="text-xs text-gray-500">{msg.timestamp}</span>
                          </div>
                          <div className={`p-3 rounded-lg ${
                            msg.role === 'Client' 
                              ? 'bg-blue-50 text-gray-900' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No messages yet</p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-end space-x-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <div className="flex-1">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm h-full flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">Select a ticket to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ashley's Implementation Note */}
      <div className="hidden">
        {/* From Ashley's Transcript 3: 
            "Support is critical. We need a ticketing system where clients can 
            report issues, ask questions about claims, and get help with the portal. 
            Everything needs to be tracked and documented." */}
      </div>
    </div>
  );
};

export default SupportTickets;