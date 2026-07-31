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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          employee_id: string
          id: string
          job_id: string
          resume_url: string | null
          status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          employee_id: string
          id?: string
          job_id: string
          resume_url?: string | null
          status?: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          job_id?: string
          resume_url?: string | null
          status?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_profiles: {
        Row: {
          bio: string | null
          category: string
          created_at: string
          id_back_url: string | null
          id_front_url: string | null
          lat: number | null
          license_back_url: string | null
          license_category: string | null
          license_front_url: string | null
          lng: number | null
          location_text: string | null
          price_fee: number | null
          status: Database["public"]["Enums"]["employee_status"]
          subscription_expires_at: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          category: string
          created_at?: string
          id_back_url?: string | null
          id_front_url?: string | null
          lat?: number | null
          license_back_url?: string | null
          license_category?: string | null
          license_front_url?: string | null
          lng?: number | null
          location_text?: string | null
          price_fee?: number | null
          status?: Database["public"]["Enums"]["employee_status"]
          subscription_expires_at?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          category?: string
          created_at?: string
          id_back_url?: string | null
          id_front_url?: string | null
          lat?: number | null
          license_back_url?: string | null
          license_category?: string | null
          license_front_url?: string | null
          lng?: number | null
          location_text?: string | null
          price_fee?: number | null
          status?: Database["public"]["Enums"]["employee_status"]
          subscription_expires_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          admin_id: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          location: string | null
          requires_cover_letter: boolean
          requires_resume: boolean
          title: string
        }
        Insert: {
          admin_id?: string | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          requires_cover_letter?: boolean
          requires_resume?: boolean
          title: string
        }
        Update: {
          admin_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          requires_cover_letter?: boolean
          requires_resume?: boolean
          title?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          from_admin: boolean
          from_user_id: string
          id: string
          thread_user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          from_admin?: boolean
          from_user_id: string
          id?: string
          thread_user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          from_admin?: boolean
          from_user_id?: string
          id?: string
          thread_user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          confirmed: boolean
          confirmed_at: string | null
          id: string
          momo_code: string | null
          purpose: string
          reported_at: string
          reservation_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          confirmed?: boolean
          confirmed_at?: string | null
          id?: string
          momo_code?: string | null
          purpose: string
          reported_at?: string
          reservation_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          confirmed?: boolean
          confirmed_at?: string | null
          id?: string
          momo_code?: string | null
          purpose?: string
          reported_at?: string
          reservation_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          language: string | null
          last_name: string | null
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          language?: string | null
          last_name?: string | null
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          created_at: string
          employee_id: string
          employer_id: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["reservation_status"]
        }
        Insert: {
          created_at?: string
          employee_id: string
          employer_id: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
        }
        Update: {
          created_at?: string
          employee_id?: string
          employer_id?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employee" | "employer"
      application_status: "pending" | "accepted" | "rejected"
      employee_status:
        | "dormant"
        | "pending_activation"
        | "active"
        | "suspended"
        | "in_service"
      reservation_status:
        | "pending_payment"
        | "payment_reported"
        | "confirmed"
        | "in_service"
        | "completed"
        | "cancelled"
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
      app_role: ["admin", "employee", "employer"],
      application_status: ["pending", "accepted", "rejected"],
      employee_status: [
        "dormant",
        "pending_activation",
        "active",
        "suspended",
        "in_service",
      ],
      reservation_status: [
        "pending_payment",
        "payment_reported",
        "confirmed",
        "in_service",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
