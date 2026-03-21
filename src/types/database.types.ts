/**
 * Tipos del esquema `public` de Supabase para el cliente tipado.
 *
 * Regenerar desde el proyecto (recomendado cuando tengas el CLI enlazado):
 *   npm run db:types
 *
 * Sin Docker/local: este archivo es la fuente de verdad mantenida con el código y
 * `supabase/migrations/*.sql`. Tras `supabase gen types`, puedes sustituir el contenido.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      app_users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          is_active: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role: string;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: string;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      charges: {
        Row: {
          id: string;
          student_id: string;
          grade_id: string | null;
          academic_year: number;
          concept: string;
          month: number;
          due_date: string | null;
          amount: number | null;
          paid_amount: number | null;
          currency: string | null;
          status: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          grade_id?: string | null;
          academic_year: number;
          concept: string;
          month: number;
          due_date?: string | null;
          amount?: number | null;
          paid_amount?: number | null;
          currency?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          grade_id?: string | null;
          academic_year?: number;
          concept?: string;
          month?: number;
          due_date?: string | null;
          amount?: number | null;
          paid_amount?: number | null;
          currency?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      enrollment_pricing: {
        Row: {
          id: string;
          general_amount: number | null;
          currency: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Insert: {
          id?: string;
          general_amount?: number | null;
          currency?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          general_amount?: number | null;
          currency?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          academic_year: number;
          total_amount: number | null;
          paid_amount: number | null;
          change_amount: number | null;
          currency: string | null;
          status: string | null;
          enrolled_at: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          academic_year: number;
          total_amount?: number | null;
          paid_amount?: number | null;
          change_amount?: number | null;
          currency?: string | null;
          status?: string | null;
          enrolled_at?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          academic_year?: number;
          total_amount?: number | null;
          paid_amount?: number | null;
          change_amount?: number | null;
          currency?: string | null;
          status?: string | null;
          enrolled_at?: string | null;
        };
        Relationships: [];
      };
      grade_prices: {
        Row: {
          id: string;
          grade_id: string;
          monthly_amount: number | null;
          monthly_amount_usd: number | null;
          amount_nio: number | null;
          amount_usd: number | null;
          currency: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Insert: {
          id?: string;
          grade_id: string;
          monthly_amount?: number | null;
          monthly_amount_usd?: number | null;
          amount_nio?: number | null;
          amount_usd?: number | null;
          currency?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          grade_id?: string;
          monthly_amount?: number | null;
          monthly_amount_usd?: number | null;
          amount_nio?: number | null;
          amount_usd?: number | null;
          currency?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      grades: {
        Row: {
          id: string;
          name: string;
          sort_order: number | null;
          created_at?: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      guardians: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          created_at?: string | null;
        };
        Insert: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      other_payments: {
        Row: {
          id: string;
          student_id: string;
          item_id: string | null;
          item_name: string;
          amount: number;
          received_amount: number;
          change_amount: number;
          currency: string;
          status: string;
          payment_date: string;
          academic_year: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          item_id?: string | null;
          item_name: string;
          amount?: number;
          received_amount?: number;
          change_amount?: number;
          currency?: string;
          status?: string;
          payment_date?: string;
          academic_year: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          item_id?: string | null;
          item_name?: string;
          amount?: number;
          received_amount?: number;
          change_amount?: number;
          currency?: string;
          status?: string;
          payment_date?: string;
          academic_year?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      payment_items: {
        Row: {
          id: string;
          name: string;
          category: string;
          default_amount: number;
          currency: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: string;
          default_amount?: number;
          currency?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          default_amount?: number;
          currency?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          student_id: string;
          charge_id: string | null;
          concept: string;
          academic_year: number | null;
          month: number | null;
          amount: number | null;
          received_amount: number | null;
          change_amount: number | null;
          currency: string | null;
          method: string | null;
          paid_at: string | null;
          status: string | null;
          description: string | null;
          created_at?: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          charge_id?: string | null;
          concept: string;
          academic_year?: number | null;
          month?: number | null;
          amount?: number | null;
          received_amount?: number | null;
          change_amount?: number | null;
          currency?: string | null;
          method?: string | null;
          paid_at?: string | null;
          status?: string | null;
          description?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          charge_id?: string | null;
          concept?: string;
          academic_year?: number | null;
          month?: number | null;
          amount?: number | null;
          received_amount?: number | null;
          change_amount?: number | null;
          currency?: string | null;
          method?: string | null;
          paid_at?: string | null;
          status?: string | null;
          description?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      school_settings: {
        Row: {
          id: string;
          school_name: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          current_academic_year: number | null;
          enrollments_open: boolean | null;
          matricula_amount_nio: number | null;
          matricula_amount_usd: number | null;
          alertas_morosidad: boolean | null;
          recordatorios_pago: boolean | null;
          reportes_semanales: boolean | null;
          discount_siblings_enabled: boolean | null;
          discount_early_enabled: boolean | null;
          logo_url: string | null;
          alerts_morosidad: boolean | null;
          reminders_pago: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          school_name?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          current_academic_year?: number | null;
          enrollments_open?: boolean | null;
          matricula_amount_nio?: number | null;
          matricula_amount_usd?: number | null;
          alertas_morosidad?: boolean | null;
          recordatorios_pago?: boolean | null;
          reportes_semanales?: boolean | null;
          discount_siblings_enabled?: boolean | null;
          discount_early_enabled?: boolean | null;
          logo_url?: string | null;
          alerts_morosidad?: boolean | null;
          reminders_pago?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          school_name?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          current_academic_year?: number | null;
          enrollments_open?: boolean | null;
          matricula_amount_nio?: number | null;
          matricula_amount_usd?: number | null;
          alertas_morosidad?: boolean | null;
          recordatorios_pago?: boolean | null;
          reportes_semanales?: boolean | null;
          discount_siblings_enabled?: boolean | null;
          discount_early_enabled?: boolean | null;
          logo_url?: string | null;
          alerts_morosidad?: boolean | null;
          reminders_pago?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      sections: {
        Row: {
          id: string;
          name: string;
          grade_id: string;
          created_at?: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          grade_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          grade_id?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          full_name: string | null;
          guardian_id: string | null;
          grade_id: string | null;
          section_id: string | null;
          status: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          full_name?: string | null;
          guardian_id?: string | null;
          grade_id?: string | null;
          section_id?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          guardian_id?: string | null;
          grade_id?: string | null;
          section_id?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    ? (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;
