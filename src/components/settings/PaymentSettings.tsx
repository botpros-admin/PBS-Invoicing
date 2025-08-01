import React, { useState } from 'react';
import { Save } from 'lucide-react';

const PaymentSettings: React.FC = () => {
  const [paymentGateway, setPaymentGateway] = useState('stripe');
  const [autoReconcile, setAutoReconcile] = useState(true);
  const [sendPaymentReceipts, setSendPaymentReceipts] = useState(true);
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Gateway</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="space-y-6">
            <div>
              <label htmlFor="paymentGateway" className="form-label">
                Payment Processor
              </label>
              <select
                id="paymentGateway"
                value={paymentGateway}
                onChange={(e) => setPaymentGateway(e.target.value)}
                className="form-select"
              >
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="square">Square</option>
                <option value="authorize">Authorize.net</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="apiKey" className="form-label">
                API Key
              </label>
              <input
                type="password"
                id="apiKey"
                placeholder="••••••••••••••••••••••"
                className="form-input"
              />
              <p className="form-hint">
                Your API key is securely stored and encrypted.
              </p>
            </div>
            
            <div>
              <label htmlFor="webhookUrl" className="form-label">
                Webhook URL
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                  https://
                </span>
                <input
                  type="text"
                  id="webhookUrl"
                  value="api.yourdomain.com/webhooks/payments"
                  readOnly
                  className="flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-md focus:ring-secondary focus:border-secondary sm:text-sm border-gray-300 bg-gray-50" // Changed focus color
                />
              </div>
              <p className="form-hint">
                Configure this URL in your payment processor dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Settings</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="space-y-6">
            <div className="form-checkbox-container">
              <div className="flex items-center h-5">
                <input
                  id="autoReconcile"
                  name="autoReconcile"
                  type="checkbox"
                  checked={autoReconcile}
                  onChange={(e) => setAutoReconcile(e.target.checked)}
                  className="focus:ring-secondary h-4 w-4 text-secondary border-gray-300 rounded" // Changed color
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="autoReconcile" className="font-medium text-gray-700">
                  Automatically reconcile payments
                </label>
                <p className="text-gray-500">
                  When a payment is received, automatically update the invoice status.
                </p>
              </div>
            </div>
            
            <div className="form-checkbox-container">
              <div className="flex items-center h-5">
                <input
                  id="sendReceipts"
                  name="sendReceipts"
                  type="checkbox"
                  checked={sendPaymentReceipts}
                  onChange={(e) => setSendPaymentReceipts(e.target.checked)}
                  className="focus:ring-secondary h-4 w-4 text-secondary border-gray-300 rounded" // Changed color
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="sendReceipts" className="font-medium text-gray-700">
                  Send payment receipts
                </label>
                <p className="text-gray-500">
                  Send an email receipt to the client when a payment is processed.
                </p>
              </div>
            </div>
            
            <div>
              <label htmlFor="paymentTerms" className="form-label">
                Default Payment Terms (days)
              </label>
              <input
                type="number"
                id="paymentTerms"
                defaultValue={30}
                min={1}
                className="form-input"
              />
              <p className="form-hint">
                Number of days until an invoice is due by default.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary" // Changed color
        >
          <Save size={16} className="mr-2" />
          Save Payment Settings
        </button>
      </div>
    </div>
  );
};

export default PaymentSettings;
