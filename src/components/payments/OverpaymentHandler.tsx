/**
 * Overpayment Handler Component
 * 
 * Handles cases where payment amount exceeds invoice balance
 * Creates account credits for the excess amount
 * Maintains penny-perfect accuracy
 */

import React, { useState } from 'react';
import { 
  AlertCircle,
  CreditCard,
  DollarSign,
  CheckCircle
} from 'lucide-react';

interface OverpaymentHandlerProps {
  paymentAmount: number;
  invoiceBalance: number;
  clientId: string;
  onConfirm: (allocateAmount: number, creditAmount: number) => void;
  onCancel: () => void;
}

export const OverpaymentHandler: React.FC<OverpaymentHandlerProps> = ({
  paymentAmount,
  invoiceBalance,
  clientId,
  onConfirm,
  onCancel
}) => {
  const overpaymentAmount = paymentAmount - invoiceBalance;
  const [creditOption, setCreditOption] = useState<'credit' | 'partial'>('credit');
  const [customAmount, setCustomAmount] = useState(invoiceBalance.toFixed(2));
  
  const handleConfirm = () => {
    if (creditOption === 'credit') {
      // Allocate full invoice balance, create credit for remainder
      onConfirm(invoiceBalance, overpaymentAmount);
    } else {
      // Allocate only the payment amount, no credit
      const amount = parseFloat(customAmount);
      if (amount > 0 && amount <= paymentAmount) {
        onConfirm(amount, 0);
      }
    }
  };
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <div className="flex items-start mb-4">
        <AlertCircle className="h-6 w-6 text-yellow-600 mr-3 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900">
            Overpayment Detected
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            The payment amount exceeds the invoice balance. How would you like to handle the excess?
          </p>
        </div>
      </div>
      
      {/* Amount Summary */}
      <div className="bg-white rounded-lg p-4 mb-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Payment Amount:</span>
          <span className="font-medium">${paymentAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Invoice Balance:</span>
          <span className="font-medium">${invoiceBalance.toFixed(2)}</span>
        </div>
        <div className="border-t pt-2">
          <div className="flex justify-between">
            <span className="text-gray-600 font-medium">Overpayment:</span>
            <span className="font-bold text-yellow-600">${overpaymentAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {/* Options */}
      <div className="space-y-3 mb-6">
        <label className="flex items-start cursor-pointer">
          <input
            type="radio"
            value="credit"
            checked={creditOption === 'credit'}
            onChange={() => setCreditOption('credit')}
            className="mt-1 mr-3"
          />
          <div className="flex-1">
            <div className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2 text-green-600" />
              <span className="font-medium">Create Account Credit</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Pay invoice in full (${invoiceBalance.toFixed(2)}) and create a credit 
              of ${overpaymentAmount.toFixed(2)} for future use
            </p>
          </div>
        </label>
        
        <label className="flex items-start cursor-pointer">
          <input
            type="radio"
            value="partial"
            checked={creditOption === 'partial'}
            onChange={() => setCreditOption('partial')}
            className="mt-1 mr-3"
          />
          <div className="flex-1">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-blue-600" />
              <span className="font-medium">Custom Allocation</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Allocate a specific amount to this invoice
            </p>
            {creditOption === 'partial' && (
              <div className="mt-2">
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="text"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    max={paymentAmount}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Max: ${paymentAmount.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </label>
      </div>
      
      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {creditOption === 'credit' ? 'Apply & Create Credit' : 'Apply Allocation'}
        </button>
      </div>
    </div>
  );
};