import { supabase } from '../../lib/supabaseClient';

interface SessionConfig {
  timeoutMinutes: number;
  warningMinutes: number;
  extendOnActivity: boolean;
}

class SessionManager {
  private config: SessionConfig = {
    timeoutMinutes: 30, // HIPAA requirement from transcripts
    warningMinutes: 5,
    extendOnActivity: true
  };
  
  private lastActivity: Date = new Date();
  private warningShown: boolean = false;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private warningTimer: NodeJS.Timeout | null = null;
  private activityListeners: Array<keyof WindowEventMap> = [
    'mousedown',
    'mousemove', 
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ];

  constructor() {
    this.initializeSessionManagement();
  }

  private initializeSessionManagement() {
    // Set up activity listeners
    this.activityListeners.forEach(event => {
      window.addEventListener(event, this.handleActivity.bind(this), true);
    });

    // Start the timeout timer
    this.startTimeoutTimer();
    
    // Check for existing session
    this.checkExistingSession();

    // Set up visibility change handler
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  private handleActivity = () => {
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - this.lastActivity.getTime();
    
    // Only update if more than 1 minute has passed (to avoid excessive updates)
    if (timeSinceLastActivity > 60000) {
      this.lastActivity = now;
      
      if (this.config.extendOnActivity) {
        this.resetTimers();
      }

      // Log activity for audit
      this.logActivity();
    }
  };

  private handleVisibilityChange = () => {
    if (document.hidden) {
      // Tab is hidden, might want to be more aggressive with timeout
      console.log('Tab hidden, session timeout continues');
    } else {
      // Tab is visible again, check if session is still valid
      this.checkSessionValidity();
    }
  };

  private startTimeoutTimer() {
    this.clearTimers();

    // Set warning timer (5 minutes before timeout)
    const warningTime = (this.config.timeoutMinutes - this.config.warningMinutes) * 60 * 1000;
    this.warningTimer = setTimeout(() => {
      this.showTimeoutWarning();
    }, warningTime);

    // Set actual timeout timer
    const timeoutTime = this.config.timeoutMinutes * 60 * 1000;
    this.timeoutTimer = setTimeout(() => {
      this.handleSessionTimeout();
    }, timeoutTime);
  }

  private resetTimers() {
    this.warningShown = false;
    this.startTimeoutTimer();
  }

  private clearTimers() {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  private showTimeoutWarning() {
    if (this.warningShown) return;
    
    this.warningShown = true;
    
    // Dispatch custom event that components can listen to
    const event = new CustomEvent('session-warning', {
      detail: {
        minutesRemaining: this.config.warningMinutes,
        canExtend: this.config.extendOnActivity
      }
    });
    window.dispatchEvent(event);

    // Also show a notification if the notification API is available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Session Expiring Soon', {
        body: `Your session will expire in ${this.config.warningMinutes} minutes. Please save your work.`,
        icon: '/icon-192x192.png',
        requireInteraction: true
      });
    }
  }

  private async handleSessionTimeout() {
    console.log('Session timeout reached');
    
    // Log the timeout event
    await this.logSessionEvent('timeout');

    // Clear local storage
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.clear();

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Dispatch timeout event
    const event = new CustomEvent('session-timeout', {
      detail: { reason: 'inactivity' }
    });
    window.dispatchEvent(event);

    // Redirect to login
    window.location.href = '/login?reason=timeout';
  }

  private async checkExistingSession() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // Check if session is still valid
      const sessionAge = Date.now() - new Date(session.created_at || '').getTime();
      const maxAge = this.config.timeoutMinutes * 60 * 1000;
      
      if (sessionAge > maxAge) {
        await this.handleSessionTimeout();
      }
    }
  }

  private async checkSessionValidity() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      await this.handleSessionTimeout();
    }
  }

  private async logActivity() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Update last activity timestamp in database
        await supabase
          .from('user_sessions')
          .upsert({
            user_id: user.id,
            last_activity: new Date().toISOString(),
            ip_address: await this.getIPAddress(),
            user_agent: navigator.userAgent
          }, {
            onConflict: 'user_id'
          });
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  private async logSessionEvent(eventType: 'login' | 'logout' | 'timeout' | 'extend') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from('audit_logs')
          .insert({
            user_id: user.id,
            action: `session_${eventType}`,
            resource_type: 'session',
            ip_address: await this.getIPAddress(),
            user_agent: navigator.userAgent,
            metadata: {
              timestamp: new Date().toISOString(),
              session_duration: Date.now() - this.lastActivity.getTime()
            }
          });
      }
    } catch (error) {
      console.error('Failed to log session event:', error);
    }
  }

  private async getIPAddress(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  public extendSession() {
    this.lastActivity = new Date();
    this.resetTimers();
    this.logSessionEvent('extend');
  }

  public updateConfig(config: Partial<SessionConfig>) {
    this.config = { ...this.config, ...config };
    this.resetTimers();
  }

  public destroy() {
    this.clearTimers();
    this.activityListeners.forEach(event => {
      window.removeEventListener(event, this.handleActivity, true);
    });
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Export types
export type { SessionConfig };

// Export session hooks for React components
export function useSessionWarning(callback: (minutesRemaining: number) => void) {
  useEffect(() => {
    const handleWarning = (event: CustomEvent) => {
      callback(event.detail.minutesRemaining);
    };

    window.addEventListener('session-warning' as any, handleWarning);
    return () => {
      window.removeEventListener('session-warning' as any, handleWarning);
    };
  }, [callback]);
}

export function useSessionTimeout(callback: () => void) {
  useEffect(() => {
    const handleTimeout = () => {
      callback();
    };

    window.addEventListener('session-timeout' as any, handleTimeout);
    return () => {
      window.removeEventListener('session-timeout' as any, handleTimeout);
    };
  }, [callback]);
}

// Import React hooks
import { useEffect } from 'react';