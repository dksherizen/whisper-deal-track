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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chats: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          added_at: string
          company: string | null
          id: string
          name: string
          notes: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          company?: string | null
          id?: string
          name: string
          notes?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          company?: string | null
          id?: string
          name?: string
          notes?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          aliases: string | null
          asking_price: number | null
          beds: number | null
          broker: string | null
          broker_firm: string | null
          condition: string | null
          country: string | null
          cqc_rating: string | null
          created_at: string
          currency: string | null
          ebitda: number | null
          ebitdar: number | null
          id: string
          internal_lead: string | null
          key_contact: string | null
          landlord: string | null
          name: string
          next_step: string | null
          next_step_date: string | null
          next_step_owner: string | null
          notes: string | null
          occupancy: number | null
          operator: string | null
          partner: string | null
          property_type: string | null
          region: string | null
          regulatory_notes: string | null
          rent_coverage: number | null
          revenue: number | null
          risks: string | null
          seller: string | null
          solicitor_buyer: string | null
          solicitor_seller: string | null
          stage: string
          tenure: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aliases?: string | null
          asking_price?: number | null
          beds?: number | null
          broker?: string | null
          broker_firm?: string | null
          condition?: string | null
          country?: string | null
          cqc_rating?: string | null
          created_at?: string
          currency?: string | null
          ebitda?: number | null
          ebitdar?: number | null
          id?: string
          internal_lead?: string | null
          key_contact?: string | null
          landlord?: string | null
          name: string
          next_step?: string | null
          next_step_date?: string | null
          next_step_owner?: string | null
          notes?: string | null
          occupancy?: number | null
          operator?: string | null
          partner?: string | null
          property_type?: string | null
          region?: string | null
          regulatory_notes?: string | null
          rent_coverage?: number | null
          revenue?: number | null
          risks?: string | null
          seller?: string | null
          solicitor_buyer?: string | null
          solicitor_seller?: string | null
          stage?: string
          tenure?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aliases?: string | null
          asking_price?: number | null
          beds?: number | null
          broker?: string | null
          broker_firm?: string | null
          condition?: string | null
          country?: string | null
          cqc_rating?: string | null
          created_at?: string
          currency?: string | null
          ebitda?: number | null
          ebitdar?: number | null
          id?: string
          internal_lead?: string | null
          key_contact?: string | null
          landlord?: string | null
          name?: string
          next_step?: string | null
          next_step_date?: string | null
          next_step_owner?: string | null
          notes?: string | null
          occupancy?: number | null
          operator?: string | null
          partner?: string | null
          property_type?: string | null
          region?: string | null
          regulatory_notes?: string | null
          rent_coverage?: number | null
          revenue?: number | null
          risks?: string | null
          seller?: string | null
          solicitor_buyer?: string | null
          solicitor_seller?: string | null
          stage?: string
          tenure?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delegations: {
        Row: {
          assignee: string
          created_at: string
          date: string
          deal_id: string
          done: boolean
          id: string
          task: string
        }
        Insert: {
          assignee: string
          created_at?: string
          date?: string
          deal_id: string
          done?: boolean
          id?: string
          task: string
        }
        Update: {
          assignee?: string
          created_at?: string
          date?: string
          deal_id?: string
          done?: boolean
          id?: string
          task?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string | null
          created_at: string
          id: string
          is_error: boolean
          role: string
          text: string
          user_id: string
        }
        Insert: {
          chat_id?: string | null
          created_at?: string
          id?: string
          is_error?: boolean
          role: string
          text: string
          user_id: string
        }
        Update: {
          chat_id?: string | null
          created_at?: string
          id?: string
          is_error?: boolean
          role?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_entries: {
        Row: {
          created_at: string
          date: string
          deal_id: string
          id: string
          source: string | null
          text: string
        }
        Insert: {
          created_at?: string
          date?: string
          deal_id: string
          id?: string
          source?: string | null
          text: string
        }
        Update: {
          created_at?: string
          date?: string
          deal_id?: string
          id?: string
          source?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_entries_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
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
    Enums: {},
  },
} as const
