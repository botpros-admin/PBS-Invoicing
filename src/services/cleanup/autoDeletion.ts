import { supabase } from '../../api/supabase';

interface DeletionPolicy {
  table: string;
  field: string;
  days: number;
  condition?: string;
  softDelete?: boolean;
}

class AutoDeletionService {
  private policies: DeletionPolicy[] = [
    {
      table: 'import_failures',
      field: 'created_at',
      days: 90,
      condition: "status = 'failed'",
      softDelete: false
    },
    {
      table: 'audit_logs',
      field: 'created_at',
      days: 365 * 2, // 2 years for HIPAA compliance
      softDelete: false
    },
    {
      table: 'session_logs',
      field: 'created_at',
      days: 90,
      softDelete: false
    },
    {
      table: 'temporary_files',
      field: 'created_at',
      days: 7,
      softDelete: false
    },
    {
      table: 'dispute_messages',
      field: 'created_at',
      days: 365 * 3, // 3 years for disputes
      condition: "dispute_id IN (SELECT id FROM disputes WHERE status = 'closed')",
      softDelete: true
    },
    {
      table: 'credits',
      field: 'expires_at',
      days: 0, // Uses expires_at field directly
      condition: "status = 'available' AND expires_at < NOW()",
      softDelete: true
    },
    {
      table: 'draft_invoices',
      field: 'created_at',
      days: 30,
      condition: "status = 'draft'",
      softDelete: true
    }
  ];

  /**
   * Run auto-deletion for all configured policies
   */
  async runCleanup(): Promise<{
    success: boolean;
    deletedCounts: Record<string, number>;
    errors: string[];
  }> {
    const deletedCounts: Record<string, number> = {};
    const errors: string[] = [];

    for (const policy of this.policies) {
      try {
        const count = await this.executePolicy(policy);
        deletedCounts[policy.table] = count;
      } catch (error) {
        const errorMessage = `Failed to clean ${policy.table}: ${error}`;
        errors.push(errorMessage);
      }
    }

    // Log cleanup results
    await this.logCleanupResults(deletedCounts, errors);

    return {
      success: errors.length === 0,
      deletedCounts,
      errors
    };
  }

  /**
   * Execute a single deletion policy
   */
  private async executePolicy(policy: DeletionPolicy): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.days);

    if (policy.softDelete) {
      // Soft delete by updating status
      const { data, error } = await supabase.rpc('soft_delete_old_records', {
        p_table: policy.table,
        p_field: policy.field,
        p_cutoff_date: policy.days > 0 ? cutoffDate.toISOString() : null,
        p_condition: policy.condition
      });

      if (error) throw error;
      return data || 0;
    } else {
      // Hard delete
      const { data, error } = await supabase.rpc('delete_old_records', {
        p_table: policy.table,
        p_field: policy.field,
        p_cutoff_date: policy.days > 0 ? cutoffDate.toISOString() : null,
        p_condition: policy.condition
      });

      if (error) throw error;
      return data || 0;
    }
  }

  /**
   * Clean up import failures older than specified days
   */
  async cleanImportFailures(days: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from('import_failures')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .eq('status', 'failed')
        .select('id');

      if (error) throw error;

      const count = data?.length || 0;

      // Log the cleanup
      await supabase.from('audit_logs').insert({
        action: 'cleanup',
        resource_type: 'import_failures',
        description: `Deleted ${count} import failures older than ${days} days`
      });

      return count;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clean up expired credits
   */
  async cleanExpiredCredits(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('credits')
        .update({ status: 'expired' })
        .lt('expires_at', new Date().toISOString())
        .eq('status', 'available')
        .select('id');

      if (error) throw error;

      const count = data?.length || 0;

      if (count > 0) {
        await supabase.from('audit_logs').insert({
          action: 'cleanup',
          resource_type: 'credits',
          description: `Expired ${count} unused credits`
        });
      }

      return count;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clean up old audit logs (keep minimum required for compliance)
   */
  async cleanAuditLogs(keepYears: number = 2): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - keepYears);

      // Archive before deleting
      const { data: toArchive, error: fetchError } = await supabase
        .from('audit_logs')
        .select('*')
        .lt('created_at', cutoffDate.toISOString());

      if (fetchError) throw fetchError;

      if (toArchive && toArchive.length > 0) {
        // Archive to cold storage
        await this.archiveRecords('audit_logs_archive', toArchive);

        // Delete archived records
        const { error: deleteError } = await supabase
          .from('audit_logs')
          .delete()
          .lt('created_at', cutoffDate.toISOString());

        if (deleteError) throw deleteError;

        return toArchive.length;
      }

      return 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clean up orphaned records
   */
  async cleanOrphanedRecords(): Promise<Record<string, number>> {
    const results: Record<string, number> = {};

    try {
      // Clean orphaned invoice line items
      const { data: orphanedItems, error: itemsError } = await supabase
        .from('invoice_line_items')
        .delete()
        .is('invoice_id', null)
        .select('id');

      if (itemsError) throw itemsError;
      results.invoice_line_items = orphanedItems?.length || 0;

      // Clean orphaned dispute messages
      const { data: orphanedMessages, error: messagesError } = await supabase
        .from('dispute_messages')
        .delete()
        .is('dispute_id', null)
        .select('id');

      if (messagesError) throw messagesError;
      results.dispute_messages = orphanedMessages?.length || 0;

      // Clean orphaned payment allocations
      const { data: orphanedAllocations, error: allocationsError } = await supabase
        .from('payment_allocations')
        .delete()
        .is('payment_id', null)
        .select('id');

      if (allocationsError) throw allocationsError;
      results.payment_allocations = orphanedAllocations?.length || 0;

      return results;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Archive records to cold storage
   */
  private async archiveRecords(tableName: string, records: any[]): Promise<void> {
    try {
      // Create archive table if it doesn't exist
      await supabase.rpc('create_archive_table', {
        p_table_name: tableName
      });

      // Insert records into archive
      const { error } = await supabase
        .from(tableName)
        .insert(records);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Log cleanup results
   */
  private async logCleanupResults(
    deletedCounts: Record<string, number>,
    errors: string[]
  ): Promise<void> {
    try {
      await supabase.from('system_logs').insert({
        log_type: 'cleanup',
        severity: errors.length > 0 ? 'warning' : 'info',
        message: 'Auto-deletion cleanup completed',
        metadata: {
          deleted_counts: deletedCounts,
          errors,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
    }
  }

  /**
   * Schedule cleanup to run periodically
   */
  scheduleCleanup(intervalHours: number = 24): void {
    // Run immediately
    this.runCleanup();

    // Then run periodically
    setInterval(() => {
      this.runCleanup();
    }, intervalHours * 60 * 60 * 1000);
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    nextRun: Date;
    lastRun?: Date;
    policies: DeletionPolicy[];
    estimatedDeletions: Record<string, number>;
  }> {
    const estimatedDeletions: Record<string, number> = {};

    for (const policy of this.policies) {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.days);

        const { count } = await supabase
          .from(policy.table)
          .select('*', { count: 'exact', head: true })
          .lt(policy.field, policy.days > 0 ? cutoffDate.toISOString() : new Date().toISOString());

        estimatedDeletions[policy.table] = count || 0;
      } catch (error) {
        estimatedDeletions[policy.table] = 0;
      }
    }

    // Get last run time
    const { data: lastLog } = await supabase
      .from('system_logs')
      .select('created_at')
      .eq('log_type', 'cleanup')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const nextRun = new Date();
    nextRun.setHours(nextRun.getHours() + 24);

    return {
      nextRun,
      lastRun: lastLog ? new Date(lastLog.created_at) : undefined,
      policies: this.policies,
      estimatedDeletions
    };
  }
}

// Singleton instance
export const autoDeletionService = new AutoDeletionService();

// React hook for cleanup management
export const useAutoDeletion = () => {
  const runCleanup = async () => {
    return await autoDeletionService.runCleanup();
  };

  const cleanImportFailures = async (days?: number) => {
    return await autoDeletionService.cleanImportFailures(days);
  };

  const cleanExpiredCredits = async () => {
    return await autoDeletionService.cleanExpiredCredits();
  };

  const getStats = async () => {
    return await autoDeletionService.getCleanupStats();
  };

  return {
    runCleanup,
    cleanImportFailures,
    cleanExpiredCredits,
    getStats
  };
};