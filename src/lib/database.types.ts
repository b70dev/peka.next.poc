export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_types: {
        Row: {
          affects_balance: Database["public"]["Enums"]["balance_effect"]
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name_de: string
          name_en: string | null
          name_fr: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          affects_balance?: Database["public"]["Enums"]["balance_effect"]
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name_de: string
          name_en?: string | null
          name_fr?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          affects_balance?: Database["public"]["Enums"]["balance_effect"]
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name_de?: string
          name_en?: string | null
          name_fr?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          account_type_id: string
          created_at: string
          employment_id: string
          id: string
          is_active: boolean
          name: string | null
          updated_at: string
        }
        Insert: {
          account_type_id: string
          created_at?: string
          employment_id: string
          id?: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
        }
        Update: {
          account_type_id?: string
          created_at?: string
          employment_id?: string
          id?: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_account_type_id_fkey"
            columns: ["account_type_id"]
            isOneToOne: false
            referencedRelation: "account_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_employment_id_fkey"
            columns: ["employment_id"]
            isOneToOne: false
            referencedRelation: "employments"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_contribution_rate_versions: {
        Row: {
          created_at: string
          created_by: string | null
          employer_id: string
          id: string
          same_for_all_genders: boolean
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employer_id: string
          id?: string
          same_for_all_genders?: boolean
          updated_at?: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employer_id?: string
          id?: string
          same_for_all_genders?: boolean
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employer_contribution_rate_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_contribution_rate_versions_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_contribution_rates: {
        Row: {
          age: number
          employee_rate: number
          employer_rate: number
          gender: string | null
          id: string
          version_id: string
        }
        Insert: {
          age: number
          employee_rate?: number
          employer_rate?: number
          gender?: string | null
          id?: string
          version_id: string
        }
        Update: {
          age?: number
          employee_rate?: number
          employer_rate?: number
          gender?: string | null
          id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employer_contribution_rates_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "employer_contribution_rate_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_settings: {
        Row: {
          conversion_rate_ueob: number
          created_at: string
          employee_contribution_rate: number | null
          employer_contribution_rate: number | null
          employer_id: string
          id: string
          interest_rate_override: number | null
          notes: string | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          conversion_rate_ueob?: number
          created_at?: string
          employee_contribution_rate?: number | null
          employer_contribution_rate?: number | null
          employer_id: string
          id?: string
          interest_rate_override?: number | null
          notes?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          conversion_rate_ueob?: number
          created_at?: string
          employee_contribution_rate?: number | null
          employer_contribution_rate?: number | null
          employer_id?: string
          id?: string
          interest_rate_override?: number | null
          notes?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employer_settings_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      employers: {
        Row: {
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          postal_code: string | null
          street: string | null
          uid: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          postal_code?: string | null
          street?: string | null
          uid?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          postal_code?: string | null
          street?: string | null
          uid?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      employments: {
        Row: {
          created_at: string | null
          created_by: string | null
          employer_id: string
          employment_rate: number
          entry_date: string
          exit_date: string | null
          id: string
          insured_person_id: string
          is_primary: boolean | null
          notes: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          employer_id: string
          employment_rate: number
          entry_date: string
          exit_date?: string | null
          id?: string
          insured_person_id: string
          is_primary?: boolean | null
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          employer_id?: string
          employment_rate?: number
          entry_date?: string
          exit_date?: string | null
          id?: string
          insured_person_id?: string
          is_primary?: boolean | null
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employments_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employments_insured_person_id_fkey"
            columns: ["insured_person_id"]
            isOneToOne: false
            referencedRelation: "insured_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insured_person_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          effective_date: string | null
          id: string
          insured_person_id: string
          new_status: Database["public"]["Enums"]["insured_person_status"]
          new_status_type_id: string | null
          old_status:
            | Database["public"]["Enums"]["insured_person_status"]
            | null
          old_status_type_id: string | null
          reason: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          effective_date?: string | null
          id?: string
          insured_person_id: string
          new_status: Database["public"]["Enums"]["insured_person_status"]
          new_status_type_id?: string | null
          old_status?:
            | Database["public"]["Enums"]["insured_person_status"]
            | null
          old_status_type_id?: string | null
          reason?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          effective_date?: string | null
          id?: string
          insured_person_id?: string
          new_status?: Database["public"]["Enums"]["insured_person_status"]
          new_status_type_id?: string | null
          old_status?:
            | Database["public"]["Enums"]["insured_person_status"]
            | null
          old_status_type_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insured_person_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insured_person_status_history_insured_person_id_fkey"
            columns: ["insured_person_id"]
            isOneToOne: false
            referencedRelation: "insured_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insured_person_status_history_new_status_type_id_fkey"
            columns: ["new_status_type_id"]
            isOneToOne: false
            referencedRelation: "insured_person_status_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insured_person_status_history_old_status_type_id_fkey"
            columns: ["old_status_type_id"]
            isOneToOne: false
            referencedRelation: "insured_person_status_types"
            referencedColumns: ["id"]
          },
        ]
      }
      insured_person_status_transitions: {
        Row: {
          from_status_id: string
          id: string
          to_status_id: string
        }
        Insert: {
          from_status_id: string
          id?: string
          to_status_id: string
        }
        Update: {
          from_status_id?: string
          id?: string
          to_status_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insured_person_status_transitions_from_status_id_fkey"
            columns: ["from_status_id"]
            isOneToOne: false
            referencedRelation: "insured_person_status_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insured_person_status_transitions_to_status_id_fkey"
            columns: ["to_status_id"]
            isOneToOne: false
            referencedRelation: "insured_person_status_types"
            referencedColumns: ["id"]
          },
        ]
      }
      insured_person_status_types: {
        Row: {
          color: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_final: boolean | null
          name: string
          name_en: string
          name_fr: string
          requires_date: boolean | null
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_final?: boolean | null
          name: string
          name_en: string
          name_fr: string
          requires_date?: boolean | null
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_final?: boolean | null
          name?: string
          name_en?: string
          name_fr?: string
          requires_date?: boolean | null
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      insured_persons: {
        Row: {
          ahv_number: string
          city: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employer_id: string | null
          entry_date: string
          exit_date: string | null
          first_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          last_name: string
          marital_status:
            | Database["public"]["Enums"]["marital_status_type"]
            | null
          mobile: string | null
          nationality: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          status: Database["public"]["Enums"]["insured_person_status"] | null
          status_type_id: string | null
          street: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          ahv_number: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer_id?: string | null
          entry_date: string
          exit_date?: string | null
          first_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          last_name: string
          marital_status?:
            | Database["public"]["Enums"]["marital_status_type"]
            | null
          mobile?: string | null
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          status?: Database["public"]["Enums"]["insured_person_status"] | null
          status_type_id?: string | null
          street?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          ahv_number?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer_id?: string | null
          entry_date?: string
          exit_date?: string | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          last_name?: string
          marital_status?:
            | Database["public"]["Enums"]["marital_status_type"]
            | null
          mobile?: string | null
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          status?: Database["public"]["Enums"]["insured_person_status"] | null
          status_type_id?: string | null
          street?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insured_persons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insured_persons_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insured_persons_status_type_id_fkey"
            columns: ["status_type_id"]
            isOneToOne: false
            referencedRelation: "insured_person_status_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insured_persons_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projection_parameters: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          valid_from: string
          valid_to: string | null
          value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
          value: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
          value?: number
        }
        Relationships: []
      }
      projection_scenarios: {
        Row: {
          capital_ratio: number
          conversion_rate_obl: number
          conversion_rate_ueob: number
          created_at: string
          id: string
          interest_rate: number
          name: string
          projection_id: string
          purchase_amount: number
          result_capital_obl: number | null
          result_capital_ueob: number | null
          result_pension_obl: number | null
          result_pension_ueob: number | null
          result_purchase_potential: number | null
          retirement_age: number
          salary_growth_rate: number
          sort_order: number
        }
        Insert: {
          capital_ratio?: number
          conversion_rate_obl?: number
          conversion_rate_ueob?: number
          created_at?: string
          id?: string
          interest_rate?: number
          name?: string
          projection_id: string
          purchase_amount?: number
          result_capital_obl?: number | null
          result_capital_ueob?: number | null
          result_pension_obl?: number | null
          result_pension_ueob?: number | null
          result_purchase_potential?: number | null
          retirement_age?: number
          salary_growth_rate?: number
          sort_order?: number
        }
        Update: {
          capital_ratio?: number
          conversion_rate_obl?: number
          conversion_rate_ueob?: number
          created_at?: string
          id?: string
          interest_rate?: number
          name?: string
          projection_id?: string
          purchase_amount?: number
          result_capital_obl?: number | null
          result_capital_ueob?: number | null
          result_pension_obl?: number | null
          result_pension_ueob?: number | null
          result_purchase_potential?: number | null
          retirement_age?: number
          salary_growth_rate?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "projection_scenarios_projection_id_fkey"
            columns: ["projection_id"]
            isOneToOne: false
            referencedRelation: "projections"
            referencedColumns: ["id"]
          },
        ]
      }
      projections: {
        Row: {
          annual_contribution: number
          base_balance_date: string
          base_balance_obl: number
          base_balance_ueob: number
          created_at: string
          created_by: string | null
          employment_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          annual_contribution?: number
          base_balance_date?: string
          base_balance_obl?: number
          base_balance_ueob?: number
          created_at?: string
          created_by?: string | null
          employment_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          annual_contribution?: number
          base_balance_date?: string
          base_balance_obl?: number
          base_balance_ueob?: number
          created_at?: string
          created_by?: string | null
          employment_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projections_employment_id_fkey"
            columns: ["employment_id"]
            isOneToOne: false
            referencedRelation: "employments"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          effect: Database["public"]["Enums"]["transaction_effect"]
          id: string
          is_active: boolean
          is_reversible: boolean
          is_system: boolean
          name_de: string
          name_en: string | null
          name_fr: string | null
          requires_reference: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          effect: Database["public"]["Enums"]["transaction_effect"]
          id?: string
          is_active?: boolean
          is_reversible?: boolean
          is_system?: boolean
          name_de: string
          name_en?: string | null
          name_fr?: string | null
          requires_reference?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          effect?: Database["public"]["Enums"]["transaction_effect"]
          id?: string
          is_active?: boolean
          is_reversible?: boolean
          is_system?: boolean
          name_de?: string
          name_en?: string | null
          name_fr?: string | null
          requires_reference?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          booking_date: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_reversed: boolean
          reference: string | null
          related_transaction_id: string | null
          transaction_type_id: string
          value_date: string
        }
        Insert: {
          account_id: string
          amount: number
          booking_date: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_reversed?: boolean
          reference?: string | null
          related_transaction_id?: string | null
          transaction_type_id: string
          value_date: string
        }
        Update: {
          account_id?: string
          amount?: number
          booking_date?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_reversed?: boolean
          reference?: string | null
          related_transaction_id?: string | null
          transaction_type_id?: string
          value_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_related_transaction_id_fkey"
            columns: ["related_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_transaction_type_id_fkey"
            columns: ["transaction_type_id"]
            isOneToOne: false
            referencedRelation: "transaction_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          language: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          language?: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          language?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_table_preferences: {
        Row: {
          column_order: Json | null
          created_at: string | null
          group_by: string | null
          id: string
          page_size: number | null
          sort_by: string | null
          sort_direction: Database["public"]["Enums"]["sort_direction"] | null
          table_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          column_order?: Json | null
          created_at?: string | null
          group_by?: string | null
          id?: string
          page_size?: number | null
          sort_by?: string | null
          sort_direction?: Database["public"]["Enums"]["sort_direction"] | null
          table_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          column_order?: Json | null
          created_at?: string | null
          group_by?: string | null
          id?: string
          page_size?: number | null
          sort_by?: string | null
          sort_direction?: Database["public"]["Enums"]["sort_direction"] | null
          table_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_table_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_balances: {
        Row: {
          account_id: string | null
          account_type_code: string | null
          account_type_id: string | null
          account_type_name: string | null
          affects_balance: Database["public"]["Enums"]["balance_effect"] | null
          balance: number | null
          employment_id: string | null
          last_transaction_date: string | null
          transaction_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_account_type_id_fkey"
            columns: ["account_type_id"]
            isOneToOne: false
            referencedRelation: "account_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_employment_id_fkey"
            columns: ["employment_id"]
            isOneToOne: false
            referencedRelation: "employments"
            referencedColumns: ["id"]
          },
        ]
      }
      account_summaries: {
        Row: {
          active_account_count: number | null
          employment_id: string | null
          last_transaction_date: string | null
          total_account_count: number | null
          total_balance: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_employment_id_fkey"
            columns: ["employment_id"]
            isOneToOne: false
            referencedRelation: "employments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_account_balance_at_date: {
        Args: { p_account_id: string; p_date: string }
        Returns: number
      }
      get_auto_create_account_types: { Args: never; Returns: string[] }
      get_bvg_minimum_rates: {
        Args: never
        Returns: {
          age: number
          employee_rate: number
          employer_rate: number
          total_rate: number
        }[]
      }
      get_contribution_rate_for_age: {
        Args: {
          p_age: number
          p_employer_id: string
          p_gender?: string
          p_reference_date?: string
        }
        Returns: {
          employee_rate: number
          employer_rate: number
          total_rate: number
        }[]
      }
      get_projection_parameter: {
        Args: { p_date?: string; p_key: string }
        Returns: number
      }
      get_transactions_with_running_balance: {
        Args: { p_account_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          amount: number
          booking_date: string
          created_at: string
          created_by: string
          description: string
          effect: Database["public"]["Enums"]["transaction_effect"]
          id: string
          is_reversed: boolean
          reference: string
          related_transaction_id: string
          running_balance: number
          signed_amount: number
          transaction_type_code: string
          transaction_type_id: string
          transaction_type_name: string
          value_date: string
        }[]
      }
      is_admin_or_above: { Args: never; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_authenticated_active_user: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      balance_effect: "positive" | "negative" | "neutral"
      gender_type: "m" | "f" | "d"
      insured_person_status: "active" | "exited" | "retired" | "deceased"
      marital_status_type:
        | "single"
        | "married"
        | "divorced"
        | "widowed"
        | "registered_partnership"
      sort_direction: "asc" | "desc"
      transaction_effect: "credit" | "debit"
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
      balance_effect: ["positive", "negative", "neutral"],
      gender_type: ["m", "f", "d"],
      insured_person_status: ["active", "exited", "retired", "deceased"],
      marital_status_type: [
        "single",
        "married",
        "divorced",
        "widowed",
        "registered_partnership",
      ],
      sort_direction: ["asc", "desc"],
      transaction_effect: ["credit", "debit"],
    },
  },
} as const

// Convenience type aliases for common operations

// Employments
export type Employment = Database["public"]["Tables"]["employments"]["Row"]
export type EmploymentRow = Database["public"]["Tables"]["employments"]["Row"]
export type EmploymentInsert = Database["public"]["Tables"]["employments"]["Insert"]
export type EmploymentUpdate = Database["public"]["Tables"]["employments"]["Update"]

// Insured Persons
export type InsuredPerson = Database["public"]["Tables"]["insured_persons"]["Row"]
export type InsuredPersonRow = Database["public"]["Tables"]["insured_persons"]["Row"]
export type InsuredPersonInsert = Database["public"]["Tables"]["insured_persons"]["Insert"]
export type InsuredPersonUpdate = Database["public"]["Tables"]["insured_persons"]["Update"]
export type InsuredPersonStatus = Database["public"]["Enums"]["insured_person_status"]

// Employers
export type Employer = Database["public"]["Tables"]["employers"]["Row"]
export type EmployerRow = Database["public"]["Tables"]["employers"]["Row"]
export type EmployerInsert = Database["public"]["Tables"]["employers"]["Insert"]
export type EmployerUpdate = Database["public"]["Tables"]["employers"]["Update"]

// Projections
export type Projection = Database["public"]["Tables"]["projections"]["Row"]
export type ProjectionRow = Database["public"]["Tables"]["projections"]["Row"]
export type ProjectionInsert = Database["public"]["Tables"]["projections"]["Insert"]
export type ProjectionUpdate = Database["public"]["Tables"]["projections"]["Update"]

export type ProjectionScenario = Database["public"]["Tables"]["projection_scenarios"]["Row"]
export type ProjectionScenarioRow = Database["public"]["Tables"]["projection_scenarios"]["Row"]
export type ProjectionScenarioInsert = Database["public"]["Tables"]["projection_scenarios"]["Insert"]
export type ProjectionScenarioUpdate = Database["public"]["Tables"]["projection_scenarios"]["Update"]

// Accounts
export type Account = Database["public"]["Tables"]["accounts"]["Row"]
export type AccountType = Database["public"]["Tables"]["account_types"]["Row"]
export type AccountBalance = Database["public"]["Views"]["account_balances"]["Row"]
export type AccountSummary = Database["public"]["Views"]["account_summaries"]["Row"]
export type BalanceEffect = Database["public"]["Enums"]["balance_effect"]

// Transactions
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"]
export type TransactionType = Database["public"]["Tables"]["transaction_types"]["Row"]
export type TransactionEffect = Database["public"]["Enums"]["transaction_effect"]

// For the transactions with running balance function result
export type TransactionWithRunningBalance = Database["public"]["Functions"]["get_transactions_with_running_balance"]["Returns"][number]

// Contribution Rate Versions
export type ContributionRateVersion = Database["public"]["Tables"]["employer_contribution_rate_versions"]["Row"]
export type ContributionRateVersionRow = Database["public"]["Tables"]["employer_contribution_rate_versions"]["Row"]
export type ContributionRateVersionInsert = Database["public"]["Tables"]["employer_contribution_rate_versions"]["Insert"]
export type ContributionRateVersionUpdate = Database["public"]["Tables"]["employer_contribution_rate_versions"]["Update"]

// Contribution Rates
export type ContributionRate = Database["public"]["Tables"]["employer_contribution_rates"]["Row"]
export type ContributionRateRow = Database["public"]["Tables"]["employer_contribution_rates"]["Row"]
export type ContributionRateInsert = Database["public"]["Tables"]["employer_contribution_rates"]["Insert"]
export type ContributionRateUpdate = Database["public"]["Tables"]["employer_contribution_rates"]["Update"]

// BVG Minimum Rates (from function)
export type BvgMinimumRate = Database["public"]["Functions"]["get_bvg_minimum_rates"]["Returns"][number]

// Contribution Rate for Age (from function)
export type ContributionRateForAge = Database["public"]["Functions"]["get_contribution_rate_for_age"]["Returns"][number]
