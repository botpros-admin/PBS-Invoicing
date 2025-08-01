import React, { useState, useEffect } from 'react';
import { AlertCircle, Info, Fingerprint } from 'lucide-react';
import { listMfaFactors, verifyMfaCode } from '../../api/services/supabaseAuth.service';
import { MfaFactor } from '../../types';

interface MfaVerificationModalProps {
  userId: string;
  onVerify: (factorId: string, code: string) => Promise<void>;
  onCancel: () => void;
}

const MfaVerificationModal: React.FC<MfaVerificationModalProps> = ({ 
  userId, 
  onVerify, 
  onCancel 
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);

  // Load available MFA factors when the component mounts
  useEffect(() => {
    const loadFactors = async () => {
      try {
        const factorsList = await listMfaFactors();
        setFactors(factorsList.filter(f => f.status === 'verified'));
        
        // Auto-select the first factor if there's only one
        if (factorsList.length === 1) {
          setSelectedFactorId(factorsList[0].id);
        }
      } catch (err) {
        setError('Failed to load authentication methods');
        console.error('Error loading MFA factors:', err);
      }
    };
    
    loadFactors();
  }, [userId]);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode.trim() || !selectedFactorId) {
      setError('Please enter the verification code');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await onVerify(selectedFactorId, verificationCode);
      // The parent component will handle closing this modal on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-center p-4 border-b">
          <Fingerprint className="text-indigo-600 mr-2" size={24} />
          <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              For additional security, please enter the verification code from your authenticator app.
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
                <AlertCircle className="text-red-500 mr-2 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            {factors.length > 1 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Authentication Method
                </label>
                <select
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={selectedFactorId || ''}
                  onChange={(e) => setSelectedFactorId(e.target.value)}
                >
                  <option value="" disabled>Select an authentication method</option>
                  {factors.map(factor => (
                    <option key={factor.id} value={factor.id}>
                      {factor.friendlyName || 'Authenticator App'}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <form onSubmit={handleCodeSubmit}>
              <div className="mb-4">
                <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  id="verification-code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  placeholder="123456"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
              
              <div className="text-sm text-gray-500 mb-4 flex items-start">
                <Info size={16} className="mr-2 flex-shrink-0 mt-0.5" />
                <p>
                  Enter the 6-digit code from your authenticator app. This code changes every 30 seconds.
                </p>
              </div>
              
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center ${
                    isLoading ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                  disabled={isLoading || !selectedFactorId}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    'Verify and Sign In'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MfaVerificationModal;
