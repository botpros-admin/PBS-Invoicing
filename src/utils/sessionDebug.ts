/**
 * Session Debugging Utilities
 * 
 * This module provides tools to debug authentication session state
 * and help troubleshoot the "phantom user" issue.
 */

import { PBS_AUTH_KEY, LAST_ACTIVITY_KEY } from './activityTracker';

/**
 * Log detailed session state information to console
 */
export function logSessionState() {
  console.group("🔍 Session Debug Info");
  
  // Check localStorage
  const storedSession = localStorage.getItem(PBS_AUTH_KEY);
  console.log("Session in localStorage:", storedSession ? "exists" : "missing");
  
  if (storedSession) {
    try {
      const parsed = JSON.parse(storedSession);
      console.log("Access token exists:", !!parsed.access_token);
      console.log("Refresh token exists:", !!parsed.refresh_token);
      console.log("Token expires at:", new Date(parsed.expires_at * 1000).toLocaleString());
      console.log("Token expired:", Date.now() > parsed.expires_at * 1000);
      
      // Show token first/last 5 chars for debugging (not the whole token for security)
      if (parsed.access_token) {
        const token = parsed.access_token;
        console.log("Token prefix/suffix:", 
          `${token.substring(0, 5)}...${token.substring(token.length - 5)}`);
      }
    } catch (e) {
      console.error("Failed to parse session:", e);
    }
  }
  
  // Check activity timestamp
  const activity = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (activity) {
    const timestamp = parseInt(activity);
    const timeAgo = (Date.now() - timestamp) / 1000 / 60;
    console.log(`Last activity: ${timeAgo.toFixed(1)} minutes ago`);
  } else {
    console.log("No activity timestamp found");
  }
  
  // Check admin override
  const adminOverride = localStorage.getItem('admin_user_override');
  console.log("Admin override:", adminOverride ? "ACTIVE" : "INACTIVE");
  
  // Check session debug markers
  const debugTimestamp = localStorage.getItem('auth_debug_timestamp');
  if (debugTimestamp) {
    console.log("Debug timestamp:", new Date(parseInt(debugTimestamp)).toLocaleString());
  }
  
  // Check remembered email (login persistence)
  const rememberedEmail = localStorage.getItem('remembered_email');
  console.log("Remembered email:", rememberedEmail || "NONE");
  
  console.groupEnd();
}

/**
 * Add a debug marker for session state
 * @param marker Identifier for the debug marker
 */
export function addSessionDebugMarker(marker: string) {
  localStorage.setItem('auth_debug_marker', marker);
  localStorage.setItem('auth_debug_timestamp', Date.now().toString());
}

/**
 * Remove all debug markers
 */
export function clearSessionDebugMarkers() {
  localStorage.removeItem('auth_debug_marker');
  localStorage.removeItem('auth_debug_timestamp');
}
