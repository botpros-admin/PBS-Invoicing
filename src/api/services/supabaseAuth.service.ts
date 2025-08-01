/**
 * Supabase Authentication Service
 * 
 * This service manages user authentication operations using Supabase, including
 * login, registration, password management, and MFA functionality.
 */

import { supabase } from '../supabase';
import { User } from '../../types'; // Local User type
import { MfaEnrollmentData, MfaChallengeData, MfaFactor } from '../../types';
import { AuthSession, User as SupabaseUser, Session } from '@supabase/supabase-js'; // Import Supabase types, ensure Session is imported, remove unused PostgrestError

/**
 * Sign in with email and password
 * May return with MFA challenge if MFA is enabled for the user
 */
export async function login(credentials: { email: string; password: string }) {
  console.log('Login attempt with email:', credentials.email);
  
  try {
    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) throw error;

    // Check if user needs MFA by looking at the session
    if (!data.session) {
      // Return partial auth that requires MFA
      return {
        requiresMfa: true,
        user: await getUserProfile(data.user),
      };
    }

    // Regular login success
    const user = await getUserProfile(data.user);
    console.log('User profile retrieved:', user.name, user.role);
    
    // Use imported AuthSession type
    const sessionData = data.session as AuthSession; 
    
    return {
      user,
      token: sessionData.access_token,
      session: sessionData,
    };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Define an explicit return type for successful MFA verification
interface MfaVerificationResult {
  user: User;
  session: Session; // Use the imported Session type
}

/**
 * Verify MFA code during login flow
 */
export async function verifyMfaCode(factorId: string, code: string): Promise<MfaVerificationResult> {
  try {
    // Create a challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) throw challengeError;

    // Verify the code - remove unused 'data' from destructuring
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (error) throw error;

    // After successful verification, the session should be active.
    // We don't need to check the 'data' object from verify directly for session/user.
    
    // Now, get the session and user explicitly
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      console.error('MFA verified, but failed to get session:', sessionError);
      throw new Error('MFA verified, but session could not be established.');
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
       console.error('MFA verified, but failed to get user:', userError);
       throw new Error('MFA verified, but user details could not be retrieved.');
    }

    // Now get the full profile using the retrieved Supabase user
    const user = await getUserProfile(userData.user); 
    
    return {
      user,
      session: sessionData.session, // Return the retrieved session
    };
  } catch (error) {
    console.error('MFA verification error:', error);
    throw error;
  }
}

/**
 * Get current user from session
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data.user) {
      console.log('No authenticated user found');
      return null;
    }

    try {
      // Try to get the user profile normally
      return await getUserProfile(data.user);
    } catch (profileError) {
      // For HIPAA compliance, we no longer use fallbacks
      console.error('Error retrieving user profile:', profileError);
      throw new Error('Authentication failed: Unable to verify user access. For security reasons, access has been denied.');
    }
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

/**
 * Register a new user
 */
export async function registerUser(userData: { 
  email: string; 
  password: string; 
  name: string;
  role?: string;
}) {
  try {
    // Register new user
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          role: userData.role || 'staff',
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      const user = await getUserProfile(data.user);
      return { user };
    }

    return { message: 'Registration successful. Please check your email for verification.' };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

/**
 * Log out the current user
 */
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(userData: Partial<User>): Promise<User> {
  try {
    // Update user metadata
    const { data, error } = await supabase.auth.updateUser({
      data: {
        name: userData.name,
        role: userData.role,
        // Do not update mfaEnabled here as it's handled separately through MFA enrollment
      },
    });

    if (error) throw error;

    return await getUserProfile(data.user);
  } catch (error) {
    console.error('Update user error:', error);
    throw error;
  }
}

/**
 * Enroll in MFA
 */
export async function enrollMfa(): Promise<MfaEnrollmentData> {
  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    });

    if (error) throw error;

    return {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    };
  } catch (error) {
    console.error('MFA enrollment error:', error);
    throw error;
  }
}

/**
 * Challenge for MFA verification
 */
export async function challengeMfa(factorId: string): Promise<MfaChallengeData> {
  try {
    const { data, error } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (error) throw error;

    return {
      challengeId: data.id,
      factorId: factorId,
    };
  } catch (error) {
    console.error('MFA challenge error:', error);
    throw error;
  }
}

/**
 * Verify MFA challenge
 */
export async function verifyMfaChallenge(params: { 
  factorId: string; 
  challengeId: string; 
  code: string;
}): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase.auth.mfa.verify({
      factorId: params.factorId,
      challengeId: params.challengeId,
      code: params.code,
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('MFA verification error:', error);
    throw error;
  }
}

/**
 * List MFA factors for current user
 */
export async function listMfaFactors(): Promise<MfaFactor[]> {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) throw error;

    return data.totp.map(factor => ({
      id: factor.id,
      factorType: 'totp',
      status: factor.status,
      friendlyName: factor.friendly_name,
    }));
  } catch (error) {
    console.error('List MFA factors error:', error);
    throw error;
  }
}

/**
 * Unenroll from MFA
 */
export async function unenrollMfa(factorId: string): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase.auth.mfa.unenroll({
      factorId,
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('MFA unenroll error:', error);
    throw error;
  }
}

/**
 * Request a password reset email.
 */
export async function requestPasswordReset(email: string): Promise<{ error?: Error }> {
  console.log(`[AuthService] Requesting password reset for ${email}`);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/update-password`,
  });

  if (error) {
    console.error('[AuthService] Password reset error:', error);
    return { error };
  }

  return {};
}

/**
 * Invite a new user via email using the Edge Function
 */
export async function sendInvitation(email: string, role: string): Promise<{ message: string } | { error: string }> {
  try {
    console.log(`Invoking invite-user function for ${email} with role ${role}`);
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { email, role },
    });

    if (error) {
      console.error('Error invoking invite-user function:', error.message);
      // Attempt to parse the error response from the function if available
      let errorMessage = `Failed to send invitation: ${error.message}`;
      if (error.context && error.context.json) {
         errorMessage = error.context.json.error || errorMessage;
      } else if (typeof error.message === 'string' && error.message.includes('{')) {
         // Sometimes the error message itself contains JSON
         try {
           const parsedError = JSON.parse(error.message.substring(error.message.indexOf('{')));
           errorMessage = parsedError.error || errorMessage;
         } catch { // Remove unused variable 'parseError'
           // Ignore if parsing fails
         }
      }
      return { error: errorMessage };
    }

    console.log('Invite function response:', data);
    // Assuming the function returns { message: '...' } on success
    return data || { message: 'Invitation sent successfully.' }; 

  } catch (error: unknown) { // Use unknown type
    console.error('Unexpected error sending invitation:', error);
    // Type assertion needed if accessing properties like message
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { error: `An unexpected error occurred: ${errorMessage}` };
  }
}

/**
 * Helper function to get user profile data
 */
async function getUserProfile(authUser: SupabaseUser | null): Promise<User> { // Use SupabaseUser type
  console.log('[getUserProfile] Function entry'); // <<< Log added previously
  if (!authUser) {
    console.error('[getUserProfile] Auth user object is null or undefined.'); // <<< ADDED LOG
    throw new Error('User not found');
  }
  console.log(`[getUserProfile] Received authUser with email: ${authUser.email}`); // <<< ADDED LOG

  // No longer needed - we don't use fallbacks for HIPAA compliance

  // Log authentication attempt without hardcoded admin detection
  if (authUser.email) {
    console.log(`User profile lookup attempt for: ${authUser.email}`);
  } // <<< Corrected brace placement

  try {
    // For all users, try to query the database
    console.log('[getUserProfile] Entering TRY block for database query for', authUser.email); // <<< Log added previously
    console.log('Attempting to get user profile from database for', authUser.email);
    
    // Try direct query first (AbortController removed previously)
    let userData;
    
    try {
      // Attempt to get the user data directly
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single();
      
      if (error) {
        // Log the specific database error before throwing a generic one
        console.error('Detailed Error fetching user profile:', JSON.stringify(error, null, 2)); 
        throw error; // Re-throw the original error to be caught below
      }
      
      userData = data;
    } catch (err: unknown) { // Use unknown type
      // Log the specific error that occurred during the query attempt
      console.error('Detailed Database query error:', JSON.stringify(err, null, 2));
      // Check if it's an AbortError or PostgrestError for better typing
      const isAbortError = err instanceof Error && err.name === 'AbortError'; // Keep check in case needed later
      // Basic check for PostgrestError structure (using 'message' property)
      const isPostgrestError = err && typeof err === 'object' && 'message' in err; 

      if (isAbortError) {
         // This path shouldn't be hit now, but keep log just in case
        console.error('Database query timed out (AbortError detected unexpectedly)');
      } else {
        console.error('General Database query error:', err); // Keep original log too
      }
      // Throw a new error to be caught by the final catch block
      const errorMessage = isPostgrestError ? (err as { message: string }).message : (err instanceof Error ? err.message : 'Unknown');
      throw new Error(`Database query failed for user: ${authUser.email}. Reason: ${errorMessage}`); 
    }
    
    // Get MFA status
    let hasMfa = false;
    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      hasMfa = factorsData?.totp?.some(factor => factor.status === 'verified') || false;
    } catch (mfaError) {
      console.warn('Failed to get MFA status, defaulting to false:', mfaError);
    }

    // Map database fields to our User type with defensive programming
    const user: User = {
      id: String(userData.id),
      organizationId: userData.organization_id ? String(userData.organization_id) : undefined,
      name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
      email: userData.email || '',
    // Never override database roles - always use what's in the database
    role: userData.role || 'staff',
      status: userData.status || 'active',
      mfaEnabled: Boolean(hasMfa),
      createdAt: userData.created_at || new Date().toISOString(),
      updatedAt: userData.updated_at || new Date().toISOString(),
      lastLoginAt: authUser.last_sign_in_at || new Date().toISOString(),
      avatar: userData.avatar_url || undefined,
    };

    console.log('Successfully retrieved user profile from database:', user.email, user.role);
    return user;
  } catch (error: unknown) { // Use unknown type
    // Log the specific error that caused the profile fetch to fail overall
    console.error('Detailed failure in getUserProfile:', JSON.stringify(error, null, 2));
    console.error('Failed to get user profile for:', authUser.email);
    
    // For ALL users, we should not use fallbacks for HIPAA compliance
    // Throw the generic HIPAA-compliant error message for the UI
    throw new Error('Authentication failed. For security reasons, login has been rejected.'); 
  } // <<< Added missing closing brace for the outer try block
}
