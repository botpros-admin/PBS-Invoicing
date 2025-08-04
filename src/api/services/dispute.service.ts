import { supabase } from '../client';
import { handleSupabaseError } from '../client';
import { ID } from '../../types';

export const submitDispute = async (itemId: ID, reason: string) => {
  try {
    const { data, error } = await supabase
      .from('invoice_line_items')
      .update({ is_disputed: true, dispute_reason: reason })
      .eq('id', itemId);

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'Submit Dispute');
    throw error;
  }
};

export const resolveDispute = async (itemId: ID, resolutionNotes: string) => {
  try {
    const { data, error } = await supabase
      .from('invoice_line_items')
      .update({ is_disputed: false, dispute_resolution_notes: resolutionNotes })
      .eq('id', itemId);

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'Resolve Dispute');
    throw error;
  }
};
