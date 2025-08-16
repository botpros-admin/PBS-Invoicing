/**
 * Custom hook for payment management
 * Handles payment CRUD operations and data fetching
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { useNotifications } from '../context/NotificationContext';

export interface Payment {
  id: string;
  payment_number: string;
  client_id: string;
  client_name?: string;
  amount: number;
  applied_amount: number;
  unapplied_amount: number;
  method: 'check' | 'ach' | 'card' | 'cash' | 'credit';
  check_number?: string;
  reference_number?: string;
  date_received: string;
  status: 'unposted' | 'posted' | 'on_hold' | 'deleted';
  type: 'manual' | 'portal' | 'credit';
  notes?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  organization_id: string;
}

export interface PaymentFilters {
  searchTerm: string;
  statusFilter: string;
  typeFilter: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export const usePayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useNotifications();

  // Fetch all payments
  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          clients:client_id (name)
        `)
        .order('date_received', { ascending: false });

      if (error) throw error;

      const formattedPayments = data?.map(payment => ({
        ...payment,
        client_name: payment.clients?.name
      })) || [];

      setPayments(formattedPayments);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch payments';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  // Create a new payment
  const createPayment = useCallback(async (paymentData: Partial<Payment>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const newPayment = {
        ...paymentData,
        payment_number: `PAY-${Date.now()}`,
        created_by: user?.id,
        updated_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        applied_amount: 0,
        unapplied_amount: paymentData.amount || 0
      };

      const { data, error } = await supabase
        .from('payments')
        .insert([newPayment])
        .select()
        .single();

      if (error) throw error;

      setPayments(prev => [data, ...prev]);
      
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Payment created successfully'
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create payment';
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
      throw err;
    }
  }, [addNotification]);

  // Update a payment
  const updatePayment = useCallback(async (id: string, updates: Partial<Payment>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData = {
        ...updates,
        updated_by: user?.id,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setPayments(prev => prev.map(p => p.id === id ? data : p));
      
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Payment updated successfully'
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update payment';
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
      throw err;
    }
  }, [addNotification]);

  // Delete a payment
  const deletePayment = useCallback(async (id: string) => {
    try {
      // Soft delete by updating status
      await updatePayment(id, { status: 'deleted' });
    } catch (err) {
      throw err;
    }
  }, [updatePayment]);

  // Post a payment
  const postPayment = useCallback(async (id: string) => {
    try {
      await updatePayment(id, { status: 'posted' });
    } catch (err) {
      throw err;
    }
  }, [updatePayment]);

  // Put payment on hold
  const holdPayment = useCallback(async (id: string) => {
    try {
      await updatePayment(id, { status: 'on_hold' });
    } catch (err) {
      throw err;
    }
  }, [updatePayment]);

  // Filter payments
  const filterPayments = useCallback((filters: PaymentFilters): Payment[] => {
    let filtered = [...payments];

    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(payment =>
        payment.payment_number.toLowerCase().includes(searchLower) ||
        payment.client_name?.toLowerCase().includes(searchLower) ||
        payment.check_number?.toLowerCase().includes(searchLower) ||
        payment.reference_number?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.statusFilter && filters.statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === filters.statusFilter);
    }

    // Type filter
    if (filters.typeFilter && filters.typeFilter !== 'all') {
      filtered = filtered.filter(payment => payment.type === filters.typeFilter);
    }

    // Date range filter
    if (filters.dateRange) {
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.date_received);
        const startDate = new Date(filters.dateRange!.start);
        const endDate = new Date(filters.dateRange!.end);
        return paymentDate >= startDate && paymentDate <= endDate;
      });
    }

    return filtered;
  }, [payments]);

  // Initial fetch
  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return {
    payments,
    isLoading,
    error,
    fetchPayments,
    createPayment,
    updatePayment,
    deletePayment,
    postPayment,
    holdPayment,
    filterPayments
  };
};