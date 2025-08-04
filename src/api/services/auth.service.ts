/**
 * Authentication Service
 * 
 * Handles user authentication, registration, and profile management.
 * Fully integrated with Supabase Auth while maintaining compatibility with the existing interface.
 */

import { apiRequest, delay, supabase, handleSupabaseError } from '../client';
import { User, ID, UserStatus } from '../../types';

/**
 * Interface for login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

/**
 * Interface for login response
 */
export interface LoginResponse {
  user: User;
  token: string;
  requiresMfa?: boolean;
}

/**
 * Login with email and password
 * 
 * @param credentials - User credentials
 * @returns Promise with user data and auth token
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  try {
    // Use Supabase authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) throw error;

    // Get user profile from our users table
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', data.user.id)
      .single();

    if (profileError) throw profileError;

    // Transform into our application's User type
    const appUser: User = {
      id: profileData.id.toString(),
      organizationId: profileData.organization_id ? profileData.organization_id.toString() : undefined,
      name: `${profileData.first_name} ${profileData.last_name}`.trim(),
      email: profileData.email,
      role: profileData.role,
      status: profileData.status,
      mfaEnabled: profileData.mfa_enabled,
      avatar: profileData.avatar_url,
      lastLoginAt: new Date().toISOString(), // Use current time
      createdAt: profileData.created_at,
      updatedAt: profileData.updated_at
    };

    return {
      user: appUser,
      token: data.session?.access_token || ''
    };
  } catch (error) {
    handleSupabaseError(error, 'Login');
    throw error;
  }
}

/**
 * Logout the current user
 */
export async function logout(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, 'Logout');
    throw error;
  }
}

/**
 * Get the current user's profile
 * 
 * @returns Promise with current user data
 */
export async function getCurrentUser(): Promise<User> {
  try {
    // Get authenticated user from Supabase
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    
    // If no authenticated user, throw error to be consistent with existing behavior
    if (!authData.user) {
      throw new Error('Not authenticated');
    }

    // Get user profile from our users table
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authData.user.id)
      .single();

    if (profileError) {
      // If user exists in auth but not in users table, this is an error in our context
      throw profileError;
    }

    // Transform into our application's User type
    const appUser: User = {
      id: profileData.id.toString(),
      organizationId: profileData.organization_id ? profileData.organization_id.toString() : undefined,
      name: `${profileData.first_name} ${profileData.last_name}`.trim(),
      email: profileData.email,
      role: profileData.role,
      status: profileData.status,
      mfaEnabled: profileData.mfa_enabled,
      avatar: profileData.avatar_url,
      lastLoginAt: authData.user.last_sign_in_at,
      createdAt: profileData.created_at,
      updatedAt: profileData.updated_at
    };

    return appUser;
  } catch (error) {
    console.error('Failed to get current user:', error);
    throw error;
  }
}

/**
 * Get all users for the current organization
 * 
 * @returns Promise with a list of all users
 */
export async function getAllUsers(): Promise<User[]> {
    try {
        const { data, error } = await supabase.rpc('get_all_users_in_organization');

        if (error) throw error;

        return data.map((user: any) => ({
            id: user.id.toString(),
            organizationId: user.organization_id ? user.organization_id.toString() : undefined,
            name: `${user.first_name} ${user.last_name}`.trim(),
            email: user.email,
            role: user.role,
            status: user.status,
            mfaEnabled: user.mfa_enabled,
            avatar: user.avatar_url,
            lastLoginAt: user.last_sign_in_at,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        }));
    } catch (error) {
        handleSupabaseError(error, 'Get All Users');
        throw error;
    }
}

/**
 * Update user status
 * 
 * @param userId - ID of the user to update
 * @param status - New status
 * @returns Promise with the updated user
 */
export async function updateUserStatus(userId: ID, status: UserStatus): Promise<User> {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ status })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id.toString(),
            organizationId: data.organization_id ? data.organization_id.toString() : undefined,
            name: `${data.first_name} ${data.last_name}`.trim(),
            email: data.email,
            role: data.role,
            status: data.status,
            mfaEnabled: data.mfa_enabled,
            avatar: data.avatar_url,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    } catch (error) {
        handleSupabaseError(error, 'Update User Status');
        throw error;
    }
}

/**
 * Resend invitation to a user
 * 
 * @param email - User's email address
 * @returns Promise with success message
 */
export async function resendInvitation(email: string): Promise<{ message: string }> {
    try {
        const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);

        if (error) throw error;

        return { message: 'Invitation resent successfully.' };
    } catch (error) {
        handleSupabaseError(error, 'Resend Invitation');
        throw error;
    }
}

/**
 * Register a new user
 * 
 * @param userData - User registration data and additional fields
 * @returns Promise with the created user
 */
export async function registerUser(userData: Partial<User> & { password?: string }): Promise<User> {
  try {
    // Extract password if it was passed in the data
    const password = userData.password || `Temp${Math.random().toString(36).substring(2)}!`;

    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email || '',
      password: password,
      options: {
        data: {
          full_name: userData.name || '',
          role: userData.role || 'staff',
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    // The user in the users table will be created by the handle_new_user trigger
    // We just need to wait a moment and then fetch it
    await delay(500);

    // Get the newly created user
    const { data: newUserData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authData.user.id)
      .single();

    if (fetchError) throw fetchError;

    // Extract first & last name from the full name
    const nameParts = (userData.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Update with additional details
    const { error: updateError } = await supabase
      .from('users')
      .update({
        first_name: firstName,
        last_name: lastName,
        organization_id: userData.organizationId ? parseInt(userData.organizationId.toString()) : null,
      })
      .eq('id', newUserData.id);

    if (updateError) throw updateError;

    // Fetch the updated user
    const { data: updatedUserData, error: refetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', newUserData.id)
      .single();

    if (refetchError) throw refetchError;

    // Transform to our User interface
    const appUser: User = {
      id: updatedUserData.id.toString(),
      organizationId: updatedUserData.organization_id ? updatedUserData.organization_id.toString() : undefined,
      name: `${updatedUserData.first_name} ${updatedUserData.last_name}`.trim(),
      email: updatedUserData.email,
      role: updatedUserData.role,
      status: updatedUserData.status,
      mfaEnabled: updatedUserData.mfa_enabled,
      avatar: updatedUserData.avatar_url,
      createdAt: updatedUserData.created_at,
      updatedAt: updatedUserData.updated_at
    };

    return appUser;
  } catch (error) {
    handleSupabaseError(error, 'Register User');
    throw error;
  }
}

/**
 * Update user profile
 * 
 * @param userId - ID of the user to update
 * @param userData - Updated user data
 * @returns Promise with the updated user
 */
export async function updateUserProfile(userId: ID, userData: Partial<User>): Promise<User> {
  try {
    // Extract name parts if name is provided
    let firstName, lastName;
    if (userData.name) {
      const nameParts = userData.name.split(' ');
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ');
    }

    // Prepare the update data
    const updateData = {
      first_name: firstName,
      last_name: lastName,
      avatar_url: userData.avatar,
      organization_id: userData.organizationId ? parseInt(userData.organizationId.toString()) : undefined,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    // Update the user in the database
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (updateError) throw updateError;

    // Fetch the updated user
    const { data: updatedUserData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Transform to our User interface
    const appUser: User = {
      id: updatedUserData.id.toString(),
      organizationId: updatedUserData.organization_id ? updatedUserData.organization_id.toString() : undefined,
      name: `${updatedUserData.first_name} ${updatedUserData.last_name}`.trim(),
      email: updatedUserData.email,
      role: updatedUserData.role,
      status: updatedUserData.status,
      mfaEnabled: updatedUserData.mfa_enabled,
      avatar: updatedUserData.avatar_url,
      createdAt: updatedUserData.created_at,
      updatedAt: updatedUserData.updated_at
    };

    return appUser;
  } catch (error) {
    handleSupabaseError(error, 'Update User Profile');
    throw error;
  }
}

/**
 * Request a password reset
 * 
 * @param email - User's email address
 * @returns Promise with success message
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    
    return { message: 'Password reset email sent successfully' };
  } catch (error) {
    handleSupabaseError(error, 'Password Reset Request');
    throw error;
  }
}

/**
 * Reset password with token
 * 
 * @param newPassword - New password
 * @returns Promise with success message
 */
export async function resetPassword(newPassword: string): Promise<{ message: string }> {
  try {
    // Note: In Supabase, the token is automatically handled when the user lands on
    // the reset password page via the email link. We just need to update the password.
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    
    return { message: 'Password reset successful' };
  } catch (error) {
    handleSupabaseError(error, 'Reset Password');
    throw error;
  }
}

/**
 * Enable or configure MFA for a user
 * 
 * @param userId - User ID
 * @returns Promise with MFA setup data
 */
export async function setupMfa(userId: ID): Promise<{ secret: string; qrCodeUrl: string }> {
  try {
    // Use Supabase's built-in MFA functionality
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp'
    });
    
    if (error) throw error;
    
    return {
      secret: data.totp.secret,
      qrCodeUrl: data.totp.qr_code
    };
  } catch (error) {
    handleSupabaseError(error, 'MFA Setup');
    throw error;
  }
}

/**
 * Verify and enable MFA 
 * 
 * @param userId - User ID
 * @param code - Verification code from authenticator app
 * @returns Promise with the updated user
 */
export async function verifyAndEnableMfa(userId: ID, code: string): Promise<User> {
  try {
    // Get factors for the current user
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) throw factorsError;
    
    // Find the pending factor
    const pendingFactor = factorsData.totp.find((f: { status: string }) => f.status === 'unverified');
    if (!pendingFactor) {
      throw new Error('No pending MFA factor found. Please set up MFA first.');
    }
    
    // Create a challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: pendingFactor.id
    });
    if (challengeError) throw challengeError;
    
    // Verify the challenge with the provided code
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: pendingFactor.id,
      challengeId: challengeData.id,
      code
    });
    if (verifyError) throw verifyError;
    
    // Update user in database to enable MFA
    const { error: updateError } = await supabase
      .from('users')
      .update({
        mfa_enabled: true,
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Fetch the updated user
    const { data: updatedUserData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Transform to our User interface
    const appUser: User = {
      id: updatedUserData.id.toString(),
      organizationId: updatedUserData.organization_id ? updatedUserData.organization_id.toString() : undefined,
      name: `${updatedUserData.first_name} ${updatedUserData.last_name}`.trim(),
      email: updatedUserData.email,
      role: updatedUserData.role,
      status: updatedUserData.status,
      mfaEnabled: updatedUserData.mfa_enabled,
      avatar: updatedUserData.avatar_url,
      createdAt: updatedUserData.created_at,
      updatedAt: updatedUserData.updated_at
    };

    return appUser;
  } catch (error) {
    handleSupabaseError(error, 'MFA Verification');
    throw error;
  }
}

/**
 * Disable MFA for a user
 * 
 * @param userId - User ID
 * @param currentPassword - Current password for verification
 * @returns Promise with the updated user
 */
export async function disableMfa(userId: ID, currentPassword: string): Promise<User> {
  try {
    // Verify password first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();
    
    if (userError) throw userError;
    
    // Verify password with Supabase Auth
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: currentPassword,
    });
    
    if (authError) throw new Error('Invalid password');
    
    // Update user to disable MFA
    const { error: updateError } = await supabase
      .from('users')
      .update({
        mfa_enabled: false,
      })
      .eq('id', userId);
    
    if (updateError) throw updateError;
    
    // Fetch the updated user
    const { data: updatedUserData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Transform to our User interface
    const appUser: User = {
      id: updatedUserData.id.toString(),
      organizationId: updatedUserData.organization_id ? updatedUserData.organization_id.toString() : undefined,
      name: `${updatedUserData.first_name} ${updatedUserData.last_name}`.trim(),
      email: updatedUserData.email,
      role: updatedUserData.role,
      status: updatedUserData.status,
      mfaEnabled: updatedUserData.mfa_enabled,
      avatar: updatedUserData.avatar_url,
      createdAt: updatedUserData.created_at,
      updatedAt: updatedUserData.updated_at
    };
    
    return appUser;
  } catch (error) {
    handleSupabaseError(error, 'Disable MFA');
    throw error;
  }
}
