import { supabase } from '../../lib/supabaseClient';

export type AuditAction = 
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'download'
  | 'login'
  | 'logout'
  | 'payment_post'
  | 'payment_edit'
  | 'invoice_send'
  | 'invoice_finalize'
  | 'dispute_create'
  | 'dispute_resolve'
  | 'patient_data_access'
  | 'phi_access'
  | 'settings_change'
  | 'user_create'
  | 'user_modify'
  | 'permission_change';

export type ResourceType = 
  | 'invoice'
  | 'payment'
  | 'patient'
  | 'clinic'
  | 'laboratory'
  | 'user'
  | 'settings'
  | 'report'
  | 'cpt_mapping'
  | 'fee_schedule'
  | 'import'
  | 'credit'
  | 'dispute';

interface AuditLogEntry {
  user_id: string;
  action: AuditAction;
  resource_type: ResourceType;
  resource_id?: string;
  description?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  tenant_id?: string;
  phi_accessed?: boolean;
  patient_ids?: string[];
}

class AuditLogger {
  private queue: AuditLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private maxQueueSize = 50;
  private flushIntervalMs = 5000; // Flush every 5 seconds

  constructor() {
    this.startFlushInterval();
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  /**
   * Log an audit event
   * HIPAA requires logging of all access to patient data
   */
  public async log(entry: Omit<AuditLogEntry, 'user_id' | 'ip_address' | 'user_agent'>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }

      const fullEntry: AuditLogEntry = {
        ...entry,
        user_id: user.id,
        ip_address: await this.getIPAddress(),
        user_agent: navigator.userAgent
      };

      // Check if PHI is being accessed
      if (this.isPHIAccess(entry)) {
        fullEntry.phi_accessed = true;
      }

      // Add to queue
      this.queue.push(fullEntry);

      // Flush if queue is full
      if (this.queue.length >= this.maxQueueSize) {
        await this.flush();
      }
    } catch (error) {
    }
  }

  /**
   * Log patient data access specifically (HIPAA requirement)
   */
  public async logPatientAccess(
    patientId: string,
    action: 'view' | 'update' | 'export',
    context: string
  ) {
    await this.log({
      action: 'patient_data_access',
      resource_type: 'patient',
      resource_id: patientId,
      description: `${action} patient data: ${context}`,
      metadata: {
        patient_id: patientId,
        access_type: action,
        context
      },
      patient_ids: [patientId]
    });
  }

  /**
   * Log invoice access with patient tracking
   */
  public async logInvoiceAccess(
    invoiceId: string,
    action: AuditAction,
    patientIds: string[] = []
  ) {
    await this.log({
      action,
      resource_type: 'invoice',
      resource_id: invoiceId,
      description: `Invoice ${action}: ${invoiceId}`,
      patient_ids: patientIds,
      metadata: {
        invoice_id: invoiceId,
        patient_count: patientIds.length
      }
    });
  }

  /**
   * Log report generation (tracks bulk patient data access)
   */
  public async logReportGeneration(
    reportType: string,
    filters: Record<string, any>,
    recordCount: number
  ) {
    await this.log({
      action: 'export',
      resource_type: 'report',
      description: `Generated ${reportType} report with ${recordCount} records`,
      metadata: {
        report_type: reportType,
        filters,
        record_count: recordCount,
        export_time: new Date().toISOString()
      }
    });
  }

  /**
   * Log payment posting with audit trail
   */
  public async logPaymentPost(
    paymentId: string,
    amount: number,
    clinicId: string,
    invoiceIds: string[]
  ) {
    await this.log({
      action: 'payment_post',
      resource_type: 'payment',
      resource_id: paymentId,
      description: `Posted payment of $${amount} for clinic ${clinicId}`,
      metadata: {
        payment_id: paymentId,
        amount,
        clinic_id: clinicId,
        invoice_ids: invoiceIds,
        invoice_count: invoiceIds.length
      }
    });
  }

  /**
   * Log security events
   */
  public async logSecurityEvent(
    event: 'login' | 'logout' | 'permission_change' | 'password_change',
    details?: Record<string, any>
  ) {
    await this.log({
      action: event as AuditAction,
      resource_type: 'user',
      description: `Security event: ${event}`,
      metadata: {
        event_type: event,
        ...details,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Check if an action involves PHI access
   */
  private isPHIAccess(entry: Partial<AuditLogEntry>): boolean {
    const phiResources: ResourceType[] = ['patient', 'invoice', 'payment'];
    const phiActions: AuditAction[] = ['view', 'export', 'download', 'patient_data_access', 'phi_access'];
    
    return (
      (phiResources.includes(entry.resource_type!) && phiActions.includes(entry.action!)) ||
      entry.action === 'phi_access' ||
      entry.action === 'patient_data_access' ||
      (entry.patient_ids && entry.patient_ids.length > 0)
    );
  }

  /**
   * Flush queued audit logs to database
   */
  private async flush() {
    if (this.queue.length === 0) return;

    const toFlush = [...this.queue];
    this.queue = [];

    try {
      const records = toFlush.map(entry => ({
        user_id: entry.user_id,
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id,
        description: entry.description,
        metadata: entry.metadata,
        ip_address: entry.ip_address,
        user_agent: entry.user_agent,
        tenant_id: entry.tenant_id,
        phi_accessed: entry.phi_accessed,
        patient_ids: entry.patient_ids,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('audit_logs')
        .insert(records);

      if (error) {
        // Re-add to queue if failed
        this.queue.unshift(...toFlush);
      }
    } catch (error) {
      // Re-add to queue if failed
      this.queue.unshift(...toFlush);
    }
  }

  /**
   * Start the flush interval
   */
  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  /**
   * Get user's IP address
   */
  private async getIPAddress(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Destroy the logger (cleanup)
   */
  public destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();

// Export types
export type { AuditLogEntry, AuditAction, ResourceType };

/**
 * React hook for audit logging
 */
export function useAuditLog() {
  return {
    log: auditLogger.log.bind(auditLogger),
    logPatientAccess: auditLogger.logPatientAccess.bind(auditLogger),
    logInvoiceAccess: auditLogger.logInvoiceAccess.bind(auditLogger),
    logReportGeneration: auditLogger.logReportGeneration.bind(auditLogger),
    logPaymentPost: auditLogger.logPaymentPost.bind(auditLogger),
    logSecurityEvent: auditLogger.logSecurityEvent.bind(auditLogger)
  };
}

/**
 * Get audit history for a specific resource
 */
export async function getAuditHistory(
  resourceType: ResourceType,
  resourceId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    return [];
  }
}

/**
 * Get user activity history
 */
export async function getUserActivityHistory(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<AuditLogEntry[]> {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    return [];
  }
}