// src/components/disputes/DisputeTicketView.tsx
import React from 'react';
import { DisputeTicket, DisputeStatus } from '../../types';
import { DisputeCommunicationThread } from './DisputeCommunicationThread';

interface DisputeTicketViewProps {
  ticket: DisputeTicket;
  onStatusChange: (newStatus: DisputeStatus) => void;
  onAddMessage: (message: string, isInternal: boolean) => void;
}

const DisputeTicketView: React.FC<DisputeTicketViewProps> = ({ ticket, onStatusChange, onAddMessage }) => {
  const [newMessage, setNewMessage] = React.useState('');
  const [isInternalNote, setIsInternalNote] = React.useState(false);

  const handleAddMessage = () => {
    if (newMessage.trim()) {
      onAddMessage(newMessage, isInternalNote);
      setNewMessage('');
      setIsInternalNote(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dispute Ticket #{ticket.ticket_number}</h2>
          <p className="text-sm text-gray-500">
            Status: <span className={`font-semibold ${ticket.status === 'open' ? 'text-red-500' : 'text-green-500'}`}>{ticket.status}</span>
          </p>
        </div>
        <div className="flex items-center">
          <label htmlFor="status-select" className="mr-2 text-sm font-medium text-gray-700">Change Status:</label>
          <select
            id="status-select"
            value={ticket.status}
            onChange={(e) => onStatusChange(e.target.value as DisputeStatus)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option value="open">Open</option>
            <option value="in_review">In Review</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-600">Reason</h3>
          <p>{ticket.reason_category}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-600">Disputed Amount</h3>
          <p>${ticket.disputed_amount?.toFixed(2) ?? 'N/A'}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-600">Priority</h3>
          <p className="capitalize">{ticket.priority}</p>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="font-semibold text-gray-600">Details</h3>
        <p className="text-gray-800">{ticket.reason_details}</p>
      </div>

      {/* Communication Thread */}
      <DisputeCommunicationThread messages={ticket.messages || []} />

      {/* Add Message Form */}
      <div className="mt-6 border-t pt-4">
        <h3 className="font-semibold text-lg mb-2">Add a Response</h3>
        <textarea
          className="w-full p-2 border border-gray-300 rounded-md"
          rows={4}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message here..."
        />
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="internal-note-checkbox"
              checked={isInternalNote}
              onChange={(e) => setIsInternalNote(e.target.checked)}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="internal-note-checkbox" className="ml-2 block text-sm text-gray-900">
              Internal Note (not visible to client)
            </label>
          </div>
          <button
            onClick={handleAddMessage}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Submit Response
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisputeTicketView;
