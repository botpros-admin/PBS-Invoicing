import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom'; // Removed useLocation
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, LogIn, AlertCircle, Building2, Users, Shield, TestTube, Activity } from 'lucide-react';
import MfaVerificationModal from '../components/auth/MfaVerificationModal';
import DnaSpinner from '../components/common/DnaSpinner';
import { formatAuthError } from '../utils/authErrors'; // Keep error formatting

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'pbs' | 'client' | 'admin'>('pbs'); // User type selector
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

  // Demo credentials for different user types
  const demoCredentials = {
    pbs: [
      { email: 'admin@test.com', password: 'password123', role: 'PBS Administrator' },
      { email: 'admin@testemail.com', password: 'TempPass123', role: 'Admin (Alternative)' },
      { email: 'billing@testemail.com', password: 'TempPass123', role: 'Billing Specialist' }
    ],
    client: [
      { email: 'john.smith@questdiagnostics.com', password: 'ClientPass123!', role: 'Client Admin (Quest)' },
      { email: 'sarah.jones@labcorp.com', password: 'ClientPass123!', role: 'Billing Manager (LabCorp)' },
      { email: 'mike.chen@northclinic.com', password: 'ClientPass123!', role: 'Clinic Admin' }
    ],
    admin: [
      { email: 'superadmin@testemail.com', password: 'SuperAdmin123!', role: 'Super Administrator' },
      { email: 'test@test.com', password: 'Test123456!', role: 'Test User' }
    ]
  };

  // Handle remembered email on mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('remembered_email');
    const storedUserType = localStorage.getItem('remembered_user_type');
    if (storedEmail) {
      setEmail(storedEmail);
      setRememberMe(true);
    }
    if (storedUserType) {
      setUserType(storedUserType as 'pbs' | 'client' | 'admin');
    }
    // Clear any previous component-level errors on mount
    setError(null);
    setShowMfaModal(false);
  }, []);

  // Redirect authenticated users away from login page
  useEffect(() => {
    // Use authIsLoading from context to wait for initial check
    if (!authIsLoading && isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, authIsLoading, navigate, redirectPath]);

  // Show MFA modal if context indicates it's needed after login attempt
  useEffect(() => {
    if (hasMfa && !showMfaModal && componentIsLoading) {
      // MFA required - show modal with a generic factor ID
      // The backend will handle factor validation
      setMfaFactorId('mfa-factor');
      setShowMfaModal(true);
      setComponentIsLoading(false);
    }
  }, [hasMfa, showMfaModal, componentIsLoading]); // Depend on hasMfa from context


  // --- Event Handlers ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setComponentIsLoading(true); // Start loading indicator immediately
    setError(null);
    setShowMfaModal(false);


    // Introduce a 1.25-second delay before calling login
    setTimeout(async () => {
      // Call the simplified login method from context
      const result = await login(email, password);

      // Handle login result
      if (result.error) {
        setError(formatAuthError(result.error));
        setComponentIsLoading(false); // Stop loading on error
      } else if (result.requiresMfa) {
        // Don't stop loading here; wait for the useEffect hook to fetch factorId and show modal
        // The useEffect listening to `hasMfa` will handle showing the modal
        // Note: componentIsLoading might be set to false in the MFA useEffect error handler
      } else {
        // Login successful (no MFA) - the PublicRoute will handle the redirect
        if (rememberMe) {
          localStorage.setItem('remembered_email', email);
          localStorage.setItem('remembered_user_type', userType);
        } else {
          localStorage.removeItem('remembered_email');
          localStorage.removeItem('remembered_user_type');
        }
        // No navigate() call here. The useEffect that watches isAuthenticated will handle it,
        // or the PublicRoute component will redirect automatically.
        // We can set loading to false as the navigation is no longer this component's responsibility.
        setComponentIsLoading(false);
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
       setComponentIsLoading(false); // Stop loading on error
       // Throw the error so the modal's internal catch handler can display it
       throw result.error;
       // setError(formatAuthError(result.error)); // Or set error here if modal doesn't handle it
     } else {
       // MFA successful - AuthContext's onAuthStateChange will trigger navigation
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
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm"
                      placeholder="user@example.com"
                      disabled={componentIsLoading}
                    />
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={componentIsLoading}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary ${
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
                    className="font-medium text-secondary hover:text-secondary/90"
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
                {/* User Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select User Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setUserType('pbs')}
                      className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                        userType === 'pbs'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      disabled={componentIsLoading || showMfaModal}
                    >
                      <Building2 className={`w-5 h-5 mb-1 ${userType === 'pbs' ? 'text-blue-600' : 'text-gray-500'}`} />
                      <span className={`text-xs font-medium ${userType === 'pbs' ? 'text-blue-900' : 'text-gray-700'}`}>
                        PBS Staff
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserType('client')}
                      className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                        userType === 'client'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      disabled={componentIsLoading || showMfaModal}
                    >
                      <Users className={`w-5 h-5 mb-1 ${userType === 'client' ? 'text-green-600' : 'text-gray-500'}`} />
                      <span className={`text-xs font-medium ${userType === 'client' ? 'text-green-900' : 'text-gray-700'}`}>
                        Client Portal
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserType('admin')}
                      className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                        userType === 'admin'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      disabled={componentIsLoading || showMfaModal}
                    >
                      <Shield className={`w-5 h-5 mb-1 ${userType === 'admin' ? 'text-purple-600' : 'text-gray-500'}`} />
                      <span className={`text-xs font-medium ${userType === 'admin' ? 'text-purple-900' : 'text-gray-700'}`}>
                        Super Admin
                      </span>
                    </button>
                  </div>
                </div>

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
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm"
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
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-secondary focus:border-secondary sm:text-sm"
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
                    className="h-4 w-4 text-secondary focus:ring-secondary border-gray-300 rounded"
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
                      className={`font-medium text-secondary hover:text-secondary/90 ${componentIsLoading || showMfaModal ? 'pointer-events-none opacity-50' : ''}`}
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
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary ${
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
                    Demo Credentials
                  </span>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                {demoCredentials[userType].map((cred, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setEmail(cred.email);
                      setPassword(cred.password);
                    }}
                    className="w-full text-left px-3 py-2 text-xs bg-gray-50 hover:bg-gray-100 rounded-md transition-colors group"
                    disabled={componentIsLoading || showMfaModal}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-700 group-hover:text-gray-900">{cred.role}</span>
                        <div className="text-gray-500">
                          {cred.email} / {cred.password}
                        </div>
                      </div>
                      <LogIn className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="mt-3 text-center">
                <p className="text-xs text-gray-500">
                  {userType === 'pbs' && 'Access the PBS billing system dashboard'}
                  {userType === 'client' && 'Access your client portal for claims and reports'}
                  {userType === 'admin' && 'Full system administration access'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
