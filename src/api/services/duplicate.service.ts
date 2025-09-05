import { supabase } from '../supabase';
import { handleSupabaseError } from '../client';
import { DuplicateReviewItem, ID } from '../../types';

const DUPLICATE_REVIEW_QUEUE_TABLE = 'duplicate_review_queue';
const AUDIT_TRAIL_TABLE = 'audit_trail';
const INVOICE_ITEMS_TABLE = 'invoice_items';

/**
 * Fetches items from the duplicate review queue.
 * @param organizationId - The ID of the organization.
 * @param status - The status of items to fetch (e.g., 'pending').
 */
export const getDuplicateReviewItems = async (organizationId: ID, status: string = 'pending'): Promise<DuplicateReviewItem[]> => {
  const { data, error } = await supabase
    .from(DUPLICATE_REVIEW_QUEUE_TABLE)
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) handleSupabaseError(error);
  return data || [];
};

interface ResolveDuplicateArgs {
  itemId: ID;
  action: 'approve' | 'reject';
  userId: ID;
  reason: string;
}

/**
 * Resolves an item in the duplicate review queue.
 * This is the "push through" or "reject" action.
 * @param args - The arguments for resolving the duplicate.
 */
export const resolveDuplicateItem = async ({ itemId, action, userId, reason }: ResolveDuplicateArgs): Promise<void> => {
  // Step 1: Log the action in the audit trail
  const { error: auditError } = await supabase
    .from(AUDIT_TRAIL_TABLE)
    .insert({
      user_id: userId,
      action: `duplicate_review_${action}`,
      entity_type: 'duplicate_review_queue',
      entity_id: itemId,
      reason: reason,
      details: {
        message: `User ${action}d duplicate item ${itemId}.`,
      },
    });

  if (auditError) handleSupabaseError(auditError);

  // Step 2: Update the status of the item in the queue
  const { error: updateError } = await supabase
    .from(DUPLICATE_REVIEW_QUEUE_TABLE)
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  if (updateError) handleSupabaseError(updateError);
};

interface RealtimeCheckArgs {
  accessionNumber: string;
  cptCode: string;
  organizationId: ID;
  currentItemId?: ID; // Optional: to exclude the item currently being edited
}

interface RealtimeCheckResult {
  isDuplicate: boolean;
  message?: string;
}

/**
 * Performs a real-time check for a duplicate invoice item.
 * @param args - The arguments for the check.
 */
export const checkForDuplicateRealtime = async ({ accessionNumber, cptCode, organizationId, currentItemId }: RealtimeCheckArgs): Promise<RealtimeCheckResult> => {
  if (!accessionNumber || !cptCode || !organizationId) {
    return { isDuplicate: false };
  }

  let query = supabase
    .from(INVOICE_ITEMS_TABLE)
    .select('id, invoices(invoice_number)')
    .eq('organization_id', organizationId)
    .eq('accession_number', accessionNumber)
    .eq('cpt_code', cptCode)
    .limit(1)
    .single();

  if (currentItemId) {
    query = query.neq('id', currentItemId);
  }

  const { data, error } = await query;

  if (error && error.code !== 'PGRST116') { // Ignore "Not found" errors
    handleSupabaseError(error);
  }

  if (data) {
    return {
      isDuplicate: true,
      message: `This combination already exists in invoice #${data.invoices?.invoice_number || 'N/A'}.`,
    };
  }

  return { isDuplicate: false };
};
