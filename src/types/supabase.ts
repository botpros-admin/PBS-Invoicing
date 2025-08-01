export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          organization_id?: string
          name: string
          email: string
          role: string
          status: string
          mfa_enabled: boolean
          last_login_at?: string
          created_at: string
          updated_at: string
          avatar?: string
        }
        Insert: {
          id?: string
          organization_id?: string
          name: string
          email: string
          role?: string
          status?: string
          mfa_enabled?: boolean
          last_login_at?: string
          created_at?: string
          updated_at?: string
          avatar?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          email?: string
          role?: string
          status?: string
          mfa_enabled?: boolean
          last_login_at?: string
          created_at?: string
          updated_at?: string
          avatar?: string
        }
      }
      client_users: {
        Row: {
          id: string
          client_id: string
          name: string
          email: string
          role: string
          status: string
          mfa_enabled: boolean
          last_login_at?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          name: string
          email: string
          role?: string
          status?: string
          mfa_enabled?: boolean
          last_login_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          name?: string
          email?: string
          role?: string
          status?: string
          mfa_enabled?: boolean
          last_login_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          organization_id?: string
          name: string
          logo_url?: string
          address?: string
          payment_remit_info?: string
          payment_address?: string
          wiring_info?: string
          online_cc_processor_config?: Json
          invoice_contact_phone?: string
          invoice_contact_email?: string
          invoice_contact_fax?: string
          invoice_contact_website?: string
          invoice_contact_hours?: string
          w9_document_path?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string
          name: string
          logo_url?: string
          address?: string
          payment_remit_info?: string
          payment_address?: string
          wiring_info?: string
          online_cc_processor_config?: Json
          invoice_contact_phone?: string
          invoice_contact_email?: string
          invoice_contact_fax?: string
          invoice_contact_website?: string
          invoice_contact_hours?: string
          w9_document_path?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          logo_url?: string
          address?: string
          payment_remit_info?: string
          payment_address?: string
          wiring_info?: string
          online_cc_processor_config?: Json
          invoice_contact_phone?: string
          invoice_contact_email?: string
          invoice_contact_fax?: string
          invoice_contact_website?: string
          invoice_contact_hours?: string
          w9_document_path?: string
          created_at?: string
          updated_at?: string
        }
      }
      clinics: {
        Row: {
          id: string
          client_id: string
          parent_clinic_id?: string
          name: string
          address: string
          logo_url?: string
          sales_rep?: string
          preferred_contact_method?: string
          bill_to_address?: string
          notes?: string
          contract_document_path?: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          parent_clinic_id?: string
          name: string
          address: string
          logo_url?: string
          sales_rep?: string
          preferred_contact_method?: string
          bill_to_address?: string
          notes?: string
          contract_document_path?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          parent_clinic_id?: string
          name?: string
          address?: string
          logo_url?: string
          sales_rep?: string
          preferred_contact_method?: string
          bill_to_address?: string
          notes?: string
          contract_document_path?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          client_id: string
          name: string
          dob?: string
          sex?: string
          accession_number?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          name: string
          dob?: string
          sex?: string
          accession_number?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          name?: string
          dob?: string
          sex?: string
          accession_number?: string
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          client_id: string
          clinic_id: string
          patient_id: string
          invoice_number: string
          date_created: string
          date_due: string
          status: string
          invoice_type?: string
          reason_type?: string
          icn?: string
          notes?: string
          subtotal: number
          total: number
          amount_paid: number
          balance: number
          write_off_amount?: number
          write_off_reason?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          clinic_id: string
          patient_id: string
          invoice_number: string
          date_created: string
          date_due: string
          status: string
          invoice_type?: string
          reason_type?: string
          icn?: string
          notes?: string
          subtotal: number
          total: number
          amount_paid?: number
          balance?: number
          write_off_amount?: number
          write_off_reason?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          clinic_id?: string
          patient_id?: string
          invoice_number?: string
          date_created?: string
          date_due?: string
          status?: string
          invoice_type?: string
          reason_type?: string
          icn?: string
          notes?: string
          subtotal?: number
          total?: number
          amount_paid?: number
          balance?: number
          write_off_amount?: number
          write_off_reason?: string
          created_at?: string
          updated_at?: string
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          cpt_code_id: string
          cpt_code: string
          description: string
          description_override?: string
          date_of_service: string
          quantity: number
          unit_price: number
          total: number
          is_disputed: boolean
          dispute_reason?: string
          dispute_resolved_at?: string
          dispute_resolution_notes?: string
          medical_necessity_provided: boolean
          medical_necessity_document_path?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          cpt_code_id: string
          cpt_code: string
          description: string
          description_override?: string
          date_of_service: string
          quantity: number
          unit_price: number
          total: number
          is_disputed?: boolean
          dispute_reason?: string
          dispute_resolved_at?: string
          dispute_resolution_notes?: string
          medical_necessity_provided?: boolean
          medical_necessity_document_path?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          cpt_code_id?: string
          cpt_code?: string
          description?: string
          description_override?: string
          date_of_service?: string
          quantity?: number
          unit_price?: number
          total?: number
          is_disputed?: boolean
          dispute_reason?: string
          dispute_resolved_at?: string
          dispute_resolution_notes?: string
          medical_necessity_provided?: boolean
          medical_necessity_document_path?: string
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          client_id: string
          payment_date: string
          amount: number
          method: string
          reference_number?: string
          notes?: string
          reconciliation_status: string
          created_by_user_id?: string
          created_by_client_user_id?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          payment_date: string
          amount: number
          method: string
          reference_number?: string
          notes?: string
          reconciliation_status: string
          created_by_user_id?: string
          created_by_client_user_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          payment_date?: string
          amount?: number
          method?: string
          reference_number?: string
          notes?: string
          reconciliation_status?: string
          created_by_user_id?: string
          created_by_client_user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      payment_allocations: {
        Row: {
          id: string
          payment_id: string
          invoice_id: string
          invoice_item_id?: string
          allocated_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          payment_id: string
          invoice_id: string
          invoice_item_id?: string
          allocated_amount: number
          created_at?: string
        }
        Update: {
          id?: string
          payment_id?: string
          invoice_id?: string
          invoice_item_id?: string
          allocated_amount?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
