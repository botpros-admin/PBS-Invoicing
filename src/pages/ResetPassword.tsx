import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase';
import { formatAuthError } from '../utils/authErrors';
import { Lock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*]/.test(password);
  const isLongEnough = password.length >= 8;

  const strength = [hasLowerCase, hasUpperCase, hasNumber, hasSymbol, isLongEnough].filter(Boolean).length;

  const color =
    strength < 3 ? 'text-red-500' : strength < 5 ? 'text-yellow-500' : 'text-green-500';
  const text =
    strength < 3 ? 'Weak' : strength < 5 ? 'Medium' : 'Strong';

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-600">
        <span>Password strength:</span>
        <span className={color}>{text}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
        <div
          className={`h-2 rounded-full ${
            strength < 3 ? 'bg-red-500' : strength < 5 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${strength * 20}%` }}
        ></div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-500 mt-2">
        <div className={`flex items-center ${isLongEnough ? 'text-green-500' : 'text-red-500'}`}>
          {isLongEnough ? <CheckCircle size={12} className="mr-1" /> : <XCircle size={12} className="mr-1" />}
          8+ characters
        </div>
        <div className={`flex items-center ${hasUpperCase ? 'text-green-500' : 'text-red-500'}`}>
          {hasUpperCase ? <CheckCircle size={12} className="mr-1" /> : <XCircle size={12} className="mr-1" />}
          1 uppercase
        </div>
        <div className={`flex items-center ${hasLowerCase ? 'text-green-500' : 'text-red-500'}`}>
          {hasLowerCase ? <CheckCircle size={12} className="mr-1" /> : <XCircle size={12} className="mr-1" />}
          1 lowercase
        </div>
        <div className={`flex items-center ${hasNumber ? 'text-green-500' : 'text-red-500'}`}>
          {hasNumber ? <CheckCircle size={12} className="mr-1" /> : <XCircle size={12} className="mr-1" />}
          1 number
        </div>
        <div className={`flex items-center ${hasSymbol ? 'text-green-500' : 'text-red-500'}`}>
          {hasSymbol ? <CheckCircle size={12} className="mr-1" /> : <XCircle size={12} className="mr-1" />}
          1 symbol
        </div>
      </div>
    </div>
  );
};

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  const isPasswordStrong = () => {
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*]/.test(password);
    const isLongEnough = password.length >= 8;
    return hasLowerCase && hasUpperCase && hasNumber && hasSymbol && isLongEnough;
  };

  useEffect(() => {
    // This page should only be accessible when a user is logged in via a reset link.
    // If there's no user, redirect to login.
    const checkUser = async () => {
      if (isLoading) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
      }
    };
    checkUser();
  }, [navigate, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitted) {
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        // If Supabase returns an error, throw it to be caught by the catch block
        throw updateError;
      }

      // If we get here, the update was successful
      setSuccess(true);
      setIsSubmitted(true);

      // Now, sign out and navigate
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      // Catch any error (from the throw or from network/other issues)
      setError(formatAuthError(err as Error));
    } finally {
      // This will run no matter what happens in the try/catch block
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Montserrat',sans-serif]">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Password updated successfully!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            You will be redirected to the login page shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Montserrat',sans-serif]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center">
          <img
            src="/pbs-logo.png"
            alt="Precision Billing Solution Logo"
            className="h-24 mb-2"
          />
          <div className="text-center uppercase tracking-wider">
            <div className="text-4xl font-bold text-gray-900">Precision</div>
            <div className="text-base text-gray-600 mt-1">Billing Solution</div>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Reset your password
        </h2>
        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="text-red-500 mr-2 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                New password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#ef3a4d] focus:border-[#ef3a4d] sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
              <PasswordStrengthIndicator password={password} />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || !isPasswordStrong()}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#ef3a4d] hover:bg-[#d92c3d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ef3a4d] ${
                  (isLoading || !isPasswordStrong()) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
