import { supabase } from '../client';
import { handleSupabaseError } from '../client';
import { ID } from '../../types';

export const getPriceSchedules = async () => {
  try {
    const { data, error } = await supabase
      .from('price_schedules')
      .select('*');

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'Get Price Schedules');
    throw error;
  }
};

export const createPriceSchedule = async (scheduleData: any) => {
  try {
    const { data, error } = await supabase
      .from('price_schedules')
      .insert(scheduleData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'Create Price Schedule');
    throw error;
  }
};

export const updatePriceSchedule = async (scheduleId: ID, scheduleData: any) => {
  try {
    const { data, error } = await supabase
      .from('price_schedules')
      .update(scheduleData)
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'Update Price Schedule');
    throw error;
  }
};
