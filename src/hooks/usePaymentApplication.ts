/**
 * Custom hook for payment application to invoices
 * Handles the logic for applying payments to specific invoices and line items
 */

import { useState, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { useNotifications } from '../context/NotificationContext';

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  amount: number;
  balance: number;
  status: string;
  date: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
  quantity: number;
  total: number;
  status: 'pending' | 'paid' | 'disputed';
  dispute_reason?: string;
}

export interface PaymentApplication {
  payment_id: string;
  invoice_id: string;
  amount: number;
  items?: {
    item_id: string;
    amount: number;
    dispute?: boolean;
    dispute_reason?: string;
  }[];
  created_at?: string;
  created_by?: string;
}

export const usePaymentApplication = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);
  const { addNotification } = useNotifications();

  // Fetch invoices for a specific client
  const fetchClientInvoices = useCallback(async (clientId: string) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items (*)
        `)
        .eq('client_id', clientId)
        .eq('status', 'pending')
        .order('date', { ascending: true });

      if (error) throw error;

      const formattedInvoices = data?.map(invoice => ({
        ...invoice,
        items: invoice.invoice_items || []
      })) || [];

      setClientInvoices(formattedInvoices);
      return formattedInvoices;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch invoices';
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  // Apply payment to invoices
  const applyPayment = useCallback(async (
    paymentId: string,
    applications: PaymentApplication[]
  ) => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Start a transaction
      const applicationPromises = applications.map(async (application) => {
        // Create payment application record
        const { error: appError } = await supabase
          .from('payment_applications')
          .insert({
            payment_id: paymentId,
            invoice_id: application.invoice_id,
            amount: application.amount,
            created_by: user?.id,
            created_at: new Date().toISOString()
          });

        if (appError) throw appError;

        // Update invoice balance
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select('balance')
          .eq('id', application.invoice_id)
          .single();

        if (invoiceError) throw invoiceError;

        const newBalance = (invoice.balance || 0) - application.amount;
        const newStatus = newBalance <= 0 ? 'paid' : 'partial';

        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            balance: newBalance,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', application.invoice_id);

        if (updateError) throw updateError;

        // Handle line item applications if any
        if (application.items && application.items.length > 0) {
          const itemPromises = application.items.map(async (item) => {
            const { error: itemError } = await supabase
              .from('payment_application_items')
              .insert({
                payment_id: paymentId,
                invoice_id: application.invoice_id,
                item_id: item.item_id,
                amount: item.amount,
                dispute: item.dispute || false,
                dispute_reason: item.dispute_reason,
                created_at: new Date().toISOString()
              });

            if (itemError) throw itemError;

            // Update line item status
            const itemStatus = item.dispute ? 'disputed' : 'paid';
            const { error: itemUpdateError } = await supabase
              .from('invoice_items')
              .update({
                status: itemStatus,
                dispute_reason: item.dispute_reason,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.item_id);

            if (itemUpdateError) throw itemUpdateError;
          });

          await Promise.all(itemPromises);
        }
      });

      await Promise.all(applicationPromises);

      // Update payment applied amounts
      const totalApplied = applications.reduce((sum, app) => sum + app.amount, 0);
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('amount, applied_amount')
        .eq('id', paymentId)
        .single();

      if (paymentError) throw paymentError;

      const newAppliedAmount = (payment.applied_amount || 0) + totalApplied;
      const newUnappliedAmount = payment.amount - newAppliedAmount;

      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({
          applied_amount: newAppliedAmount,
          unapplied_amount: newUnappliedAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (updatePaymentError) throw updatePaymentError;

      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Payment applied successfully'
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply payment';
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  // Unapply payment from invoice
  const unapplyPayment = useCallback(async (
    paymentId: string,
    invoiceId: string
  ) => {
    setIsLoading(true);
    
    try {
      // Get application details
      const { data: application, error: appError } = await supabase
        .from('payment_applications')
        .select('amount')
        .eq('payment_id', paymentId)
        .eq('invoice_id', invoiceId)
        .single();

      if (appError) throw appError;

      // Delete application record
      const { error: deleteError } = await supabase
        .from('payment_applications')
        .delete()
        .eq('payment_id', paymentId)
        .eq('invoice_id', invoiceId);

      if (deleteError) throw deleteError;

      // Update invoice balance
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('balance, amount')
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      const newBalance = (invoice.balance || 0) + application.amount;
      const newStatus = newBalance >= invoice.amount ? 'pending' : 'partial';

      const { error: updateInvoiceError } = await supabase
        .from('invoices')
        .update({
          balance: newBalance,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (updateInvoiceError) throw updateInvoiceError;

      // Update payment amounts
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('applied_amount, unapplied_amount')
        .eq('id', paymentId)
        .single();

      if (paymentError) throw paymentError;

      const newAppliedAmount = (payment.applied_amount || 0) - application.amount;
      const newUnappliedAmount = (payment.unapplied_amount || 0) + application.amount;

      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({
          applied_amount: newAppliedAmount,
          unapplied_amount: newUnappliedAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (updatePaymentError) throw updatePaymentError;

      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Payment unapplied successfully'
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unapply payment';
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  // Calculate auto-application suggestions
  const calculateAutoApplication = useCallback((
    paymentAmount: number,
    invoices: Invoice[]
  ): PaymentApplication[] => {
    const applications: PaymentApplication[] = [];
    let remainingAmount = paymentAmount;

    // Apply to oldest invoices first (FIFO)
    const sortedInvoices = [...invoices].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const invoice of sortedInvoices) {
      if (remainingAmount <= 0) break;

      const applicationAmount = Math.min(remainingAmount, invoice.balance);
      if (applicationAmount > 0) {
        applications.push({
          payment_id: '',
          invoice_id: invoice.id,
          amount: applicationAmount
        });
        remainingAmount -= applicationAmount;
      }
    }

    return applications;
  }, []);

  return {
    isLoading,
    clientInvoices,
    fetchClientInvoices,
    applyPayment,
    unapplyPayment,
    calculateAutoApplication
  };
};