// src/types/disputes.ts

export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'closed';
export type DisputePriority = 'low' | 'normal' | 'high' | 'critical';
export type DisputeReasonCategory = 'pricing' | 'service_not_rendered' | 'duplicate' | 'other';
export type DisputeResolutionType = 'accepted' | 'rejected' | 'partial';

export interface DisputeTicket {
  id: string; // UUID
  organization_id: string; // UUID
  invoice_item_id: string; // UUID
  ticket_number: string;
  status: DisputeStatus;
  priority: DisputePriority;
  reason_category: DisputeReasonCategory;
  reason_details: string;
  disputed_amount?: number;
  resolution_type?: DisputeResolutionType;
  resolution_amount?: number;
  resolution_notes?: string;
  created_by?: string; // UUID
  created_at: string; // TIMESTAMPTZ
  assigned_to?: string; // UUID
  resolved_by?: string; // UUID
  resolved_at?: string; // TIMESTAMPTZ
  closed_at?: string; // TIMESTAMPTZ
  messages?: DisputeTicketMessage[]; // For UI convenience
}

export interface DisputeTicketMessage {
  id: string; // UUID
  dispute_ticket_id: string; // UUID
  sender_id?: string; // UUID
  sender_name?: string; // For UI display
  message: string;
  is_internal_note: boolean;
  created_at: string; // TIMESTAMPTZ
}
