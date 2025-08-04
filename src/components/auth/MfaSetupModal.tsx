import React, { useState } from 'react';
import { X, AlertCircle, Info, Check } from 'lucide-react';

interface MfaSetupModalProps {
  qrCodeUrl: string;
  secret: string;
  onVerify: (code: string) => Promise<void>;
  onClose: () => void;
}

const MfaSetupModal: React.FC<MfaSetupModalProps> = ({ qrCodeUrl, secret, onVerify, onClose }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'qr' | 'verify'>('qr');

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await onVerify(verificationCode);
      // Verification successful, onVerify will handle closing the modal
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
      setIsLoading(false);
    }
  };

  // Format the secret key with spaces for easier reading
  const formattedSecret = secret.replace(/(.{4})/g, '$1 ').trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Set Up Two-Factor Authentication</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {step === 'qr' ? (
            <>
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Scan the QR code below with your authenticator app (like Google Authenticator, 
                  Authy, or Microsoft Authenticator) to set up two-factor authentication.
                </p>
                <div className="text-center mb-6">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code for authenticator app" 
                    className="inline-block border p-2 rounded"
                    width={200}
                    height={200}
                  />
                </div>
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <Info size={18} className="text-blue-500 mr-2" />
                    <span className="font-medium">Can't scan the QR code?</span>
                  </div>
                  <p className="text-gray-600 mb-2">
                    Enter this secret key manually in your authenticator app:
                  </p>
                  <div className="bg-gray-100 p-3 rounded-md font-mono text-sm break-all">
                    {formattedSecret}
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep('verify')}
                  className="px-4 py-2 text-sm font-medium text-white bg-secondary hover:bg-secondary/90"
                >
                  Continue
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  To verify your setup, enter the 6-digit code from your authenticator app.
                </p>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
                    <AlertCircle className="text-red-500 mr-2 flex-shrink-0 mt-0.5" size={16} />
                    <p className="text-sm text-red-600">{error}</p>
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
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-secondary focus:border-secondary"
                      maxLength={6}
                      autoComplete="one-time-code"
                    />
                  </div>
                  <div className="text-sm text-gray-500 mb-4 flex items-start">
                    <Info size={16} className="mr-2 flex-shrink-0 mt-0.5" />
                    <p>
                      This code changes every 30 seconds. If it expires before you 
                      can enter it, wait for a new code and try again.
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep('qr')}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      disabled={isLoading}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 text-sm font-medium text-white bg-secondary hover:bg-secondary/90 flex items-center ${
                        isLoading ? 'opacity-75 cursor-not-allowed' : ''
                      }`}
                      disabled={isLoading}
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
                        <>
                          <Check size={16} className="mr-2" />
                          Verify and Enable
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MfaSetupModal;
