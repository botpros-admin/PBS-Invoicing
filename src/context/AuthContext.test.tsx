/**
 * Authentication Context Test Suite
 * CRITICAL: Ensures proper authentication and authorization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '../api/supabase';

// Mock Supabase
vi.mock('../api/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
      getUser: vi.fn(),
      refreshSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(),
        })),
      })),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
    rpc: vi.fn(),
  },
}));

describe('AuthContext - CRITICAL AUTHENTICATION FLOW', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {},
  };

  const mockSession = {
    user: mockUser,
    access_token: 'test-token',
    refresh_token: 'refresh-token',
    expires_at: Date.now() + 3600000, // 1 hour from now
  };

  const mockStaffProfile = {
    id: 'staff-id',
    auth_id: 'test-user-id',
    name: 'Test Staff',
    role: 'admin',
    status: 'active',
    organization_id: 'org-123',
    created_at: '2024-01-01',
  };

  const mockRole = {
    id: 'role-id',
    name: 'Admin',
    permissions: [
      { resource: 'invoices', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'payments', actions: ['create', 'read', 'update'] },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      // Return a mock subscription
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('Initial Authentication State', () => {
    it('should initialize with loading state', () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
    });

    it('should load existing session on mount', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockStaffProfile,
              error: null,
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('test@example.com');
    });
  });

  describe('Login Flow', () => {
    it('should successfully login with valid credentials', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const response = await result.current.login('test@example.com', 'password123');
        expect(response.error).toBeUndefined();
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle login failure with invalid credentials', async () => {
      const mockError = new Error('Invalid login credentials');
      
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const response = await result.current.login('test@example.com', 'wrongpassword');
        expect(response.error).toBeDefined();
        expect(response.error?.message).toBe('Invalid login credentials');
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should set user context after successful login', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(supabase.rpc).toHaveBeenCalledWith('set_user_context', {
        user_id: 'test-user-id',
      });
    });
  });

  describe('Logout Flow', () => {
    it('should successfully logout', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should clear user data after logout', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockStaffProfile,
              error: null,
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null,
      });

      // Simulate auth state change to logged out
      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
        callback('SIGNED_OUT', null);
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Permission Checks - CRITICAL FOR AUTHORIZATION', () => {
    it('should correctly check user permissions', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock user profile with role
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockStaffProfile, role_id: 'role-id' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockRole,
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        } as any;
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasPermission('invoices', 'create')).toBe(true);
      expect(result.current.hasPermission('invoices', 'delete')).toBe(true);
      expect(result.current.hasPermission('payments', 'delete')).toBe(false);
      expect(result.current.hasPermission('reports', 'read')).toBe(false);
    });

    it('should check if user has any permission for a resource', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockStaffProfile, role_id: 'role-id' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockRole,
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        } as any;
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasAnyPermission('invoices')).toBe(true);
      expect(result.current.hasAnyPermission('payments')).toBe(true);
      expect(result.current.hasAnyPermission('settings')).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should handle session expiration', async () => {
      const expiredSession = {
        ...mockSession,
        expires_at: Date.now() - 1000, // Expired 1 second ago
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: expiredSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should attempt to refresh session
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle auth state changes', async () => {
      let authCallback: any;
      
      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
        authCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Simulate token refresh
      act(() => {
        authCallback('TOKEN_REFRESHED', mockSession);
      });

      await waitFor(() => {
        expect(result.current.session).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors when fetching user profile', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error'),
            }),
          }),
        }),
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should handle error gracefully
      expect(result.current.user).toBe(null);
    });

    it('should handle RPC errors when setting user context', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      vi.mocked(supabase.rpc).mockRejectedValue(new Error('RPC error'));

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Should not throw, just log warning
      await act(async () => {
        const response = await result.current.login('test@example.com', 'password123');
        expect(response.error).toBeUndefined();
      });
    });
  });
});