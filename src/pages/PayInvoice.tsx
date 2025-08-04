import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, ArrowRight, Lock } from 'lucide-react';

// ===================================================================================
// CRITICAL NOTE FOR DEVELOPERS
// ===================================================================================
// This component is a placeholder and is DISABLED for security reasons.
//
// A secure payment flow requires two key backend components:
// 1. An Edge Function to create a Stripe `PaymentIntent` and return its
//    `client_secret` to the frontend.
// 2. A Stripe Webhook handler (another Edge Function) to securely receive
//    confirmation of payment success (`payment_intent.succeeded`) from Stripe's
//    servers. This is the ONLY reliable way to update the invoice status in the DB.
//
// The form below has been disabled to prevent use in its current insecure state.
// ===================================================================================


const PayInvoice: React.FC = () => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<{ total: number } | null>(null);

  const handleInvoiceLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    // In a real app, you would call the get-invoice-for-payment Edge Function here
    setTimeout(() => {
      if (invoiceNumber === 'INV-2023-1001') {
        setInvoiceDetails({ total: 145.00 });
      } else {
        setError('Invoice not found. Please check the number and try again.');
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Pay Invoice
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {!invoiceDetails ? (
            <form className="space-y-6" onSubmit={handleInvoiceLookup}>
              <div>
                <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700">
                  Invoice Number
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="invoiceNumber"
                    name="invoiceNumber"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isLoading ? 'Loading...' : 'Find Invoice'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
              <div className="mt-4 bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between">
                  <p className="text-sm text-gray-500">Total Amount Due</p>
                  <p className="text-sm font-medium text-gray-900">${invoiceDetails.total.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-6">
                <div className="h-32 bg-gray-100 flex flex-col items-center justify-center rounded-md text-center">
                    <Lock className="text-gray-400 mb-2" />
                    <p className="text-gray-500 font-bold">Payment Gateway Inactive</p>
                    <p className="text-xs text-gray-400">This feature is pending full implementation.</p>
                </div>
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  disabled
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-400 cursor-not-allowed"
                >
                  <CreditCard size={16} className="mr-2" />
                  Pay ${invoiceDetails.total.toFixed(2)}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayInvoice;
