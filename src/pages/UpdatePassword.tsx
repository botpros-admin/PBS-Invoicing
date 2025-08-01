import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase';
import DnaSpinner from '../components/common/DnaSpinner';

const UpdatePassword = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: number;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session?.user) {
        // Clear the timeout if the event fires successfully
        clearTimeout(timeoutId);
        // The user is now in a temporary session, navigate to the reset form
        navigate('/reset-password');
      }
    });

    // Set a timeout to handle invalid or expired tokens
    timeoutId = setTimeout(() => {
      setError('The password reset link is invalid or has expired. Please try again.');
      // After showing the error for a bit, redirect to login
      setTimeout(() => navigate('/login'), 5000);
    }, 3000); // 3-second timeout

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {error ? (
          <>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 text-red-600">
              Error
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {error}
            </p>
            <p className="mt-4 text-center text-sm text-gray-500">
              Redirecting to the login page...
            </p>
          </>
        ) : (
          <>
            <DnaSpinner text="Verifying your request..." />
          </>
        )}
      </div>
    </div>
  );
};

export default UpdatePassword;
