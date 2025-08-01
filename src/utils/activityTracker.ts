/**
 * Activity Tracker
 * 
 * This utility helps prevent auto-logout issues by tracking user activity
 * and updating a timestamp when the user interacts with the application.
 */

// Key for storing the last activity timestamp in localStorage
export const LAST_ACTIVITY_KEY = 'pbs_invoicing_last_activity';

// Activity timeout in milliseconds (60 minutes by default for better user experience)
const ACTIVITY_TIMEOUT = 60 * 60 * 1000;

// Store key for PBS auth state - DO NOT MODIFY THIS KEY directly with activity tracking
export const PBS_AUTH_KEY = 'pbs_invoicing_auth';

/**
 * Initialize the activity tracker by setting up event listeners
 * and updating the initial timestamp.
 */
export function initActivityTracker(): void {
  // Set initial timestamp
  updateLastActivity();
  
  // Set up event listeners for user activity
  window.addEventListener('mousemove', handleUserActivity);
  window.addEventListener('mousedown', handleUserActivity);
  window.addEventListener('keypress', handleUserActivity);
  window.addEventListener('touchstart', handleUserActivity);
  window.addEventListener('scroll', handleUserActivity);
}

// Alias for backward compatibility
export const initActivityTracking = initActivityTracker;

/**
 * Event handler for user activity events
 */
function handleUserActivity(): void {
  updateLastActivity();
}

/**
 * Update the last activity timestamp to the current time
 */
export function updateLastActivity(): void {
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

/**
 * Check if the user has been inactive for longer than the timeout period
 * @returns {boolean} True if the user is inactive, false otherwise
 */
export function isUserInactive(): boolean {
  const lastActivity = getLastActivity();
  const now = Date.now();
  
  return now - lastActivity > ACTIVITY_TIMEOUT;
}

/**
 * Check if the user's session is still active based on activity
 * @returns {boolean} True if the session is active, false otherwise
 */
export function isSessionActiveByActivity(): boolean {
  return !isUserInactive();
}

/**
 * Get the timestamp of the last user activity
 * @returns {number} Timestamp of the last activity
 */
export function getLastActivity(): number {
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
  return lastActivity ? parseInt(lastActivity, 10) : Date.now();
}

/**
 * Clean up event listeners when no longer needed
 */
export function cleanupActivityTracker(): void {
  window.removeEventListener('mousemove', handleUserActivity);
  window.removeEventListener('mousedown', handleUserActivity);
  window.removeEventListener('keypress', handleUserActivity);
  window.removeEventListener('touchstart', handleUserActivity);
  window.removeEventListener('scroll', handleUserActivity);
}

// Alias for backward compatibility
export const cleanupActivityTracking = cleanupActivityTracker;
