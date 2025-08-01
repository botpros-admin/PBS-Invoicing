import React, { useState } from 'react';
import { Shield, AlertCircle, Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import MfaSetupModal from './MfaSetupModal';
import { supabase } from '../../api/supabase';

const MfaManagementSection: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupData, setSetupData] = useState<{ qrCodeUrl: string; secret: string; factorId: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleEnableMfa = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      });
      
      if (error) throw error;
      
      setSetupData({
        qrCodeUrl: data.totp.qr_code,
        secret: data.totp.secret,
        factorId: data.id
      });
      
      setIsSetupModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start MFA setup');
      console.error('MFA enrollment error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySetup = async (code: string) => {
    if (!setupData) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: setupData.factorId
      });
      
      if (challengeError) throw challengeError;
      
      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: setupData.factorId,
        challengeId: challengeData.id,
        code
      });
      
      if (verifyError) throw verifyError;
      
      // Update local user state
      updateUser({ mfaEnabled: true });
      
      setSuccessMessage('Two-factor authentication has been successfully enabled.');
      setIsSetupModalOpen(false);
      setSetupData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
      console.error('MFA verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!user?.mfaEnabled) return;
    
    if (!window.confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Get available factors
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) throw factorsError;
      
      if (factorsData.totp.length === 0) {
        throw new Error('No MFA factors found to disable');
      }
      
      // Unenroll from the first factor (most users will have only one)
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: factorsData.totp[0].id
      });
      
      if (unenrollError) throw unenrollError;
      
      // Update local user state
      updateUser({ mfaEnabled: false });
      
      setSuccessMessage('Two-factor authentication has been disabled');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable MFA');
      console.error('MFA disable error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center mb-4">
        <Shield className="text-secondary mr-2" size={24} />
        <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
      </div>
      
      <div className="mb-4">
        <p className="text-gray-600">
          Two-factor authentication adds an extra layer of security to your account. In addition to your password, 
          you'll need to enter a code from your authentication app when signing in.
        </p>
      </div>
      
      <div className="flex items-center mb-6 p-3 bg-gray-50 rounded-md">
        <div className="mr-3">
          {user?.mfaEnabled ? (
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="text-green-600" size={18} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <X className="text-gray-500" size={18} />
            </div>
          )}
        </div>
        <div>
          <h3 className="font-medium">
            {user?.mfaEnabled ? 'Enabled' : 'Not Enabled'}
          </h3>
          <p className="text-sm text-gray-500">
            {user?.mfaEnabled 
              ? 'Your account is protected with two-factor authentication' 
              : 'Your account does not have two-factor authentication enabled'}
          </p>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
          <AlertCircle className="text-red-500 mr-2 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-start">
          <Check className="text-green-500 mr-2 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}
      
      <div className="flex justify-end">
        {user?.mfaEnabled ? (
          <button
            onClick={handleDisableMfa}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Disabling...' : 'Disable Two-Factor Authentication'}
          </button>
        ) : (
          <button
            onClick={handleEnableMfa}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white bg-secondary rounded-md hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
          </button>
        )}
      </div>
      
      {isSetupModalOpen && setupData && (
        <MfaSetupModal
          qrCodeUrl={setupData.qrCodeUrl}
          secret={setupData.secret}
          onVerify={handleVerifySetup}
          onClose={() => {
            setIsSetupModalOpen(false);
            setSetupData(null);
          }}
        />
      )}
    </div>
  );
};

export default MfaManagementSection;
