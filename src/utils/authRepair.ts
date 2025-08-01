/**
 * Authentication Repair Utility
 * 
 * This utility provides functions to diagnose and repair common authentication issues
 * in PBS Invoicing, especially the "phantom user" state problem.
 */

import { supabase } from '../api/supabase';
import { PBS_AUTH_KEY, LAST_ACTIVITY_KEY, updateLastActivity } from './activityTracker';
import { logSessionState } from './sessionDebug';

// No hardcoded admin emails for HIPAA compliance

// Debug markers for tracking repair attempts
const REPAIR_MARKER = 'auth_repair_attempt';
const MAX_AUTO_REPAIRS = 3; // Limit automatic repairs to prevent infinite loops

/**
 * Diagnose current authentication state and report issues
 * @returns Object containing diagnostic information
 */
export async function diagnoseAuthState(): Promise<{
  hasLocalSession: boolean;
  hasValidSession: boolean;
  hasValidTokens: boolean;
  isAdmin: boolean;
  isAdminOverride: boolean;
  isSessionExpired: boolean;
  lastActivity: Date | null;
  issues: string[];
  recommendation: string;
}> {
  // Log current state for developer debugging
  logSessionState();
  
  const issues: string[] = [];
  const storedSession = localStorage.getItem(PBS_AUTH_KEY);
  let hasValidTokens = false;
  let isSessionExpired = false;
  let parsedSession: Record<string, unknown> = null as unknown as Record<string, unknown>;
  
  // Check if we have a session in localStorage
  if (!storedSession) {
    issues.push('No authentication session found in localStorage');
  } else {
    try {
      parsedSession = JSON.parse(storedSession);
      
      // Check if session has required tokens
      if (!parsedSession.access_token) {
        issues.push('Session missing access token');
      }
      if (!parsedSession.refresh_token) {
        issues.push('Session missing refresh token');
      }
      
      hasValidTokens = !!(parsedSession.access_token && parsedSession.refresh_token);
      
      // Check token expiration
      if (parsedSession.expires_at) {
        const expiryTime = (parsedSession.expires_at as number) * 1000;
        isSessionExpired = Date.now() > expiryTime;
        
        if (isSessionExpired) {
          issues.push(`Session token expired at ${new Date(expiryTime).toLocaleString()}`);
        }
      }
    } catch {
      issues.push('Failed to parse session data from localStorage');
    }
  }
  
  // Check activity tracking
  const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
  let lastActivity: Date | null = null;
  
  if (!lastActivityStr) {
    issues.push('No user activity tracking data found');
  } else {
    try {
      const timestamp = parseInt(lastActivityStr);
      lastActivity = new Date(timestamp);
      
      // Check if activity is more than 60 minutes old (default timeout)
      const minutesSinceActivity = (Date.now() - timestamp) / 1000 / 60;
      if (minutesSinceActivity > 60) {
        issues.push(`Last activity was ${minutesSinceActivity.toFixed(0)} minutes ago, session may be inactive`);
      }
    } catch {
      issues.push('Invalid activity timestamp format');
    }
  }
  
  // Check admin override
  const isAdminOverride = localStorage.getItem('admin_user_override') === 'true';
  
  // Check if current JWT has a valid session with Supabase
  const { data: sessionData } = await supabase.auth.getSession();
  const hasValidSession = !!sessionData.session;
  
  if (!hasValidSession) {
    issues.push('No active session found in Supabase auth');
  }
  
  // Get user details if available
  let isAdmin = false;
  if (sessionData.session?.user) {
    // We don't hardcode admin emails anymore for HIPAA compliance
    // Instead, we'll check the database for role information later
    // This keeps the isAdmin flag false until we actually query the database
  }
  
  // Generate recommendation based on issues
  let recommendation = 'No issues detected, authentication appears to be working correctly.';
  
  if (issues.length > 0) {
    if (!storedSession) {
      recommendation = 'You need to log in again. Please navigate to the login page.';
    } else if (isSessionExpired && hasValidTokens) {
      recommendation = 'Your session has expired but can likely be refreshed. Try refreshing the page or running the repair function.';
    } else if (!hasValidSession && hasValidTokens) {
      recommendation = 'You have stored credentials but no active session. Try the repair function to restore your session.';
    } else {
      recommendation = 'Multiple authentication issues detected. Try running the repair function or log out and log in again.';
    }
  }
  
  return {
    hasLocalSession: !!storedSession,
    hasValidSession,
    hasValidTokens,
    isAdmin,
    isAdminOverride,
    isSessionExpired,
    lastActivity,
    issues,
    recommendation
  };
}

/**
 * Attempt to repair common authentication issues
 * @returns Object with success flag and result information
 */
export async function repairAuthState(): Promise<{
  success: boolean;
  message: string;
  fixesApplied: string[];
  requiresReload: boolean;
}> {
  const fixesApplied: string[] = [];
  let requiresReload = false;
  
  // Check if we've tried too many automatic repairs
  const repairCount = parseInt(localStorage.getItem(REPAIR_MARKER) || '0');
  if (repairCount >= MAX_AUTO_REPAIRS) {
    return {
      success: false,
      message: 'Maximum automatic repair attempts reached. Please log out and log in again.',
      fixesApplied,
      requiresReload: false
    };
  }
  
  // Increment and store repair counter
  localStorage.setItem(REPAIR_MARKER, (repairCount + 1).toString());
  
  // Start by diagnosing issues
  const diagnosis = await diagnoseAuthState();
  
  // Don't attempt repair if no issues found
  if (diagnosis.issues.length === 0) {
    return {
      success: true,
      message: 'No authentication issues detected. Session appears to be valid.',
      fixesApplied,
      requiresReload: false
    };
  }
  
  // 1. Update activity timestamp unconditionally
  updateLastActivity();
  fixesApplied.push('Updated user activity timestamp');
  
  // 2. We no longer use admin overrides for HIPAA compliance
  // All privileges now come from the database
  
  // 3. Clean up any invalid session data
  try {
    const storedSession = localStorage.getItem(PBS_AUTH_KEY);
    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession);
        // Check if session data is valid
        if (!parsedSession.access_token || !parsedSession.refresh_token) {
          // Remove invalid session data
          localStorage.removeItem(PBS_AUTH_KEY);
          fixesApplied.push('Removed invalid session data from localStorage');
          requiresReload = true;
        }
      } catch {
        // JSON parse error - clear invalid data
        localStorage.removeItem(PBS_AUTH_KEY);
        fixesApplied.push('Cleared corrupted session JSON data');
        requiresReload = true;
      }
    }
  } catch (sessionError) {
    fixesApplied.push(`Error checking session data: ${(sessionError as Error).message}`);
  }
  
  // 4. Try to recover session if we have valid tokens
  if (diagnosis.hasLocalSession && diagnosis.hasValidTokens && !diagnosis.hasValidSession) {
    try {
      // Parse stored session
      const storedSession = localStorage.getItem(PBS_AUTH_KEY);
      const parsedSession = JSON.parse(storedSession!);
      
      // Attempt session recovery
      const { data: recoveryData, error } = await supabase.auth.setSession({
        access_token: parsedSession.access_token,
        refresh_token: parsedSession.refresh_token 
      });
      
      if (recoveryData.session) {
        fixesApplied.push('Successfully recovered authentication session');
        
        // Store the refreshed session back to localStorage
        localStorage.setItem(PBS_AUTH_KEY, JSON.stringify(recoveryData.session));
        requiresReload = true;
      } else if (error) {
        fixesApplied.push(`Session recovery failed: ${error.message}`);
        
        // If recovery failed with invalid tokens, clear the session
        if (error.message.includes('invalid') || error.message.includes('expired')) {
          localStorage.removeItem(PBS_AUTH_KEY);
          fixesApplied.push('Removed invalid session tokens');
          requiresReload = true;
        }
      }
    } catch (e) {
      fixesApplied.push(`Error during session recovery: ${(e as Error).message}`);
    }
  }
  
  // 5. If session is expired but we have tokens, try to refresh
  if (diagnosis.isSessionExpired && diagnosis.hasValidTokens) {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (data && data.session) {
        fixesApplied.push('Successfully refreshed expired session tokens');
        localStorage.setItem(PBS_AUTH_KEY, JSON.stringify(data.session));
        requiresReload = true;
      } else if (error) {
        fixesApplied.push(`Token refresh failed: ${error.message}`);
        
        // If refresh failed due to invalid token, clear the session
        if (error.message.includes('invalid') || error.message.includes('expired')) {
          localStorage.removeItem(PBS_AUTH_KEY);
          fixesApplied.push('Removed expired session tokens');
          requiresReload = true;
        }
      }
    } catch (e) {
      fixesApplied.push(`Error during token refresh: ${(e as Error).message}`);
    }
  }
  
  // 6. Get proper roles from database for authenticated users
  if (diagnosis.hasValidSession) {
    try {
      // Query user profile from the database to get the correct role
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user && userData.user.email) {
        // Attempt to query the database directly for this user
        try {
          const { data: dbUser, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', userData.user.email.toLowerCase())
            .single();
            
          if (dbUser && !error) {
            // Store true role information in session for use by protected routes
            const session = JSON.parse(localStorage.getItem(PBS_AUTH_KEY) || '{}');
            if (session) {
              if (!session.user) session.user = {};
              session.user.role = dbUser.role;
              localStorage.setItem(PBS_AUTH_KEY, JSON.stringify(session));
              fixesApplied.push(`Updated session with correct role: ${dbUser.role}`);
              requiresReload = true;
            }
          } else {
            fixesApplied.push('User record not found in database');
          }
        } catch (e) {
          fixesApplied.push(`Error during role retrieval: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      fixesApplied.push(`Error during user profile check: ${(e as Error).message}`);
    }
  }
  
  // Determine overall success based on fixes applied
  const success = fixesApplied.some(fix => 
    fix.includes('recovered') || fix.includes('refreshed') || fix.includes('role fix') || 
    fix.includes('Removed invalid') || fix.includes('Cleared corrupted')
  );
  
  // Generate appropriate message
  let message = success
    ? 'Authentication repaired successfully!'
    : 'Could not fully repair authentication. A logout and login may be required.';
    
  // Add reload recommendation if needed
  if (requiresReload) {
    message += ' The page will be reloaded to apply changes.';
  }
  
  return {
    success,
    message,
    fixesApplied,
    requiresReload
  };
}

/**
 * Fix authentication issues and reload if necessary
 * This function can be called from the UI when a user experiences problems
 */
export async function fixAndReloadIfNeeded(): Promise<void> {
  try {
    console.log('Running auth repair utility...');
    const result = await repairAuthState();
    
    // Display result to user
    if (result.success) {
      alert(`Auth repair successful: ${result.message}`);
    } else {
      alert(`Auth repair attempt: ${result.message}`);
    }
    
    // Log details to console
    console.log('Auth repair result:', result);
    
    // Reload if needed
    if (result.requiresReload) {
      window.location.reload();
    }
  } catch (e) {
    console.error('Error in auth repair:', e);
    alert(`Auth repair failed with error: ${(e as Error).message}`);
  }
}

/**
 * Reset repair tracking counters
 * Call this on successful login to reset repair attempt counter
 */
export function resetRepairTracking(): void {
  localStorage.removeItem(REPAIR_MARKER);
}
