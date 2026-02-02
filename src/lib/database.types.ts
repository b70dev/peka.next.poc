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
      get_auto_create_account_types: { Args: Record<PropertyKey, never>; Returns: string[] }
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
      is_admin_or_above: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_admin_user: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_authenticated_active_user: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_super_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
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

// ============================================
// Helper Types (existing)
// ============================================
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']
export type UserRole = 'super_admin' | 'admin' | 'viewer'
export type Language = 'de' | 'en' | 'fr'

export type InsuredPerson = Database['public']['Tables']['insured_persons']['Row']
export type InsuredPersonInsert = Database['public']['Tables']['insured_persons']['Insert']
export type InsuredPersonUpdate = Database['public']['Tables']['insured_persons']['Update']
export type InsuredPersonStatus = Database['public']['Enums']['insured_person_status']
export type GenderType = Database['public']['Enums']['gender_type']
export type MaritalStatusType = Database['public']['Enums']['marital_status_type']

export type Employer = Database['public']['Tables']['employers']['Row']
export type EmployerInsert = Database['public']['Tables']['employers']['Insert']
export type EmployerUpdate = Database['public']['Tables']['employers']['Update']

export type UserTablePreferences = Database['public']['Tables']['user_table_preferences']['Row']
export type SortDirection = Database['public']['Enums']['sort_direction']

export type Employment = Database['public']['Tables']['employments']['Row']
export type EmploymentInsert = Database['public']['Tables']['employments']['Insert']
export type EmploymentUpdate = Database['public']['Tables']['employments']['Update']

export type InsuredPersonStatusType = {
  id: string
  name: string
  name_en: string
  name_fr: string
  color: string
  sort_order: number
  is_final: boolean | null
  requires_date: boolean | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

export type StatusTransition = {
  id: string
  from_status_id: string
  to_status_id: string
}

// ============================================
// PROJ-10: Account Management Types
// ============================================

// Account Types (Kontotypen)
export type AccountType = Database['public']['Tables']['account_types']['Row']
export type AccountTypeInsert = Database['public']['Tables']['account_types']['Insert']
export type AccountTypeUpdate = Database['public']['Tables']['account_types']['Update']

// Transaction Types (Transaktionstypen)
export type TransactionType = Database['public']['Tables']['transaction_types']['Row']
export type TransactionTypeInsert = Database['public']['Tables']['transaction_types']['Insert']
export type TransactionTypeUpdate = Database['public']['Tables']['transaction_types']['Update']

// Accounts (Konten)
export type Account = Database['public']['Tables']['accounts']['Row']
export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
export type AccountUpdate = Database['public']['Tables']['accounts']['Update']

// Transactions (Transaktionen)
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

// Views
export type AccountBalance = Database['public']['Views']['account_balances']['Row']
export type AccountSummary = Database['public']['Views']['account_summaries']['Row']

// Enums
export type BalanceEffect = Database['public']['Enums']['balance_effect']
export type TransactionEffect = Database['public']['Enums']['transaction_effect']

// Extended types with relations
export type AccountWithType = Account & {
  account_type: AccountType
}

export type AccountWithBalance = Account & {
  account_type: AccountType
  balance: number
  transaction_count: number
  last_transaction_date: string | null
}

export type TransactionWithType = Transaction & {
  transaction_type: TransactionType
}

export type TransactionWithRunningBalance = {
  id: string
  transaction_type_id: string
  transaction_type_code: string
  transaction_type_name: string
  effect: TransactionEffect
  amount: number
  signed_amount: number
  booking_date: string
  value_date: string
  reference: string | null
  description: string | null
  related_transaction_id: string | null
  is_reversed: boolean
  created_by: string | null
  created_at: string
  running_balance: number
}
