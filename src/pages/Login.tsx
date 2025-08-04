import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom'; // Removed useLocation
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, LogIn, AlertCircle } from 'lucide-react';
import { supabase } from '../api/supabase'; // Import supabase client
import MfaVerificationModal from '../components/auth/MfaVerificationModal';
import DnaSpinner from '../components/common/DnaSpinner';
import { formatAuthError } from '../utils/authErrors'; // Keep error formatting

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [componentIsLoading, setComponentIsLoading] = useState(false); // Local loading state for submit button
  const [error, setError] = useState<string | null>(null);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null); // Store factorId if MFA needed
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotPasswordView, setForgotPasswordView] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get state and methods from the refactored AuthContext
  const { login, verifyMfa, isAuthenticated, isLoading: authIsLoading, hasMfa, requestPasswordReset } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // const location = useLocation(); // Remove unused location
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  // Handle remembered email on mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('remembered_email');
    if (storedEmail) {
      setEmail(storedEmail);
      setRememberMe(true);
    }
    // Clear any previous component-level errors on mount
    setError(null);
    setShowMfaModal(false);
  }, []);

  // Redirect authenticated users away from login page
  useEffect(() => {
    // Use authIsLoading from context to wait for initial check
    if (!authIsLoading && isAuthenticated) {
      console.log(`[Login Page] User authenticated, navigating to: ${redirectPath}`);
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, authIsLoading, navigate, redirectPath]);

  // Show MFA modal if context indicates it's needed after login attempt
  useEffect(() => {
    if (hasMfa && !showMfaModal && componentIsLoading) {
      // Need to get the factorId - assuming only one TOTP factor for now
      const fetchFactorId = async () => {
        try {
          // Use Supabase client directly here or add a method to context if preferred
          const { data, error: factorError } = await supabase.auth.mfa.listFactors();
          if (factorError) throw factorError;

          const totpFactor = data?.totp?.[0]; // Get the first TOTP factor
          if (totpFactor?.status === 'verified') {
             setMfaFactorId(totpFactor.id);
             setShowMfaModal(true);
             console.log('[Login Page] Showing MFA modal for factor:', totpFactor.id);
          } else {
             setError('MFA is required, but no verified TOTP factor found. Please contact support.');
              console.error('[Login Page] MFA required but no verified TOTP factor available.');
           }
         } catch (err: unknown) { // Use unknown type
            const formattedError = formatAuthError(err instanceof Error ? err : new Error(String(err)));
            setError(formattedError);
            console.error('[Login Page] Error fetching MFA factors:', err);
         } finally {
           setComponentIsLoading(false); // Stop local loading indicator
        }
      };
      fetchFactorId();
    }
  }, [hasMfa, showMfaModal, componentIsLoading]); // Depend on hasMfa from context


  // --- Event Handlers ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setComponentIsLoading(true); // Start loading indicator immediately
    setError(null);
    setShowMfaModal(false);

    console.log('[Login Page] Starting 1.25s login delay...');

    // Introduce a 1.25-second delay before calling login
    setTimeout(async () => {
      console.log('[Login Page] Delay finished. Calling login context function...');
      // Call the simplified login method from context
      const result = await login(email, password);

      // Handle login result
      if (result.error) {
        setError(formatAuthError(result.error));
        setComponentIsLoading(false); // Stop loading on error
      } else if (result.requiresMfa) {
        // Don't stop loading here; wait for the useEffect hook to fetch factorId and show modal
        console.log('[Login Page] Login requires MFA. Waiting for factor details...');
        // The useEffect listening to `hasMfa` will handle showing the modal
        // Note: componentIsLoading might be set to false in the MFA useEffect error handler
      } else {
        // Login successful (no MFA)
        console.log('[Login Page] Login successful (no MFA). Navigating...');
        if (rememberMe) {
          localStorage.setItem('remembered_email', email);
        } else {
          localStorage.removeItem('remembered_email');
        }
        // Navigate directly on successful login (no MFA)
        // No need to set component loading to false, navigation handles unmount.
        navigate(redirectPath, { replace: true });
      }
      // If login didn't result in navigation (e.g., error, MFA needed but factor fetch failed),
      // ensure loading stops eventually. This might already be handled in error/MFA paths.
      // Consider adding a final `setComponentIsLoading(false)` here if needed,
      // but be careful not to stop it too early if MFA modal is expected.
      // For now, rely on existing error/MFA handlers to stop loading.

    }, 1250); // 1.25 seconds delay
  };
 
   // Adjust return type to Promise<void>
   const handleMfaVerify = async (factorId: string, code: string): Promise<void> => {
     setComponentIsLoading(true); // Show loading on modal verify button
     // setError(null); // Let modal handle its internal error display

    const result = await verifyMfa(factorId, code);

     if (result.error) {
       console.error('[Login Page] MFA verification failed:', result.error);
       setComponentIsLoading(false); // Stop loading on error
       // Throw the error so the modal's internal catch handler can display it
       throw result.error;
       // setError(formatAuthError(result.error)); // Or set error here if modal doesn't handle it
     } else {
       // MFA successful - AuthContext's onAuthStateChange will trigger navigation
       console.log('[Login Page] MFA verification successful. Waiting for navigation...');
      setShowMfaModal(false); // Close modal immediately
      // Keep loading indicator until navigation happens
      // setComponentIsLoading(false); // Let navigation handle UI change
    }
  };

  const handleMfaCancel = () => {
    setShowMfaModal(false);
    setMfaFactorId(null);
    setComponentIsLoading(false); // Stop loading if MFA is cancelled
    setError(null); // Clear any errors
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setComponentIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const result = await requestPasswordReset(email);
    if (result.error) {
        setError(formatAuthError(result.error));
    } else {
        setSuccessMessage("If an account with that email exists, a password reset link has been sent.");
    }
    setComponentIsLoading(false);
  };

  // --- Render Logic ---

  // Show global loading spinner if AuthContext is still loading initial session
  if (authIsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 sm:px-6 lg:px-8 font-['Montserrat',sans-serif]">
        <DnaSpinner text={"Loading session..."} />
      </div>
    );
  }

  // Show component-level loading spinner during the 1.25s delay or MFA fetch
  if (componentIsLoading && !showMfaModal) {
     return (
       <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 sm:px-6 lg:px-8 font-['Montserrat',sans-serif]">
         <DnaSpinner text={"Signing in..."} />
       </div>
     );
  }

  // Render Login Form (only if not authenticated and not loading initial session/component)
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Montserrat',sans-serif]">
      {/* Keep MFA Modal logic */}
      {showMfaModal && mfaFactorId && (
        <MfaVerificationModal
          userId={email} // Pass email as userId
          onVerify={handleMfaVerify} // Pass the correct handler
          onCancel={handleMfaCancel}
          // factorId is not a prop here, modal handles factor selection internally
        />
      )}

      {/* Add overlay effect when modal is open */}
      <div className={`transition-opacity duration-300 ${showMfaModal ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Logo Section */}
          <div className="flex flex-col items-center">
             {/* Placeholder for logo if needed */}
             <img
               src="/pbs-logo.png" // Assuming logo is in public folder
               alt="Precision Billing Solution Logo"
               className="h-24 mb-2"
             />
            <div className="text-center uppercase tracking-wider">
              <div className="text-4xl font-bold text-gray-900">Precision</div>
              <div className="text-base text-gray-600 mt-1">Billing Solution</div>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">
            {forgotPasswordView ? 'Reset your password' : 'Sign in to your account'}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {error && !showMfaModal && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
                <AlertCircle className="text-red-500 mr-2 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-start">
                <AlertCircle className="text-green-500 mr-2 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-green-600">{successMessage}</p>
              </div>
            )}

            {forgotPasswordView ? (
              <form className="space-y-6" onSubmit={handleForgotPassword}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#ef3a4d] focus:border-[#ef3a4d] sm:text-sm"
                      placeholder="user@example.com"
                      disabled={componentIsLoading}
                    />
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={componentIsLoading}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#ef3a4d] hover:bg-[#d92c3d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ef3a4d] ${
                      componentIsLoading ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                  >
                    {componentIsLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
                <div className="text-sm text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordView(false);
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="font-medium text-[#ef3a4d] hover:text-[#d92c3d]"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <form
                className="space-y-6"
                onSubmit={handleSubmit}
                data-bitwarden-watching="false" // Keep if relevant
              >
                {/* Email Input */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#ef3a4d] focus:border-[#ef3a4d] sm:text-sm"
                      placeholder="user@example.com"
                      disabled={componentIsLoading || showMfaModal} // Use local loading state
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#ef3a4d] focus:border-[#ef3a4d] sm:text-sm"
                      placeholder="••••••••"
                      disabled={componentIsLoading || showMfaModal} // Use local loading state
                    />
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-[#ef3a4d] focus:ring-[#ef3a4d] border-gray-300 rounded"
                    disabled={componentIsLoading || showMfaModal} // Use local loading state
                  />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                      Remember me
                    </label>
                  </div>
                  <div className="text-sm">
                    <button
                      type="button"
                      onClick={() => setForgotPasswordView(true)}
                      className={`font-medium text-[#ef3a4d] hover:text-[#d92c3d] ${componentIsLoading || showMfaModal ? 'pointer-events-none opacity-50' : ''}`}
                    >
                      Forgot your password?
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={componentIsLoading || showMfaModal} // Use local loading state
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#ef3a4d] hover:bg-[#d92c3d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ef3a4d] ${
                      componentIsLoading || showMfaModal ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                  >
                    {componentIsLoading ? ( // Use local loading state
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign in
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Demo Credentials */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Admin: admin@email.com / TempPass123!
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
