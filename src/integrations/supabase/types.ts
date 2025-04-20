export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      alert_acknowledgements: {
        Row: {
          action_taken: string | null
          alert_id: string
          contact_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          action_taken?: string | null
          alert_id: string
          contact_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          action_taken?: string | null
          alert_id?: string
          contact_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_acknowledgements_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_acknowledgements_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "emergency_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_notifications: {
        Row: {
          alert_id: string
          contact_id: string
          created_at: string | null
          error: string | null
          id: string
          status: string
          type: string
        }
        Insert: {
          alert_id: string
          contact_id: string
          created_at?: string | null
          error?: string | null
          id?: string
          status: string
          type: string
        }
        Update: {
          alert_id?: string
          contact_id?: string
          created_at?: string | null
          error?: string | null
          id?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_notifications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "emergency_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string | null
          distress_level: number | null
          id: string
          latitude: number | null
          longitude: number | null
          message: string | null
          resolved_at: string | null
          status: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          distress_level?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          resolved_at?: string | null
          status?: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          distress_level?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          resolved_at?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_history: {
        Row: {
          created_at: string | null
          distress_detected: boolean | null
          distress_level: number | null
          id: string
          is_user: boolean
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          distress_detected?: boolean | null
          distress_level?: number | null
          id?: string
          is_user?: boolean
          message: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          distress_detected?: boolean | null
          distress_level?: number | null
          id?: string
          is_user?: boolean
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          priority: number | null
          relationship: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          priority?: number | null
          relationship?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          priority?: number | null
          relationship?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          content: string | null
          entry_type: string | null
          id: number
          timestamp: string | null
          user_id: number
        }
        Insert: {
          content?: string | null
          entry_type?: string | null
          id?: number
          timestamp?: string | null
          user_id: number
        }
        Update: {
          content?: string | null
          entry_type?: string | null
          id?: number
          timestamp?: string | null
          user_id?: number
        }
        Relationships: []
      }
      location_logs: {
        Row: {
          accuracy: number | null
          battery_level: number | null
          created_at: string | null
          id: string
          latitude: number
          longitude: number
          speed: number | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          battery_level?: number | null
          created_at?: string | null
          id?: string
          latitude: number
          longitude: number
          speed?: number | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          battery_level?: number | null
          created_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          speed?: number | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_zones: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          latitude: number
          longitude: number
          name: string
          radius: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          latitude: number
          longitude: number
          name: string
          radius: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          radius?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safe_zones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_logs: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          location: Json | null
          metadata: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          location?: Json | null
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          location?: Json | null
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          ai_custom_instructions: string | null
          ai_personality_type: string | null
          ai_response_style: string | null
          ai_safety_focus_areas: string[] | null
          auto_alert_on_distress: boolean | null
          cooldown_period: number | null
          created_at: string | null
          distress_threshold: number | null
          id: string
          location_tracking_enabled: boolean | null
          notification_enabled: boolean | null
          notification_methods: Json | null
          updated_at: string | null
          user_id: string
          voice_detection_enabled: boolean | null
        }
        Insert: {
          ai_custom_instructions?: string | null
          ai_personality_type?: string | null
          ai_response_style?: string | null
          ai_safety_focus_areas?: string[] | null
          auto_alert_on_distress?: boolean | null
          cooldown_period?: number | null
          created_at?: string | null
          distress_threshold?: number | null
          id?: string
          location_tracking_enabled?: boolean | null
          notification_enabled?: boolean | null
          notification_methods?: Json | null
          updated_at?: string | null
          user_id: string
          voice_detection_enabled?: boolean | null
        }
        Update: {
          ai_custom_instructions?: string | null
          ai_personality_type?: string | null
          ai_response_style?: string | null
          ai_safety_focus_areas?: string[] | null
          auto_alert_on_distress?: boolean | null
          cooldown_period?: number | null
          created_at?: string | null
          distress_threshold?: number | null
          id?: string
          location_tracking_enabled?: boolean | null
          notification_enabled?: boolean | null
          notification_methods?: Json | null
          updated_at?: string | null
          user_id?: string
          voice_detection_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          last_login: string | null
          name: string
          password: string
          phone: string | null
          profile_image_url: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          last_login?: string | null
          name: string
          password: string
          phone?: string | null
          profile_image_url?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          last_login?: string | null
          name?: string
          password?: string
          phone?: string | null
          profile_image_url?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      voice_commands: {
        Row: {
          action: string
          command: string
          created_at: string | null
          description: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action: string
          command: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action?: string
          command?: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_commands_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_logs: {
        Row: {
          created_at: string | null
          distress_detected: boolean | null
          distress_level: number | null
          id: string
          keywords: string[] | null
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          distress_detected?: boolean | null
          distress_level?: number | null
          id?: string
          keywords?: string[] | null
          text: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          distress_detected?: boolean | null
          distress_level?: number | null
          id?: string
          keywords?: string[] | null
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
