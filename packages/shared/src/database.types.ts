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
      api_keys: {
        Row: {
          created_at: string | null
          id: string
          key_hash: string
          last_used_at: string | null
          merchant_id: string | null
          name: string | null
          prefix: string
          revoked_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_hash: string
          last_used_at?: string | null
          merchant_id?: string | null
          name?: string | null
          prefix: string
          revoked_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key_hash?: string
          last_used_at?: string | null
          merchant_id?: string | null
          name?: string | null
          prefix?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_verifications: {
        Row: {
          created_at: string | null
          customer_wallet: string
          expires_at: string | null
          id: string
          persona_inquiry_id: string | null
          status: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_wallet: string
          expires_at?: string | null
          id?: string
          persona_inquiry_id?: string | null
          status?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_wallet?: string
          expires_at?: string | null
          id?: string
          persona_inquiry_id?: string | null
          status?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      ledger_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: number
          merchant_id: string | null
          metadata: Json | null
          payment_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: number
          merchant_id?: string | null
          metadata?: Json | null
          payment_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: number
          merchant_id?: string | null
          metadata?: Json | null
          payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_payment_counters: {
        Row: {
          current_index: number
          merchant_id: string
          updated_at: string
        }
        Insert: {
          current_index?: number
          merchant_id: string
          updated_at?: string
        }
        Update: {
          current_index?: number
          merchant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_payment_counters_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_risk_rules: {
        Row: {
          action: string
          created_at: string | null
          enabled: boolean | null
          field: string
          id: string
          merchant_id: string | null
          operator: string
          value: Json
        }
        Insert: {
          action: string
          created_at?: string | null
          enabled?: boolean | null
          field: string
          id?: string
          merchant_id?: string | null
          operator: string
          value: Json
        }
        Update: {
          action?: string
          created_at?: string | null
          enabled?: boolean | null
          field?: string
          id?: string
          merchant_id?: string | null
          operator?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "merchant_risk_rules_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_settings: {
        Row: {
          created_at: string | null
          geo_block_enabled: boolean | null
          kyc_required: boolean | null
          merchant_id: string
          offramp_schedule: string | null
          offramp_splits: Json | null
          offramp_threshold_usd: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          geo_block_enabled?: boolean | null
          kyc_required?: boolean | null
          merchant_id: string
          offramp_schedule?: string | null
          offramp_splits?: Json | null
          offramp_threshold_usd?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          geo_block_enabled?: boolean | null
          kyc_required?: boolean | null
          merchant_id?: string
          offramp_schedule?: string | null
          offramp_splits?: Json | null
          offramp_threshold_usd?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_settings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          business_name: string
          category: string | null
          created_at: string | null
          email: string
          id: string
          master_wallet_evm: string | null
          master_wallet_sol: string | null
          saas_tier: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          website: string | null
        }
        Insert: {
          business_name: string
          category?: string | null
          created_at?: string | null
          email: string
          id?: string
          master_wallet_evm?: string | null
          master_wallet_sol?: string | null
          saas_tier?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          website?: string | null
        }
        Update: {
          business_name?: string
          category?: string | null
          created_at?: string | null
          email?: string
          id?: string
          master_wallet_evm?: string | null
          master_wallet_sol?: string | null
          saas_tier?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      offramp_transfers: {
        Row: {
          amount_usd: number
          bank_id: string
          bridge_transfer_id: string | null
          completed_at: string | null
          created_at: string | null
          estimated_arrival: string | null
          id: string
          merchant_id: string | null
          status: string | null
        }
        Insert: {
          amount_usd: number
          bank_id: string
          bridge_transfer_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          estimated_arrival?: string | null
          id?: string
          merchant_id?: string | null
          status?: string | null
        }
        Update: {
          amount_usd?: number
          bank_id?: string
          bridge_transfer_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          estimated_arrival?: string | null
          id?: string
          merchant_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offramp_transfers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_crypto: number | null
          amount_usd: number
          chain: string | null
          confirmed_at: string | null
          created_at: string | null
          custodial_private_key: string | null
          external_ref: string | null
          id: string
          merchant_id: string | null
          risk_score: number | null
          status: string | null
          stealth_address: string
          swept_at: string | null
          token: string | null
          tx_hash: string | null
        }
        Insert: {
          amount_crypto?: number | null
          amount_usd: number
          chain?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          custodial_private_key?: string | null
          external_ref?: string | null
          id?: string
          merchant_id?: string | null
          risk_score?: number | null
          status?: string | null
          stealth_address: string
          swept_at?: string | null
          token?: string | null
          tx_hash?: string | null
        }
        Update: {
          amount_crypto?: number | null
          amount_usd?: number
          chain?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          custodial_private_key?: string | null
          external_ref?: string | null
          id?: string
          merchant_id?: string | null
          risk_score?: number | null
          status?: string | null
          stealth_address?: string
          swept_at?: string | null
          token?: string | null
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_events: {
        Row: {
          action: string | null
          created_at: string | null
          id: string
          payment_id: string | null
          score: number
          signals: Json | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: string
          payment_id?: string | null
          score: number
          signals?: Json | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: string
          payment_id?: string | null
          score?: number
          signals?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_usd: number
          chain: string
          created_at: string | null
          customer_wallet: string
          delegation_sig: string | null
          failure_count: number | null
          id: string
          interval: string
          merchant_id: string | null
          next_billing: string | null
          plan_id: string
          status: string | null
        }
        Insert: {
          amount_usd: number
          chain: string
          created_at?: string | null
          customer_wallet: string
          delegation_sig?: string | null
          failure_count?: number | null
          id?: string
          interval: string
          merchant_id?: string | null
          next_billing?: string | null
          plan_id: string
          status?: string | null
        }
        Update: {
          amount_usd?: number
          chain?: string
          created_at?: string | null
          customer_wallet?: string
          delegation_sig?: string | null
          failure_count?: number | null
          id?: string
          interval?: string
          merchant_id?: string | null
          next_billing?: string | null
          plan_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempts: number | null
          created_at: string | null
          delivered_at: string | null
          endpoint_id: string | null
          event_type: string
          id: string
          next_retry: string | null
          payload: Json
          payment_id: string | null
          status: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          delivered_at?: string | null
          endpoint_id?: string | null
          event_type: string
          id?: string
          next_retry?: string | null
          payload: Json
          payment_id?: string | null
          status?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          delivered_at?: string | null
          endpoint_id?: string | null
          event_type?: string
          id?: string
          next_retry?: string | null
          payload?: Json
          payment_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          events: string[] | null
          id: string
          merchant_id: string | null
          secret_hash: string
          url: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          events?: string[] | null
          id?: string
          merchant_id?: string | null
          secret_hash: string
          url: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          events?: string[] | null
          id?: string
          merchant_id?: string | null
          secret_hash?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_events: {
        Row: {
          created_at: string | null
          id: string
          merchant_id: string | null
          metadata: Json | null
          session_id: string
          step: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          merchant_id?: string | null
          metadata?: Json | null
          session_id: string
          step: string
        }
        Update: {
          created_at?: string | null
          id?: string
          merchant_id?: string | null
          metadata?: Json | null
          session_id?: string
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_payment_index: {
        Args: { p_merchant_id: string }
        Returns: number
      }
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
