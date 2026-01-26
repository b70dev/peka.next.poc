export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
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
        Relationships: []
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
      insured_person_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          insured_person_id: string
          new_status: Database["public"]["Enums"]["insured_person_status"]
          old_status:
            | Database["public"]["Enums"]["insured_person_status"]
            | null
          reason: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          insured_person_id: string
          new_status: Database["public"]["Enums"]["insured_person_status"]
          old_status?:
            | Database["public"]["Enums"]["insured_person_status"]
            | null
          reason?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          insured_person_id?: string
          new_status?: Database["public"]["Enums"]["insured_person_status"]
          old_status?:
            | Database["public"]["Enums"]["insured_person_status"]
            | null
          reason?: string | null
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
          street?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      gender_type: "m" | "f" | "d"
      insured_person_status: "active" | "exited" | "retired" | "deceased"
      marital_status_type:
        | "single"
        | "married"
        | "divorced"
        | "widowed"
        | "registered_partnership"
      sort_direction: "asc" | "desc"
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

// Helper types
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
