import { PublicClientApplication, Configuration, AuthenticationResult } from '@azure/msal-browser';
import { supabase } from '../../api/supabase';

// Microsoft Azure AD configuration
const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || 'your-client-id',
    authority: import.meta.env.VITE_AZURE_AUTHORITY || 'https://login.microsoftonline.com/common',
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin + '/auth/callback',
    postLogoutRedirectUri: window.location.origin
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false
  }
};

// Scopes for Microsoft Graph API
const loginRequest = {
  scopes: ['User.Read', 'email', 'profile', 'openid']
};

class MicrosoftAuthService {
  private msalInstance: PublicClientApplication;
  private account: any = null;

  constructor() {
    this.msalInstance = new PublicClientApplication(msalConfig);
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      // Handle redirect promise
      await this.msalInstance.handleRedirectPromise();
      
      // Check if user is already logged in
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        this.account = accounts[0];
      }
    } catch (error) {
    }
  }

  /**
   * Sign in with Microsoft account
   */
  async signIn(): Promise<AuthenticationResult | null> {
    try {
      // Try popup first, fallback to redirect
      try {
        const response = await this.msalInstance.loginPopup(loginRequest);
        this.account = response.account;
        
        // Exchange Microsoft token for Supabase session
        await this.exchangeTokenForSupabaseSession(response);
        
        return response;
      } catch (popupError) {
        await this.msalInstance.loginRedirect(loginRequest);
        return null;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sign out from Microsoft account
   */
  async signOut(): Promise<void> {
    try {
      if (this.account) {
        const logoutRequest = {
          account: this.account,
          postLogoutRedirectUri: window.location.origin
        };
        
        await this.msalInstance.logoutPopup(logoutRequest);
        this.account = null;
      }
    } catch (error) {
      // Fallback to redirect
      await this.msalInstance.logoutRedirect();
    }
  }

  /**
   * Get current user profile from Microsoft Graph
   */
  async getUserProfile(): Promise<any> {
    try {
      if (!this.account) {
        throw new Error('No user signed in');
      }

      // Get access token
      const tokenResponse = await this.msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: this.account
      });

      // Call Microsoft Graph API
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Exchange Microsoft token for Supabase session
   */
  private async exchangeTokenForSupabaseSession(authResult: AuthenticationResult): Promise<void> {
    try {
      // Call Supabase function to validate Microsoft token and create session
      const { data, error } = await supabase.functions.invoke('microsoft-auth-callback', {
        body: {
          id_token: authResult.idToken,
          access_token: authResult.accessToken,
          account: {
            username: authResult.account?.username,
            name: authResult.account?.name,
            email: authResult.account?.username // Email is usually the username
          }
        }
      });

      if (error) throw error;

      // Set Supabase session
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.account !== null;
  }

  /**
   * Get current account
   */
  getAccount(): any {
    return this.account;
  }

  /**
   * Acquire token silently
   */
  async acquireToken(): Promise<string | null> {
    try {
      if (!this.account) return null;

      const response = await this.msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: this.account
      });

      return response.accessToken;
    } catch (error) {
      // Try interactive method
      try {
        const response = await this.msalInstance.acquireTokenPopup(loginRequest);
        return response.accessToken;
      } catch (popupError) {
        return null;
      }
    }
  }

  /**
   * Configure SSO for enterprise
   */
  async configureSSOForTenant(tenantId: string): Promise<void> {
    // Update authority with tenant ID
    const tenantConfig: Configuration = {
      ...msalConfig,
      auth: {
        ...msalConfig.auth,
        authority: `https://login.microsoftonline.com/${tenantId}`
      }
    };

    // Reinitialize with tenant-specific config
    this.msalInstance = new PublicClientApplication(tenantConfig);
    await this.initializeAuth();
  }

  /**
   * Enable conditional access policies
   */
  async checkConditionalAccess(): Promise<boolean> {
    try {
      // Try to acquire token with specific claims
      const response = await this.msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: this.account,
        claims: JSON.stringify({
          access_token: {
            acrs: {
              essential: true,
              values: ['c1', 'c2'] // Conditional access policy identifiers
            }
          }
        })
      });

      return true;
    } catch (error: any) {
      if (error.errorCode === 'interaction_required') {
        // User needs to complete MFA or other requirements
        return false;
      }
      throw error;
    }
  }
}

export const microsoftAuth = new MicrosoftAuthService();

// Hook for React components
export const useMicrosoftAuth = () => {
  const signIn = async () => {
    return await microsoftAuth.signIn();
  };

  const signOut = async () => {
    return await microsoftAuth.signOut();
  };

  const getProfile = async () => {
    return await microsoftAuth.getUserProfile();
  };

  const isAuthenticated = () => {
    return microsoftAuth.isAuthenticated();
  };

  return {
    signIn,
    signOut,
    getProfile,
    isAuthenticated,
    account: microsoftAuth.getAccount()
  };
};