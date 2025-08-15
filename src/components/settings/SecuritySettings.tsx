import React, { useState } from 'react';
import { Save } from 'lucide-react';

const SecuritySettings: React.FC = () => {
  const [requireMfa, setRequireMfa] = useState(false);
  const [passwordExpiry, setPasswordExpiry] = useState(90);
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [dataRetention, setDataRetention] = useState(7);
  
  return (
    <div className="space-y-8">
      {/* Organization-wide Settings */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Organization-wide Authentication Settings</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="space-y-6">
            <div className="form-checkbox-container">
              <div className="flex items-center h-5">
                <input
                  id="requireMfa"
                  name="requireMfa"
                  type="checkbox"
                  checked={requireMfa}
                  onChange={(e) => setRequireMfa(e.target.checked)}
                  className="focus:ring-secondary h-4 w-4 text-secondary border-gray-300 rounded" // Changed color
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="requireMfa" className="font-medium text-gray-700">
                  Require Multi-Factor Authentication
                </label>
                <p className="text-gray-500">
                  All users will be required to set up MFA for their accounts.
                </p>
              </div>
            </div>
            
            <div>
              <label htmlFor="passwordExpiry" className="form-label">
                Password Expiry (days)
              </label>
              <input
                type="number"
                id="passwordExpiry"
                value={passwordExpiry}
                onChange={(e) => setPasswordExpiry(parseInt(e.target.value))}
                min={0}
                className="form-input"
              />
              <p className="form-hint">
                Number of days until users are required to change their password. Set to 0 to disable.
              </p>
            </div>
            
            <div>
              <label htmlFor="sessionTimeout" className="form-label">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                id="sessionTimeout"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(parseInt(e.target.value))}
                min={5}
                className="form-input"
              />
              <p className="form-hint">
                Number of minutes of inactivity before a user is automatically logged out.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Data Protection</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="space-y-6">
            <div>
              <label htmlFor="dataRetention" className="form-label">
                Data Retention Period (years)
              </label>
              <input
                type="number"
                id="dataRetention"
                value={dataRetention}
                onChange={(e) => setDataRetention(parseInt(e.target.value))}
                min={1}
                className="form-input"
              />
              <p className="form-hint">
                Number of years to retain invoice and payment data.
              </p>
            </div>
            
            <div>
              <label htmlFor="dataBackup" className="form-label">
                Automatic Data Backup
              </label>
              <select
                id="dataBackup"
                className="form-select"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="never">Never</option>
              </select>
              <p className="form-hint">
                How often to automatically backup all system data.
              </p>
            </div>
            
            <div className="form-checkbox-container">
              <div className="flex items-center h-5">
                <input
                  id="auditLogging"
                  name="auditLogging"
                  type="checkbox"
                  defaultChecked={true}
                  className="focus:ring-secondary h-4 w-4 text-secondary border-gray-300 rounded" // Changed color
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="auditLogging" className="font-medium text-gray-700">
                  Enable Audit Logging
                </label>
                <p className="text-gray-500">
                  Log all user actions for security and compliance purposes.
                </p>
              </div>
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
          Save Organization Settings
        </button>
      </div>
    </div>
  );
};

export default SecuritySettings;
