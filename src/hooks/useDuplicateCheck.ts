import { useState, useCallback, useRef } from 'react';
import { supabase } from '../api/supabase';
import debounce from 'lodash/debounce';

interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingInvoiceId?: string;
  existingInvoiceNumber?: string;
  existingServiceDate?: string;
  message?: string;
}

export const useDuplicateCheck = (organizationId: string) => {
  const [duplicateWarnings, setDuplicateWarnings] = useState<Map<string, DuplicateCheckResult>>(new Map());
  const [checking, setChecking] = useState(false);
  const checkCache = useRef<Map<string, DuplicateCheckResult>>(new Map());

  // Debounced check function to avoid too many API calls
  const debouncedCheck = useRef(
    debounce(async (accessionNumber: string, cptCode: string, rowId: string) => {
      if (!accessionNumber || !cptCode || !organizationId) {
        return;
      }

      const cacheKey = `${accessionNumber}|${cptCode}`;
      
      // Check cache first
      if (checkCache.current.has(cacheKey)) {
        const cached = checkCache.current.get(cacheKey)!;
        setDuplicateWarnings(prev => new Map(prev).set(rowId, cached));
        return;
      }

      setChecking(true);

      try {
        const { data, error } = await supabase
          .from('invoice_items')
          .select(`
            id,
            invoice_id,
            service_date,
            invoices (
              invoice_number,
              status
            )
          `)
          .eq('organization_id', organizationId)
          .eq('accession_number', accessionNumber)
          .eq('cpt_code', cptCode)
          .limit(1)
          .single();

        let result: DuplicateCheckResult;

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error checking duplicate:', error);
          result = { isDuplicate: false };
        } else if (data) {
          result = {
            isDuplicate: true,
            existingInvoiceId: data.invoice_id,
            existingInvoiceNumber: data.invoices?.invoice_number,
            existingServiceDate: data.service_date,
            message: `Duplicate found! This combination exists in invoice ${data.invoices?.invoice_number || 'N/A'} from ${new Date(data.service_date).toLocaleDateString()}`
          };
        } else {
          result = { isDuplicate: false };
        }

        // Update cache
        checkCache.current.set(cacheKey, result);

        // Update warnings
        setDuplicateWarnings(prev => {
          const newWarnings = new Map(prev);
          if (result.isDuplicate) {
            newWarnings.set(rowId, result);
          } else {
            newWarnings.delete(rowId);
          }
          return newWarnings;
        });

      } catch (error) {
        console.error('Error in duplicate check:', error);
      } finally {
        setChecking(false);
      }
    }, 500)
  ).current;

  const checkForDuplicate = useCallback((
    accessionNumber: string,
    cptCode: string,
    rowId: string
  ) => {
    debouncedCheck(accessionNumber, cptCode, rowId);
  }, [debouncedCheck]);

  const clearWarning = useCallback((rowId: string) => {
    setDuplicateWarnings(prev => {
      const newWarnings = new Map(prev);
      newWarnings.delete(rowId);
      return newWarnings;
    });
  }, []);

  const clearCache = useCallback(() => {
    checkCache.current.clear();
    setDuplicateWarnings(new Map());
  }, []);

  return {
    duplicateWarnings,
    checking,
    checkForDuplicate,
    clearWarning,
    clearCache
  };
};