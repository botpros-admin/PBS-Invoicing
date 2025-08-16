import { supabase } from '@/lib/supabase/client';
import type { 
  PaymentCredit, 
  CreditApplication, 
  CreateCreditParams, 
  ApplyCreditParams,
  CreditSummary 
} from '@/types/paymentCredit';
import { handleSupabaseError } from '@/lib/supabase/client';

/**
 * Create a payment credit from an overpayment
 */
export async function createPaymentCredit(params: CreateCreditParams): Promise<PaymentCredit> {
  try {
    const { data, error } = await supabase
      .rpc('create_credit_from_overpayment', {
        p_payment_id: params.paymentId,
        p_client_id: params.clientId,
        p_overpayment_amount: params.amount,
        p_notes: params.notes || null
      });

    if (error) throw error;

    // Fetch the created credit
    const { data: credit, error: fetchError } = await supabase
      .from('payment_credits')
      .select('*')
      .eq('id', data)
      .single();

    if (fetchError) throw fetchError;

    return transformCredit(credit);
  } catch (error) {
    handleSupabaseError(error, 'Create Payment Credit');
    throw error;
  }
}

/**
 * Apply a credit to an invoice
 */
export async function applyCreditToInvoice(params: ApplyCreditParams): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('apply_credit_to_invoice', {
        p_credit_id: params.creditId,
        p_invoice_id: params.invoiceId,
        p_amount: params.amount || null
      });

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'Apply Credit to Invoice');
    throw error;
  }
}

/**
 * Get available credits for a client
 */
export async function getClientCredits(clientId: string): Promise<PaymentCredit[]> {
  try {
    const { data, error } = await supabase
      .from('payment_credits')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'available')
      .gt('remaining_amount', 0)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(transformCredit);
  } catch (error) {
    handleSupabaseError(error, 'Get Client Credits');
    throw error;
  }
}

/**
 * Get all credits for a client (including applied and expired)
 */
export async function getAllClientCredits(clientId: string): Promise<PaymentCredit[]> {
  try {
    const { data, error } = await supabase
      .from('payment_credits')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformCredit);
  } catch (error) {
    handleSupabaseError(error, 'Get All Client Credits');
    throw error;
  }
}

/**
 * Get credit applications for an invoice
 */
export async function getInvoiceCreditApplications(invoiceId: string): Promise<CreditApplication[]> {
  try {
    const { data, error } = await supabase
      .from('credit_applications')
      .select(`
        *,
        credit:payment_credits(*)
      `)
      .eq('invoice_id', invoiceId)
      .order('applied_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformCreditApplication);
  } catch (error) {
    handleSupabaseError(error, 'Get Invoice Credit Applications');
    throw error;
  }
}

/**
 * Get credit summary for a client
 */
export async function getClientCreditSummary(clientId: string): Promise<CreditSummary> {
  try {
    // Get client info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', clientId)
      .single();

    if (clientError) throw clientError;

    // Get all credits
    const credits = await getAllClientCredits(clientId);

    // Calculate summary
    const summary: CreditSummary = {
      clientId: client.id,
      clientName: client.name,
      totalCredits: 0,
      availableCredits: 0,
      appliedCredits: 0,
      expiredCredits: 0,
      credits
    };

    credits.forEach(credit => {
      summary.totalCredits += credit.amount;
      
      switch (credit.status) {
        case 'available':
          summary.availableCredits += credit.remainingAmount;
          break;
        case 'applied':
          summary.appliedCredits += credit.amount;
          break;
        case 'expired':
          summary.expiredCredits += credit.amount;
          break;
      }
    });

    return summary;
  } catch (error) {
    handleSupabaseError(error, 'Get Client Credit Summary');
    throw error;
  }
}

/**
 * Check and expire old credits
 */
export async function expireOldCredits(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('payment_credits')
      .update({ 
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'available')
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    handleSupabaseError(error, 'Expire Old Credits');
    throw error;
  }
}

/**
 * Cancel a credit
 */
export async function cancelCredit(creditId: string, reason?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('payment_credits')
      .update({ 
        status: 'refunded',
        notes: reason || 'Credit cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', creditId)
      .eq('status', 'available');

    if (error) throw error;
    return true;
  } catch (error) {
    handleSupabaseError(error, 'Cancel Credit');
    throw error;
  }
}

/**
 * Transform database credit to frontend type
 */
function transformCredit(credit: any): PaymentCredit {
  return {
    id: credit.id,
    paymentId: credit.payment_id,
    clientId: credit.client_id,
    amount: credit.amount,
    remainingAmount: credit.remaining_amount,
    status: credit.status,
    appliedToInvoiceId: credit.applied_to_invoice_id,
    appliedAt: credit.applied_at,
    expiresAt: credit.expires_at,
    notes: credit.notes,
    createdAt: credit.created_at,
    updatedAt: credit.updated_at,
    createdBy: credit.created_by,
    updatedBy: credit.updated_by
  };
}

/**
 * Transform database credit application to frontend type
 */
function transformCreditApplication(app: any): CreditApplication {
  return {
    id: app.id,
    creditId: app.credit_id,
    invoiceId: app.invoice_id,
    amountApplied: app.amount_applied,
    appliedAt: app.applied_at,
    appliedBy: app.applied_by,
    notes: app.notes
  };
}