export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          client_user_id: number | null
          created_at: string
          description: string
          entity_id: number | null
          entity_type: string
          id: number
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: number | null
        }
        Insert: {
          action: string
          client_user_id?: number | null
          created_at?: string
          description: string
          entity_id?: number | null
          entity_type: string
          id?: number
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: number | null
        }
        Update: {
          action?: string
          client_user_id?: number | null
          created_at?: string
          description?: string
          entity_id?: number | null
          entity_type?: string
          id?: number
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          client_id: number | null
          condition_logic: string | null
          created_at: string
          created_by_user_id: number | null
          delay_unit: string | null
          delay_value: number | null
          description: string | null
          email_template_id: number | null
          id: number
          is_active: boolean
          name: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          client_id?: number | null
          condition_logic?: string | null
          created_at?: string
          created_by_user_id?: number | null
          delay_unit?: string | null
          delay_value?: number | null
          description?: string | null
          email_template_id?: number | null
          id?: number
          is_active?: boolean
          name: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          client_id?: number | null
          condition_logic?: string | null
          created_at?: string
          created_by_user_id?: number | null
          delay_unit?: string | null
          delay_value?: number | null
          description?: string | null
          email_template_id?: number | null
          id?: number
          is_active?: boolean
          name?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_pricing_overrides: {
        Row: {
          client_id: number
          cpt_code_id: number
          created_at: string
          end_date: string | null
          id: number
          negotiated_note: string | null
          price: number
          start_date: string
          updated_at: string
        }
        Insert: {
          client_id: number
          cpt_code_id: number
          created_at?: string
          end_date?: string | null
          id?: number
          negotiated_note?: string | null
          price: number
          start_date?: string
          updated_at?: string
        }
        Update: {
          client_id?: number
          cpt_code_id?: number
          created_at?: string
          end_date?: string | null
          id?: number
          negotiated_note?: string | null
          price?: number
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_pricing_overrides_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_pricing_overrides_cpt_code_id_fkey"
            columns: ["cpt_code_id"]
            isOneToOne: false
            referencedRelation: "cpt_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          auth_id: string | null
          avatar_url: string | null
          can_dispute_invoices: boolean
          can_make_payments: boolean
          can_upload_invoices: boolean
          can_view_all_clinics: boolean
          client_id: number
          created_at: string
          deleted_at: string | null
          department: string | null
          email: string
          first_name: string
          id: number
          job_title: string | null
          last_activity_at: string | null
          last_name: string
          mfa_enabled: boolean
          notes: string | null
          phone: string | null
          role: Database["public"]["Enums"]["client_user_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          uuid: string
        }
        Insert: {
          auth_id?: string | null
          avatar_url?: string | null
          can_dispute_invoices?: boolean
          can_make_payments?: boolean
          can_upload_invoices?: boolean
          can_view_all_clinics?: boolean
          client_id: number
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email: string
          first_name: string
          id?: number
          job_title?: string | null
          last_activity_at?: string | null
          last_name: string
          mfa_enabled?: boolean
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["client_user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          uuid?: string
        }
        Update: {
          auth_id?: string | null
          avatar_url?: string | null
          can_dispute_invoices?: boolean
          can_make_payments?: boolean
          can_upload_invoices?: boolean
          can_view_all_clinics?: boolean
          client_id?: number
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email?: string
          first_name?: string
          id?: number
          job_title?: string | null
          last_activity_at?: string | null
          last_name?: string
          mfa_enabled?: boolean
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["client_user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          account_manager_user_id: number | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string
          default_email_template_id: number | null
          default_invoice_due_days: number
          default_invoice_template: string | null
          deleted_at: string | null
          id: number
          invoice_contact_email: string | null
          invoice_contact_fax: string | null
          invoice_contact_hours: string | null
          invoice_contact_name: string | null
          invoice_contact_phone: string | null
          invoice_contact_website: string | null
          is_active: boolean
          logo_url: string | null
          main_email: string | null
          main_phone: string | null
          name: string
          notes: string | null
          online_cc_processor_config: Json | null
          organization_id: number | null
          payment_address: string | null
          payment_city: string | null
          payment_country: string | null
          payment_remit_info: string | null
          payment_state: string | null
          payment_terms: string | null
          payment_zip_code: string | null
          primary_color: string | null
          secondary_color: string | null
          short_name: string | null
          state: string | null
          tax_id: string | null
          updated_at: string
          uuid: string
          w9_document_path: string | null
          wiring_info: string | null
          zip_code: string | null
        }
        Insert: {
          account_manager_user_id?: number | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          default_email_template_id?: number | null
          default_invoice_due_days?: number
          default_invoice_template?: string | null
          deleted_at?: string | null
          id?: number
          invoice_contact_email?: string | null
          invoice_contact_fax?: string | null
          invoice_contact_hours?: string | null
          invoice_contact_name?: string | null
          invoice_contact_phone?: string | null
          invoice_contact_website?: string | null
          is_active?: boolean
          logo_url?: string | null
          main_email?: string | null
          main_phone?: string | null
          name: string
          notes?: string | null
          online_cc_processor_config?: Json | null
          organization_id?: number | null
          payment_address?: string | null
          payment_city?: string | null
          payment_country?: string | null
          payment_remit_info?: string | null
          payment_state?: string | null
          payment_terms?: string | null
          payment_zip_code?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          short_name?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          uuid?: string
          w9_document_path?: string | null
          wiring_info?: string | null
          zip_code?: string | null
        }
        Update: {
          account_manager_user_id?: number | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          default_email_template_id?: number | null
          default_invoice_due_days?: number
          default_invoice_template?: string | null
          deleted_at?: string | null
          id?: number
          invoice_contact_email?: string | null
          invoice_contact_fax?: string | null
          invoice_contact_hours?: string | null
          invoice_contact_name?: string | null
          invoice_contact_phone?: string | null
          invoice_contact_website?: string | null
          is_active?: boolean
          logo_url?: string | null
          main_email?: string | null
          main_phone?: string | null
          name?: string
          notes?: string | null
          online_cc_processor_config?: Json | null
          organization_id?: number | null
          payment_address?: string | null
          payment_city?: string | null
          payment_country?: string | null
          payment_remit_info?: string | null
          payment_state?: string | null
          payment_terms?: string | null
          payment_zip_code?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          short_name?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          uuid?: string
          w9_document_path?: string | null
          wiring_info?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_account_manager_user_id_fkey"
            columns: ["account_manager_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_contacts: {
        Row: {
          client_user_id: number | null
          clinic_id: number
          created_at: string
          deleted_at: string | null
          department: string | null
          email: string | null
          fax: string | null
          first_name: string
          id: number
          is_billing_contact: boolean
          is_primary: boolean
          last_name: string
          mobile_phone: string | null
          notes: string | null
          phone: string | null
          preferred_contact_method:
            | Database["public"]["Enums"]["contact_method"]
            | null
          title: string | null
          updated_at: string
          uuid: string
        }
        Insert: {
          client_user_id?: number | null
          clinic_id: number
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          fax?: string | null
          first_name: string
          id?: number
          is_billing_contact?: boolean
          is_primary?: boolean
          last_name: string
          mobile_phone?: string | null
          notes?: string | null
          phone?: string | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          title?: string | null
          updated_at?: string
          uuid?: string
        }
        Update: {
          client_user_id?: number | null
          clinic_id?: number
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          fax?: string | null
          first_name?: string
          id?: number
          is_billing_contact?: boolean
          is_primary?: boolean
          last_name?: string
          mobile_phone?: string | null
          notes?: string | null
          phone?: string | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          title?: string | null
          updated_at?: string
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_contacts_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_contacts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_pricing_overrides: {
        Row: {
          clinic_id: number
          cpt_code_id: number
          created_at: string
          end_date: string | null
          id: number
          negotiated_note: string | null
          price: number
          start_date: string
          updated_at: string
        }
        Insert: {
          clinic_id: number
          cpt_code_id: number
          created_at?: string
          end_date?: string | null
          id?: number
          negotiated_note?: string | null
          price: number
          start_date?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: number
          cpt_code_id?: number
          created_at?: string
          end_date?: string | null
          id?: number
          negotiated_note?: string | null
          price?: number
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_pricing_overrides_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_pricing_overrides_cpt_code_id_fkey"
            columns: ["cpt_code_id"]
            isOneToOne: false
            referencedRelation: "cpt_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          bill_to_address_line1: string | null
          bill_to_address_line2: string | null
          bill_to_attention: string | null
          bill_to_city: string | null
          bill_to_country: string | null
          bill_to_state: string | null
          bill_to_zip_code: string | null
          city: string | null
          client_id: number
          contract_document_path: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          contract_terms: string | null
          country: string | null
          created_at: string
          deleted_at: string | null
          facility_type: Database["public"]["Enums"]["facility_type"] | null
          id: number
          is_active: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          main_email: string | null
          main_fax: string | null
          main_phone: string | null
          name: string
          notes: string | null
          npi_number: string | null
          parent_clinic_id: number | null
          preferred_contact_method:
            | Database["public"]["Enums"]["contact_method"]
            | null
          sales_rep_email: string | null
          sales_rep_name: string | null
          sales_rep_phone: string | null
          short_name: string | null
          special_instructions: string | null
          state: string | null
          tax_id: string | null
          updated_at: string
          uuid: string
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          bill_to_address_line1?: string | null
          bill_to_address_line2?: string | null
          bill_to_attention?: string | null
          bill_to_city?: string | null
          bill_to_country?: string | null
          bill_to_state?: string | null
          bill_to_zip_code?: string | null
          city?: string | null
          client_id: number
          contract_document_path?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_terms?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          facility_type?: Database["public"]["Enums"]["facility_type"] | null
          id?: number
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          main_email?: string | null
          main_fax?: string | null
          main_phone?: string | null
          name: string
          notes?: string | null
          npi_number?: string | null
          parent_clinic_id?: number | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          sales_rep_email?: string | null
          sales_rep_name?: string | null
          sales_rep_phone?: string | null
          short_name?: string | null
          special_instructions?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          uuid?: string
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          bill_to_address_line1?: string | null
          bill_to_address_line2?: string | null
          bill_to_attention?: string | null
          bill_to_city?: string | null
          bill_to_country?: string | null
          bill_to_state?: string | null
          bill_to_zip_code?: string | null
          city?: string | null
          client_id?: number
          contract_document_path?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          contract_terms?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          facility_type?: Database["public"]["Enums"]["facility_type"] | null
          id?: number
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          main_email?: string | null
          main_fax?: string | null
          main_phone?: string | null
          name?: string
          notes?: string | null
          npi_number?: string | null
          parent_clinic_id?: number | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          sales_rep_email?: string | null
          sales_rep_name?: string | null
          sales_rep_phone?: string | null
          short_name?: string | null
          special_instructions?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          uuid?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinics_parent_clinic_id_fkey"
            columns: ["parent_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      cpt_codes: {
        Row: {
          category: string | null
          code: string
          created_at: string
          deactivation_date: string | null
          default_price: number
          description: string
          effective_date: string
          id: number
          is_active: boolean
          short_description: string | null
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          deactivation_date?: string | null
          default_price: number
          description: string
          effective_date?: string
          id?: number
          is_active?: boolean
          short_description?: string | null
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          deactivation_date?: string | null
          default_price?: number
          description?: string
          effective_date?: string
          id?: number
          is_active?: boolean
          short_description?: string | null
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          config_details: Json
          created_at: string
          from_email: string
          from_name: string
          id: number
          is_active: boolean
          last_verified_at: string | null
          notes: string | null
          reply_to_email: string | null
          setting_type: string
          updated_at: string
        }
        Insert: {
          config_details: Json
          created_at?: string
          from_email: string
          from_name: string
          id?: number
          is_active?: boolean
          last_verified_at?: string | null
          notes?: string | null
          reply_to_email?: string | null
          setting_type: string
          updated_at?: string
        }
        Update: {
          config_details?: Json
          created_at?: string
          from_email?: string
          from_name?: string
          id?: number
          is_active?: boolean
          last_verified_at?: string | null
          notes?: string | null
          reply_to_email?: string | null
          setting_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          available_variables: Json | null
          client_id: number | null
          code: string
          created_at: string
          created_by_user_id: number | null
          description: string | null
          html_content: string
          id: number
          is_active: boolean
          name: string
          plain_text_content: string | null
          subject: string
          template_type: string
          updated_at: string
          version: number
        }
        Insert: {
          available_variables?: Json | null
          client_id?: number | null
          code: string
          created_at?: string
          created_by_user_id?: number | null
          description?: string | null
          html_content: string
          id?: number
          is_active?: boolean
          name: string
          plain_text_content?: string | null
          subject: string
          template_type: string
          updated_at?: string
          version?: number
        }
        Update: {
          available_variables?: Json | null
          client_id?: number | null
          code?: string
          created_at?: string
          created_by_user_id?: number | null
          description?: string | null
          html_content?: string
          id?: number
          is_active?: boolean
          name?: string
          plain_text_content?: string | null
          subject?: string
          template_type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_attachments: {
        Row: {
          content_type: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: number
          invoice_id: number
          is_public: boolean
          uploaded_by_client_user_id: number | null
          uploaded_by_user_id: number | null
        }
        Insert: {
          content_type: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: number
          invoice_id: number
          is_public?: boolean
          uploaded_by_client_user_id?: number | null
          uploaded_by_user_id?: number | null
        }
        Update: {
          content_type?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: number
          invoice_id?: number
          is_public?: boolean
          uploaded_by_client_user_id?: number | null
          uploaded_by_user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_attachments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_attachments_uploaded_by_client_user_id_fkey"
            columns: ["uploaded_by_client_user_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_attachments_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_history: {
        Row: {
          client_user_id: number | null
          description: string
          event_type: string
          id: number
          invoice_id: number
          ip_address: string | null
          new_value: string | null
          previous_value: string | null
          timestamp: string
          user_agent: string | null
          user_id: number | null
        }
        Insert: {
          client_user_id?: number | null
          description: string
          event_type: string
          id?: number
          invoice_id: number
          ip_address?: string | null
          new_value?: string | null
          previous_value?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: number | null
        }
        Update: {
          client_user_id?: number | null
          description?: string
          event_type?: string
          id?: number
          invoice_id?: number
          ip_address?: string | null
          new_value?: string | null
          previous_value?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_history_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          accession_number: string | null
          cpt_code_id: number
          created_at: string
          custom_code: string | null
          date_of_service: string
          description: string
          description_override: string | null
          discount_amount: number
          dispute_by_client_user_id: number | null
          dispute_date: string | null
          dispute_reason: string | null
          dispute_resolution_notes: string | null
          dispute_resolved_at: string | null
          dispute_resolved_by_user_id: number | null
          icd10_codes: string[] | null
          id: number
          invoice_id: number
          is_disputed: boolean | null
          medical_necessity_document_path: string | null
          medical_necessity_provided: boolean | null
          ordering_provider: string | null
          patient_id: number | null
          quantity: number
          service_location: string | null
          sort_order: number | null
          tax_amount: number
          tax_rate: number | null
          total: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          accession_number?: string | null
          cpt_code_id: number
          created_at?: string
          custom_code?: string | null
          date_of_service: string
          description: string
          description_override?: string | null
          discount_amount?: number
          dispute_by_client_user_id?: number | null
          dispute_date?: string | null
          dispute_reason?: string | null
          dispute_resolution_notes?: string | null
          dispute_resolved_at?: string | null
          dispute_resolved_by_user_id?: number | null
          icd10_codes?: string[] | null
          id?: number
          invoice_id: number
          is_disputed?: boolean | null
          medical_necessity_document_path?: string | null
          medical_necessity_provided?: boolean | null
          ordering_provider?: string | null
          patient_id?: number | null
          quantity?: number
          service_location?: string | null
          sort_order?: number | null
          tax_amount?: number
          tax_rate?: number | null
          total: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          accession_number?: string | null
          cpt_code_id?: number
          created_at?: string
          custom_code?: string | null
          date_of_service?: string
          description?: string
          description_override?: string | null
          discount_amount?: number
          dispute_by_client_user_id?: number | null
          dispute_date?: string | null
          dispute_reason?: string | null
          dispute_resolution_notes?: string | null
          dispute_resolved_at?: string | null
          dispute_resolved_by_user_id?: number | null
          icd10_codes?: string[] | null
          id?: number
          invoice_id?: number
          is_disputed?: boolean | null
          medical_necessity_document_path?: string | null
          medical_necessity_provided?: boolean | null
          ordering_provider?: string | null
          patient_id?: number | null
          quantity?: number
          service_location?: string | null
          sort_order?: number | null
          tax_amount?: number
          tax_rate?: number | null
          total?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_cpt_code_id_fkey"
            columns: ["cpt_code_id"]
            isOneToOne: false
            referencedRelation: "cpt_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_dispute_by_client_user_id_fkey"
            columns: ["dispute_by_client_user_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_dispute_resolved_by_user_id_fkey"
            columns: ["dispute_resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_parameters: {
        Row: {
          client_id: number | null
          company_address: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          company_website: string | null
          created_at: string
          custom_footer_message: string | null
          custom_header_message: string | null
          font_family: string | null
          font_size: string | null
          footer_style: string | null
          header_style: string | null
          highlight_color: string | null
          id: number
          logo_position: string | null
          page_size: string | null
          payment_instructions: string | null
          primary_color: string | null
          secondary_color: string | null
          show_logo: boolean
          terms_and_conditions: string | null
          updated_at: string
        }
        Insert: {
          client_id?: number | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_website?: string | null
          created_at?: string
          custom_footer_message?: string | null
          custom_header_message?: string | null
          font_family?: string | null
          font_size?: string | null
          footer_style?: string | null
          header_style?: string | null
          highlight_color?: string | null
          id?: number
          logo_position?: string | null
          page_size?: string | null
          payment_instructions?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_logo?: boolean
          terms_and_conditions?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: number | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_website?: string | null
          created_at?: string
          custom_footer_message?: string | null
          custom_header_message?: string | null
          font_family?: string | null
          font_size?: string | null
          footer_style?: string | null
          header_style?: string | null
          highlight_color?: string | null
          id?: number
          logo_position?: string | null
          page_size?: string | null
          payment_instructions?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_logo?: boolean
          terms_and_conditions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_parameters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          balance: number
          billing_entity: string | null
          client_id: number
          clinic_id: number | null
          created_at: string
          created_by_user_id: number | null
          date_created: string
          date_due: string
          date_sent: string | null
          deleted_at: string | null
          discount_amount: number
          discount_type: string | null
          discount_value: number | null
          has_attachments: boolean
          icn: string | null
          id: number
          internal_notes: string | null
          invoice_number: string
          invoice_type: string | null
          notes: string | null
          po_number: string | null
          priority: Database["public"]["Enums"]["priority"] | null
          reason_type: string | null
          reference_number: string | null
          shipping_amount: number
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          tax_rate: number | null
          terms: string | null
          total: number
          updated_at: string
          uuid: string
          write_off_amount: number | null
          write_off_by_user_id: number | null
          write_off_date: string | null
          write_off_reason: string | null
        }
        Insert: {
          amount_paid?: number
          balance?: number
          billing_entity?: string | null
          client_id: number
          clinic_id?: number | null
          created_at?: string
          created_by_user_id?: number | null
          date_created: string
          date_due: string
          date_sent?: string | null
          deleted_at?: string | null
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number | null
          has_attachments?: boolean
          icn?: string | null
          id?: number
          internal_notes?: string | null
          invoice_number: string
          invoice_type?: string | null
          notes?: string | null
          po_number?: string | null
          priority?: Database["public"]["Enums"]["priority"] | null
          reason_type?: string | null
          reference_number?: string | null
          shipping_amount?: number
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number | null
          terms?: string | null
          total?: number
          updated_at?: string
          uuid?: string
          write_off_amount?: number | null
          write_off_by_user_id?: number | null
          write_off_date?: string | null
          write_off_reason?: string | null
        }
        Update: {
          amount_paid?: number
          balance?: number
          billing_entity?: string | null
          client_id?: number
          clinic_id?: number | null
          created_at?: string
          created_by_user_id?: number | null
          date_created?: string
          date_due?: string
          date_sent?: string | null
          deleted_at?: string | null
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number | null
          has_attachments?: boolean
          icn?: string | null
          id?: number
          internal_notes?: string | null
          invoice_number?: string
          invoice_type?: string | null
          notes?: string | null
          po_number?: string | null
          priority?: Database["public"]["Enums"]["priority"] | null
          reason_type?: string | null
          reference_number?: string | null
          shipping_amount?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number | null
          terms?: string | null
          total?: number
          updated_at?: string
          uuid?: string
          write_off_amount?: number | null
          write_off_by_user_id?: number | null
          write_off_date?: string | null
          write_off_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_write_off_by_user_id_fkey"
            columns: ["write_off_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          client_user_id: number | null
          email_enabled: boolean
          id: number
          in_app_enabled: boolean
          notification_type: string
          sms_enabled: boolean
          user_id: number | null
        }
        Insert: {
          client_user_id?: number | null
          email_enabled?: boolean
          id?: number
          in_app_enabled?: boolean
          notification_type: string
          sms_enabled?: boolean
          user_id?: number | null
        }
        Update: {
          client_user_id?: number | null
          email_enabled?: boolean
          id?: number
          in_app_enabled?: boolean
          notification_type?: string
          sms_enabled?: boolean
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          client_user_id: number | null
          created_at: string
          data: Json | null
          id: number
          is_read: boolean
          message: string
          read_at: string | null
          related_entity_id: number | null
          related_entity_type: string | null
          title: string
          type: string
          user_id: number | null
        }
        Insert: {
          client_user_id?: number | null
          created_at?: string
          data?: Json | null
          id?: number
          is_read?: boolean
          message: string
          read_at?: string | null
          related_entity_id?: number | null
          related_entity_type?: string | null
          title: string
          type: string
          user_id?: number | null
        }
        Update: {
          client_user_id?: number | null
          created_at?: string
          data?: Json | null
          id?: number
          is_read?: boolean
          message?: string
          read_at?: string | null
          related_entity_id?: number | null
          related_entity_type?: string | null
          title?: string
          type?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: number
          industry: string | null
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
          state: string | null
          tax_id: string | null
          updated_at: string
          uuid: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: number
          industry?: string | null
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          uuid?: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: number
          industry?: string | null
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          uuid?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          accession_number: string | null
          client_id: number
          created_at: string
          deleted_at: string | null
          dob: string | null
          external_id: string | null
          first_name: string
          id: number
          is_active: boolean
          last_name: string
          middle_name: string | null
          mrn: string | null
          sex: Database["public"]["Enums"]["sex"] | null
          updated_at: string
          uuid: string
        }
        Insert: {
          accession_number?: string | null
          client_id: number
          created_at?: string
          deleted_at?: string | null
          dob?: string | null
          external_id?: string | null
          first_name: string
          id?: number
          is_active?: boolean
          last_name: string
          middle_name?: string | null
          mrn?: string | null
          sex?: Database["public"]["Enums"]["sex"] | null
          updated_at?: string
          uuid?: string
        }
        Update: {
          accession_number?: string | null
          client_id?: number
          created_at?: string
          deleted_at?: string | null
          dob?: string | null
          external_id?: string | null
          first_name?: string
          id?: number
          is_active?: boolean
          last_name?: string
          middle_name?: string | null
          mrn?: string | null
          sex?: Database["public"]["Enums"]["sex"] | null
          updated_at?: string
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          allocated_amount: number
          allocated_by_user_id: number | null
          created_at: string
          id: number
          invoice_id: number
          invoice_item_id: number | null
          notes: string | null
          payment_id: number
          updated_at: string
        }
        Insert: {
          allocated_amount: number
          allocated_by_user_id?: number | null
          created_at?: string
          id?: number
          invoice_id: number
          invoice_item_id?: number | null
          notes?: string | null
          payment_id: number
          updated_at?: string
        }
        Update: {
          allocated_amount?: number
          allocated_by_user_id?: number | null
          created_at?: string
          id?: number
          invoice_id?: number
          invoice_item_id?: number | null
          notes?: string | null
          payment_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_allocated_by_user_id_fkey"
            columns: ["allocated_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attachments: {
        Row: {
          content_type: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: number
          payment_id: number
          uploaded_by_client_user_id: number | null
          uploaded_by_user_id: number | null
        }
        Insert: {
          content_type: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: number
          payment_id: number
          uploaded_by_client_user_id?: number | null
          uploaded_by_user_id?: number | null
        }
        Update: {
          content_type?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: number
          payment_id?: number
          uploaded_by_client_user_id?: number | null
          uploaded_by_user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_attachments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attachments_uploaded_by_client_user_id_fkey"
            columns: ["uploaded_by_client_user_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attachments_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          authorization_code: string | null
          bank_name: string | null
          card_last_four: string | null
          card_type: string | null
          check_date: string | null
          check_number: string | null
          client_id: number
          created_at: string
          created_by_client_user_id: number | null
          created_by_user_id: number | null
          deleted_at: string | null
          deposited_at: string | null
          id: number
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          payment_date: string
          payment_number: string | null
          payment_processor: string | null
          received_at: string | null
          reconciled_at: string | null
          reconciliation_status: Database["public"]["Enums"]["reconciliation_status"]
          reference_number: string | null
          status: Database["public"]["Enums"]["payment_status"]
          transaction_id: string | null
          updated_at: string
          uuid: string
        }
        Insert: {
          amount: number
          authorization_code?: string | null
          bank_name?: string | null
          card_last_four?: string | null
          card_type?: string | null
          check_date?: string | null
          check_number?: string | null
          client_id: number
          created_at?: string
          created_by_client_user_id?: number | null
          created_by_user_id?: number | null
          deleted_at?: string | null
          deposited_at?: string | null
          id?: number
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_date: string
          payment_number?: string | null
          payment_processor?: string | null
          received_at?: string | null
          reconciled_at?: string | null
          reconciliation_status?: Database["public"]["Enums"]["reconciliation_status"]
          reference_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
          uuid?: string
        }
        Update: {
          amount?: number
          authorization_code?: string | null
          bank_name?: string | null
          card_last_four?: string | null
          card_type?: string | null
          check_date?: string | null
          check_number?: string | null
          client_id?: number
          created_at?: string
          created_by_client_user_id?: number | null
          created_by_user_id?: number | null
          deleted_at?: string | null
          deposited_at?: string | null
          id?: number
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_date?: string
          payment_number?: string | null
          payment_processor?: string | null
          received_at?: string | null
          reconciled_at?: string | null
          reconciliation_status?: Database["public"]["Enums"]["reconciliation_status"]
          reference_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_client_user_id_fkey"
            columns: ["created_by_client_user_id"]
            isOneToOne: false
            referencedRelation: "client_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      price_schedules: {
        Row: {
          client_id: number
          cpt_code_id: number
          id: number
          override_price: number
        }
        Insert: {
          client_id: number
          cpt_code_id: number
          id?: never
          override_price: number
        }
        Update: {
          client_id?: number
          cpt_code_id?: number
          id?: never
          override_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_schedules_cpt_code_id_fkey"
            columns: ["cpt_code_id"]
            isOneToOne: false
            referencedRelation: "cpt_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      report_configurations: {
        Row: {
          created_at: string
          description: string | null
          id: number
          is_active: boolean
          is_scheduled: boolean
          last_run_at: string | null
          name: string
          organization_id: number | null
          parameters: Json
          report_type: string
          schedule_day: number | null
          schedule_frequency: string | null
          schedule_recipients: string[] | null
          schedule_time: string | null
          updated_at: string
          user_id: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          is_active?: boolean
          is_scheduled?: boolean
          last_run_at?: string | null
          name: string
          organization_id?: number | null
          parameters: Json
          report_type: string
          schedule_day?: number | null
          schedule_frequency?: string | null
          schedule_recipients?: string[] | null
          schedule_time?: string | null
          updated_at?: string
          user_id: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          is_active?: boolean
          is_scheduled?: boolean
          last_run_at?: string | null
          name?: string
          organization_id?: number | null
          parameters?: Json
          report_type?: string
          schedule_day?: number | null
          schedule_frequency?: string | null
          schedule_recipients?: string[] | null
          schedule_time?: string | null
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_configurations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          data: Json
          error_message: string | null
          id: number
          job_type: string
          next_retry_at: string | null
          related_entity_id: number | null
          related_entity_type: string | null
          result: Json | null
          retry_count: number | null
          scheduled_for: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          data: Json
          error_message?: string | null
          id?: number
          job_type: string
          next_retry_at?: string | null
          related_entity_id?: number | null
          related_entity_type?: string | null
          result?: Json | null
          retry_count?: number | null
          scheduled_for: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          data?: Json
          error_message?: string | null
          id?: number
          job_type?: string
          next_retry_at?: string | null
          related_entity_id?: number | null
          related_entity_type?: string | null
          result?: Json | null
          retry_count?: number | null
          scheduled_for?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sent_emails: {
        Row: {
          bcc_email: string[] | null
          cc_email: string[] | null
          click_count: number | null
          client_id: number | null
          created_at: string
          email_template_id: number | null
          error_message: string | null
          external_id: string | null
          first_clicked_at: string | null
          first_opened_at: string | null
          html_content: string | null
          id: number
          invoice_id: number | null
          last_opened_at: string | null
          open_count: number | null
          payment_id: number | null
          plain_text_content: string | null
          sent_at: string | null
          sent_by_user_id: number | null
          status: string
          subject: string
          to_email: string
          to_name: string | null
          updated_at: string
        }
        Insert: {
          bcc_email?: string[] | null
          cc_email?: string[] | null
          click_count?: number | null
          client_id?: number | null
          created_at?: string
          email_template_id?: number | null
          error_message?: string | null
          external_id?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          html_content?: string | null
          id?: number
          invoice_id?: number | null
          last_opened_at?: string | null
          open_count?: number | null
          payment_id?: number | null
          plain_text_content?: string | null
          sent_at?: string | null
          sent_by_user_id?: number | null
          status?: string
          subject: string
          to_email: string
          to_name?: string | null
          updated_at?: string
        }
        Update: {
          bcc_email?: string[] | null
          cc_email?: string[] | null
          click_count?: number | null
          client_id?: number | null
          created_at?: string
          email_template_id?: number | null
          error_message?: string | null
          external_id?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          html_content?: string | null
          id?: number
          invoice_id?: number | null
          last_opened_at?: string | null
          open_count?: number | null
          payment_id?: number | null
          plain_text_content?: string | null
          sent_at?: string | null
          sent_by_user_id?: number | null
          status?: string
          subject?: string
          to_email?: string
          to_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sent_emails_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_emails_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_emails_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_emails_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_emails_sent_by_user_id_fkey"
            columns: ["sent_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: number
          is_editable: boolean
          is_sensitive: boolean
          key: string
          updated_at: string
          updated_by_user_id: number | null
          validation_regex: string | null
          value: string | null
          value_type: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: number
          is_editable?: boolean
          is_sensitive?: boolean
          key: string
          updated_at?: string
          updated_by_user_id?: number | null
          validation_regex?: string | null
          value?: string | null
          value_type?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: number
          is_editable?: boolean
          is_sensitive?: boolean
          key?: string
          updated_at?: string
          updated_by_user_id?: number | null
          validation_regex?: string | null
          value?: string | null
          value_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string | null
          avatar_url: string | null
          created_at: string
          dashboard_layout: Json | null
          deleted_at: string | null
          department: string | null
          email: string
          first_name: string
          id: number
          job_title: string | null
          last_name: string
          mfa_enabled: boolean
          organization_id: number | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          uuid: string
        }
        Insert: {
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string
          dashboard_layout?: Json | null
          deleted_at?: string | null
          department?: string | null
          email: string
          first_name: string
          id?: number
          job_title?: string | null
          last_name: string
          mfa_enabled?: boolean
          organization_id?: number | null
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          uuid?: string
        }
        Update: {
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string
          dashboard_layout?: Json | null
          deleted_at?: string | null
          department?: string | null
          email?: string
          first_name?: string
          id?: number
          job_title?: string | null
          last_name?: string
          mfa_enabled?: boolean
          organization_id?: number | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_roles_lookup: {
        Row: {
          auth_id: string | null
          organization_id: number | null
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          auth_id?: string | null
          organization_id?: number | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          auth_id?: string | null
          organization_id?: number | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_aging_overview_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: number
          total: number
          amount_paid: number
          date_due: string
          status: Database["public"]["Enums"]["invoice_status"]
        }[]
      }
      get_aging_report: {
        Args: { from_date: string; to_date: string }
        Returns: {
          label: string
          value: number
          count: number
        }[]
      }
      get_all_users_in_organization: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: number
          email: string
          name: string
          role: string
          status: Database["public"]["Enums"]["user_status"]
        }[]
      }
      get_client_performance: {
        Args:
          | { from_date: string; to_date: string }
          | { from_date: string; to_date: string }
        Returns: Json
      }
      get_complete_report_data: {
        Args: { from_date: string; to_date: string }
        Returns: Json
      }
      get_monthly_trends: {
        Args: { from_date: string; to_date: string }
        Returns: {
          month: string
          invoiced: number
          collected: number
        }[]
      }
      get_my_claim: {
        Args: { claim: string }
        Returns: string
      }
      get_my_user_type: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_status_distribution: {
        Args: { from_date: string; to_date: string }
        Returns: {
          name: string
          value: number
          color: string
        }[]
      }
      get_top_cpt_codes: {
        Args:
          | { from_date: string; to_date: string }
          | { from_date: string; to_date: string; limit_count?: number }
        Returns: Json
      }
      global_search: {
        Args: { search_term: string }
        Returns: {
          id: string
          type: string
          title: string
          subtitle: string
        }[]
      }
      is_own_user_record: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_dashboard_layout: {
        Args: { new_layout: Json }
        Returns: undefined
      }
      user_has_any_role: {
        Args: { role_names: Database["public"]["Enums"]["user_role"][] }
        Returns: boolean
      }
      user_has_role: {
        Args: { role_name: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
    }
    Enums: {
      client_user_role: "admin" | "user"
      contact_method: "email" | "phone" | "fax" | "portal" | "mail" | "mobile"
      facility_type:
        | "hospital"
        | "lab"
        | "clinic"
        | "medical_office"
        | "nursing_home"
        | "other"
      invoice_status:
        | "draft"
        | "sent"
        | "partial"
        | "paid"
        | "dispute"
        | "write_off"
        | "exhausted"
        | "cancelled"
      payment_method:
        | "credit_card"
        | "check"
        | "ach"
        | "wire"
        | "cash"
        | "adjustment"
        | "write_off"
        | "other"
      payment_status:
        | "pending"
        | "received"
        | "deposited"
        | "cleared"
        | "failed"
        | "voided"
        | "refunded"
      priority: "low" | "normal" | "high" | "urgent"
      reconciliation_status:
        | "unreconciled"
        | "partially_reconciled"
        | "fully_reconciled"
        | "issue"
      sex: "male" | "female" | "other" | "unknown"
      user_role: "admin" | "ar_manager" | "staff"
      user_status: "active" | "inactive" | "invited"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      client_user_role: ["admin", "user"],
      contact_method: ["email", "phone", "fax", "portal", "mail", "mobile"],
      facility_type: [
        "hospital",
        "lab",
        "clinic",
        "medical_office",
        "nursing_home",
        "other",
      ],
      invoice_status: [
        "draft",
        "sent",
        "partial",
        "paid",
        "dispute",
        "write_off",
        "exhausted",
        "cancelled",
      ],
      payment_method: [
        "credit_card",
        "check",
        "ach",
        "wire",
        "cash",
        "adjustment",
        "write_off",
        "other",
      ],
      payment_status: [
        "pending",
        "received",
        "deposited",
        "cleared",
        "failed",
        "voided",
        "refunded",
      ],
      priority: ["low", "normal", "high", "urgent"],
      reconciliation_status: [
        "unreconciled",
        "partially_reconciled",
        "fully_reconciled",
        "issue",
      ],
      sex: ["male", "female", "other", "unknown"],
      user_role: ["admin", "ar_manager", "staff"],
      user_status: ["active", "inactive", "invited"],
    },
  },
} as const
