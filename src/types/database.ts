/**
 * Placeholder until Supabase MCP `generate_typescript_types` produces the real file
 * from the live schema. After F1 migrations are applied, regenerate this.
 */
export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: number;
          year_text: string | null;
          year_numeric: number | null;
          ruler_id: number | null;
          type_id: number;
          date_text: string | null;
          month: number | null;
          content_html: string;
          wiki_url: string | null;
          wiki_label: string | null;
          maps_url: string | null;
          maps_label: string | null;
          toulky_url: string | null;
          highlight: 'positive' | 'negative' | null;
          osobnost: string | null;
          poznamka: string | null;
          image_refs: Json;
          show_in_calendar: boolean;
          calendar_text: string | null;
          ordering: number;
          source_joomla_id: number | null;
          source_excel_row: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['events']['Row']> & {
          type_id: number;
        };
        Update: Partial<Database['public']['Tables']['events']['Row']>;
        Relationships: [];
      };
      event_types: {
        Row: {
          id: number;
          code: string;
          label: string;
          display_order: number;
        };
        Insert: Omit<Database['public']['Tables']['event_types']['Row'], 'id'> & { id?: number };
        Update: Partial<Database['public']['Tables']['event_types']['Row']>;
        Relationships: [];
      };
      rulers: {
        Row: {
          id: number;
          name: string;
          dynasty: string | null;
          year_from: number | null;
          year_to: number | null;
          display_order: number | null;
        };
        Insert: Omit<Database['public']['Tables']['rulers']['Row'], 'id'> & { id?: number };
        Update: Partial<Database['public']['Tables']['rulers']['Row']>;
        Relationships: [];
      };
      pages: {
        Row: {
          id: number;
          slug: string;
          title: string;
          subtitle: string | null;
          content_html: string;
          background: Json;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['pages']['Row'], 'id' | 'updated_at'> & {
          id?: number;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pages']['Row']>;
        Relationships: [];
      };
      page_blocks: {
        Row: {
          id: number;
          page_slug: string;
          kind: string;
          position: number;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['page_blocks']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['page_blocks']['Row']>;
        Relationships: [];
      };
      calendar_events: {
        Row: {
          id: number;
          day: number;
          month: number;
          year_text: string | null;
          title: string;
          description_html: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['calendar_events']['Row'], 'id' | 'created_at'> & {
          id?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['calendar_events']['Row']>;
        Relationships: [];
      };
      settings: {
        Row: { key: string; value: Json };
        Insert: { key: string; value: Json };
        Update: { key?: string; value?: Json };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          is_admin: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
        Relationships: [];
      };
      bibliography: {
        Row: {
          id: number;
          author: string;
          title: string;
          year: number | null;
          image_url: string | null;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          author: string;
          title: string;
          year?: number | null;
          image_url?: string | null;
          display_order?: number;
        };
        Update: Partial<Database['public']['Tables']['bibliography']['Row']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      append_bibliography_entry: {
        Args: {
          p_author: string;
          p_title: string;
          p_year: number | null;
          p_image_url: string | null;
        };
        Returns: number;
      };
      swap_bibliography_display_order: {
        Args: { first_id: number; second_id: number };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
  };
};
