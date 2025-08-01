import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as AppUser, UserRole } from '../types'; // Rename imported User to avoid conflict, import UserRole
import { supabase } from '../api/supabase'; // Removed logAuthDebug import
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { updateUserProfile, requestPasswordReset as requestPasswordResetService } from '../api/services/supabaseAuth.service'; // Keep profile update

// Define the shape of the context value
interface AuthContextType {
  user: AppUser | null;
  session: Session | null; // Expose session if needed elsewhere
  isAuthenticated: boolean;
  isLoading: boolean;
  hasMfa: boolean; // Still relevant for UI logic during login
  login: (email: string, password: string) => Promise<{ error?: Error; requiresMfa?: boolean }>; // Use Error type
  verifyMfa: (factorId: string, code: string) => Promise<{ error?: Error }>; // Use Error type
  logout: () => Promise<void>;
  updateUser: (userData: Partial<AppUser>) => Promise<AppUser | null>; // Adjusted return type
  requestPasswordReset: (email: string) => Promise<{ error?: Error }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading initially
  const [hasMfa, setHasMfa] = useState<boolean>(false); // Track if user has MFA enabled

  // Fetch initial session and subscribe to auth state changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true); // Ensure loading is true at the start of effect

    // Function to fetch user profile based on Supabase user
    // This might still be needed if your AppUser includes profile data not in SupabaseUser
    const fetchUserProfile = async (supabaseUser: SupabaseUser): Promise<AppUser | null> => {
      try {
        // Fetch profile from the 'users' table in the public schema
        const { data: profileData, error: profileError } = await supabase
          .from('users') // Correct table name
          .select('*')
          .eq('auth_id', supabaseUser.id) // Correct foreign key column
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          // Return a basic user object based on SupabaseUser if profile fails
          // Use 'staff' as a default role if profile fetch fails
          const defaultRole: UserRole = 'staff';
          return {
            id: supabaseUser.id,
            name: supabaseUser.email || 'Unknown User', // Use email as fallback name
            email: supabaseUser.email || '',
            role: defaultRole,
            status: 'active', // Default status
            mfaEnabled: supabaseUser.user_metadata?.mfa_enabled || false, // Example - check if this metadata exists
            createdAt: supabaseUser.created_at || new Date().toISOString(),
            updatedAt: supabaseUser.updated_at || new Date().toISOString(),
            // Add other default fields from AppUser if necessary
          };
        }

        // Combine Supabase user data with profile data
        const name = `${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim() || supabaseUser.email || 'Unknown User';
        return {
          id: supabaseUser.id,
          name: name, // Combine first/last name
          email: supabaseUser.email || '',
          role: profileData?.role || 'staff', // Default to 'staff' if profile role missing
          status: profileData?.status || 'active', // Default status
          mfaEnabled: profileData?.mfa_enabled || false, // Use DB column name
          // lastLoginAt is not in public.users, it's in auth.users (session.user.last_sign_in_at)
          createdAt: profileData?.created_at || supabaseUser.created_at || new Date().toISOString(), // Use DB column name
          updatedAt: profileData?.updated_at || supabaseUser.updated_at || new Date().toISOString(), // Use DB column name
          avatar: profileData?.avatar_url, // Use DB column name
          organizationId: profileData?.organization_id, // Use DB column name
          // Add other necessary fields from AppUser based on profileData
        };
      } catch (error: unknown) { // Use unknown for catch block
        console.error('Unexpected error fetching profile:', error instanceof Error ? error.message : error);
        return null;
      }
    };

    // --- Initial Session Check ---
    // Use a flag to prevent race conditions with the listener setting state early
    let initialCheckCompleted = false;

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      console.log('[AuthContext] Initial getSession result:', initialSession);
      setSession(initialSession);

      if (initialSession?.user) {
        // Session found initially, fetch profile
        const profile = await fetchUserProfile(initialSession.user);
        if (profile && isMounted) {
          setUser(profile);
          setIsAuthenticated(true);
          setHasMfa(profile.mfaEnabled || false);
          console.log('[AuthContext] Initial session valid, user set.');
        } else if (isMounted) {
          // Session valid but profile failed
          setUser(null);
          setIsAuthenticated(true); // Still authenticated
          setHasMfa(false);
          console.warn('[AuthContext] Initial session valid, but profile fetch failed.');
        }
      } else {
        // No session found initially
        console.log('[AuthContext] No initial session found via getSession.');
        // Ensure state reflects no user if the listener hasn't fired yet
        if (!initialCheckCompleted && isMounted) {
           setUser(null);
           setIsAuthenticated(false);
           setHasMfa(false);
        }
      }
    }).catch(error => {
      // Handle error during initial getSession
      if (isMounted) {
        console.error('[AuthContext] Error in initial getSession:', error);
        setUser(null);
        setIsAuthenticated(false);
        setHasMfa(false);
      }
    }).finally(() => {
      // **Crucially, set loading to false AFTER the initial check completes,**
      // **regardless of outcome.**
      if (isMounted) {
        setIsLoading(false);
        initialCheckCompleted = true;
        console.log('[AuthContext] Initial loading complete (via getSession finally block).');
      }
    });

    // --- Auth State Change Listener ---
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, changedSession) => {
        if (!isMounted) return;

        console.log(`[AuthContext] onAuthStateChange Event: ${event}`, changedSession);
        setSession(changedSession); // Always update session state

        // If the initial check hasn't finished yet, don't process listener events
        // to avoid race conditions setting state before getSession completes.
        // However, allow INITIAL_SESSION if it comes before getSession finishes.
        if (!initialCheckCompleted && event !== 'INITIAL_SESSION') {
           console.log(`[AuthContext] Listener event (${event}) received before initial check complete, deferring...`);
           return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || (event === 'INITIAL_SESSION' && changedSession)) {
          if (changedSession?.user) {
            // Fetch profile whenever session is valid
            const profile = await fetchUserProfile(changedSession.user);
            if (profile && isMounted) {
              setUser(profile);
              setIsAuthenticated(true);
              setHasMfa(profile.mfaEnabled || false);
              console.log(`[AuthContext] State updated from Auth Change (${event}) - User Authenticated.`);
            } else if (isMounted) {
              // Profile fetch failed but session exists
              setUser(null);
              setIsAuthenticated(true); // Still technically authenticated
              setHasMfa(false);
              console.warn(`[AuthContext] Auth Change (${event}) valid, but profile fetch failed.`);
            }
          } else if (isMounted) {
             // Should not happen if session is valid, but handle defensively
            setUser(null);
            setIsAuthenticated(false);
            setHasMfa(false);
            console.warn(`[AuthContext] Auth Change event (${event}) but no user in session.`);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAuthenticated(false);
          setHasMfa(false);
          console.log(`[AuthContext] State updated from Auth Change (${event}) - User Signed Out.`);
        }

        // No need to manage isLoading here anymore, it's handled by getSession().finally()
      }
    );

    // Cleanup subscription on unmount
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      // No fallback timeout needed with this combined approach
      console.log('[AuthContext] Unsubscribed from auth state changes.');
    };
  }, []); // Run only once on mount

  // --- Auth Actions ---

  const login = async (email: string, password: string) => {
    // setIsLoading(true); // DO NOT set initial loading state here
    // setError(null); // Clear previous errors - error state removed
    setHasMfa(false); // Reset MFA status assumption

    try {
      // Remove unused 'data' variable
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('[AuthContext] signInWithPassword error:', signInError);
        // Check if it's an MFA required error
        if (signInError.message.includes('authentication required')) { // Adjust based on actual Supabase error message for MFA
           console.log('[AuthContext] MFA required detected.');
           // Optionally fetch factors here if needed immediately by UI,
           // otherwise Login page can fetch them when modal shows.
           setHasMfa(true); // Set state to indicate MFA needed
           setIsLoading(false);
           return { requiresMfa: true };
        }
        // setError(signInError.message); // Set general error - error state removed
        setIsLoading(false);
        return { error: signInError };
      }

      // Success: onAuthStateChange listener will handle setting user/session state
      // No need to manually set state here. PKCE flow redirects to callback.
      console.log('[AuthContext] signInWithPassword initiated. Waiting for callback/auth change.');
      // Keep isLoading true until onAuthStateChange confirms SIGNED_IN
      // setIsLoading(false); // Let onAuthStateChange handle this
      return {}; // Indicate success (no immediate error)

    } catch (err: unknown) { // Use unknown for catch block
      console.error('[AuthContext] Unexpected login error:', err instanceof Error ? err.message : err);
      // setError(err.message || 'An unexpected error occurred during login.'); // error state removed
      setIsLoading(false);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const verifyMfa = async (factorId: string, code: string) => {
     // setIsLoading(true); // DO NOT set initial loading state here
     // setError(null); // error state removed

     try {
        // Step 1: Create Challenge
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
        if (challengeError) {
          console.error('[AuthContext] MFA Challenge error:', challengeError);
          // setError(challengeError.message); // error state removed
          setIsLoading(false);
          return { error: challengeError };
        }

        // Step 2: Verify Challenge
        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId,
          challengeId: challengeData.id,
          code,
        });

        if (verifyError) {
          console.error('[AuthContext] MFA Verify error:', verifyError);
          // setError(verifyError.message); // error state removed
          setIsLoading(false);
          return { error: verifyError };
        }

        // Success: Verification successful. Supabase handles session update internally.
        // onAuthStateChange (specifically TOKEN_REFRESHED or USER_UPDATED) should fire
        // with the updated session (aal2).
        console.log('[AuthContext] MFA Verification initiated. Waiting for auth change.');
        // Keep isLoading true until onAuthStateChange confirms update
        // setIsLoading(false); // Let onAuthStateChange handle this
        return {}; // Indicate success

     } catch (err: unknown) { // Use unknown for catch block
        console.error('[AuthContext] Unexpected MFA verification error:', err instanceof Error ? err.message : err);
        // setError(err.message || 'An unexpected error occurred during MFA verification.'); // error state removed
        setIsLoading(false);
        return { error: err instanceof Error ? err : new Error(String(err)) };
     }
  };

  const logout = async () => {
    console.log('[AuthContext] Attempting logout...');
    // setError(null); // error state removed
    try {
      // Step 1: Explicitly call the logout Edge Function to clear HttpOnly cookies
      const functionsUrl = import.meta.env.VITE_SUPABASE_URL; // Get base URL
      if (functionsUrl) {
         console.log('[AuthContext] Calling /auth-logout Edge Function...');
         const logoutResponse = await fetch(`${functionsUrl}/functions/v1/auth-logout`, { method: 'POST' });
         if (!logoutResponse.ok) {
            console.error(`[AuthContext] Error response from /auth-logout: ${logoutResponse.status} ${logoutResponse.statusText}`);
            try {
               const body = await logoutResponse.json();
               console.error('[AuthContext] Logout error body:', body);
            } catch { /* Ignore if body isn't JSON */ }
         } else {
            console.log('[AuthContext] /auth-logout Edge Function called successfully.');
         }
      } else {
         console.warn('[AuthContext] Cannot call logout function, VITE_SUPABASE_URL not defined.');
      }

      // Step 2: Call Supabase signOut to invalidate session on server and trigger client cleanup
      console.log('[AuthContext] Calling supabase.auth.signOut()...');
      const { error: signOutError } = await supabase.auth.signOut(); // Await this

      if (signOutError) {
        console.error('[AuthContext] SignOut error:', signOutError);
        // setError(signOutError.message); // error state removed
        // Still clear state locally even if server logout fails? Maybe.
        setUser(null);
        setSession(null);
        setIsAuthenticated(false);
        setHasMfa(false);
      } else {
         console.log('[AuthContext] supabase.auth.signOut() completed.');
      }
      // onAuthStateChange listener will handle final state clearing.
    } catch (err: unknown) { // Use unknown for catch block
      console.error('[AuthContext] Unexpected logout error:', err instanceof Error ? err.message : err);
      // setError(err.message || 'An unexpected error occurred during logout.'); // error state removed
    }
    // No need to manage isLoading here
  };

  const requestPasswordReset = async (email: string) => {
    return await requestPasswordResetService(email);
  };

  // Keep updateUserProfile if needed for managing profile data separate from auth
  const updateUser = async (userData: Partial<AppUser>): Promise<AppUser | null> => {
    if (!user) {
      console.error("Cannot update profile, user not logged in.");
      return null;
    }
    try {
      // Assuming updateUserProfile updates the 'profiles' table
      const updatedProfileData = await updateUserProfile({ id: user.id, ...userData });

      // Create the updated AppUser object
      const updatedUser: AppUser = {
        ...user, // Spread existing user data
        ...updatedProfileData, // Override with updated profile data
        // Ensure essential fields like id, email, role are correctly maintained
        id: user.id, // This should be the public.users ID, not auth_id
        email: updatedProfileData.email || user.email, // Update email if changed in profile
        role: updatedProfileData.role || user.role, // Update role if changed
        mfaEnabled: updatedProfileData.mfaEnabled ?? user.mfaEnabled, // Correct field name from AppUser type
      };

      setUser(updatedUser); // Update local state immediately
      // Supabase client might trigger USER_UPDATED via onAuthStateChange if auth user metadata changes too
      return updatedUser;
    } catch (error: unknown) { // Use unknown for catch block
      console.error('Update user profile error:', error instanceof Error ? error.message : error);
      // setError(error.message || 'Failed to update profile.'); // error state removed
      return null; // Indicate failure
    }
  };

  // Removed error state variable

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated,
        isLoading,
        hasMfa,
        login,
        verifyMfa,
        logout,
        updateUser,
        requestPasswordReset,
        // Expose error state if needed
        // error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
