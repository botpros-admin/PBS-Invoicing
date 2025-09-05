// src/components/disputes/DisputeCommunicationThread.tsx
import React from 'react';
import { DisputeTicketMessage } from '../../types';

interface DisputeCommunicationThreadProps {
  messages: DisputeTicketMessage[];
}

export const DisputeCommunicationThread: React.FC<DisputeCommunicationThreadProps> = ({ messages }) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-gray-800 border-b pb-2">Communication Thread</h3>
      {messages.length === 0 ? (
        <p className="text-gray-500 italic">No messages yet.</p>
      ) : (
        <ul className="space-y-4">
          {messages.map((msg) => (
            <li key={msg.id} className={`flex ${msg.is_internal_note ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl p-4 rounded-lg ${
                msg.is_internal_note
                  ? 'bg-yellow-100 border border-yellow-200 text-gray-800'
                  : 'bg-blue-100 text-gray-800'
              }`}>
                <div className="flex items-center mb-2">
                  <p className="font-bold text-sm">
                    {msg.sender_name || (msg.is_internal_note ? 'Internal Note' : 'Client')}
                  </p>
                  <p className="text-xs text-gray-500 ml-2">
                    {new Date(msg.created_at).toLocaleString()}
                  </p>
                </div>
                <p className="text-sm">{msg.message}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
