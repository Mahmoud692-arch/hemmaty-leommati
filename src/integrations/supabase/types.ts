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
      ai_assistant_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      article_comments: {
        Row: {
          article_slug: string
          content: string
          created_at: string
          id: string
          is_approved: boolean
          is_hidden: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          article_slug: string
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean
          is_hidden?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          article_slug?: string
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          is_hidden?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      article_likes: {
        Row: {
          article_slug: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          article_slug: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          article_slug?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      article_reads: {
        Row: {
          article_slug: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          article_slug: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          article_slug?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      article_saves: {
        Row: {
          article_slug: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          article_slug: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          article_slug?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          author: string | null
          category: string | null
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          read_minutes: number
          scheduled_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          content: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          read_minutes?: number
          scheduled_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          read_minutes?: number
          scheduled_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      hadith_favorites: {
        Row: {
          created_at: string
          hadith_number: number
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hadith_number: number
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hadith_number?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      hadith_reads: {
        Row: {
          hadith_number: number
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          hadith_number: number
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          hadith_number?: number
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hadiths: {
        Row: {
          arabic_text: string
          benefit: string | null
          category: string | null
          created_at: string
          explanation: string | null
          id: string
          is_published: boolean
          narrator: string | null
          number: number
          source: string | null
          updated_at: string
        }
        Insert: {
          arabic_text: string
          benefit?: string | null
          category?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          is_published?: boolean
          narrator?: string | null
          number: number
          source?: string | null
          updated_at?: string
        }
        Update: {
          arabic_text?: string
          benefit?: string | null
          category?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          is_published?: boolean
          narrator?: string | null
          number?: number
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_visible: boolean
          order_index: number
          section_type: string
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          order_index?: number
          section_type: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          order_index?: number
          section_type?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          articles_read: number
          avatar_url: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string
          hadiths_read: number
          id: string
          level: number
          phone: string | null
          quizzes_passed: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          articles_read?: number
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name: string
          hadiths_read?: number
          id?: string
          level?: number
          phone?: string | null
          quizzes_passed?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          articles_read?: number
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string
          hadiths_read?: number
          id?: string
          level?: number
          phone?: string | null
          quizzes_passed?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          attempt_id: string
          awarded_points: number | null
          essay_text: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          is_correct: boolean | null
          question_id: string
          selected_index: number | null
        }
        Insert: {
          attempt_id: string
          awarded_points?: number | null
          essay_text?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_index?: number | null
        }
        Update: {
          attempt_id?: string
          awarded_points?: number | null
          essay_text?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          id: string
          max_score: number | null
          needs_manual_grading: boolean
          quiz_id: string
          score: number | null
          started_at: string
          status: string
          submitted_at: string | null
          time_spent_seconds: number | null
          user_id: string
        }
        Insert: {
          id?: string
          max_score?: number | null
          needs_manual_grading?: boolean
          quiz_id: string
          score?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          time_spent_seconds?: number | null
          user_id: string
        }
        Update: {
          id?: string
          max_score?: number | null
          needs_manual_grading?: boolean
          quiz_id?: string
          score?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          time_spent_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_index: number | null
          created_at: string
          id: string
          options: Json | null
          order_index: number
          points: number
          question_image: string | null
          question_text: string
          question_type: string
          quiz_id: string
        }
        Insert: {
          correct_index?: number | null
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number
          points?: number
          question_image?: string | null
          question_text: string
          question_type?: string
          quiz_id: string
        }
        Update: {
          correct_index?: number | null
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number
          points?: number
          question_image?: string | null
          question_text?: string
          question_type?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          attempt_policy: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          ends_at: string | null
          id: string
          is_active: boolean
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attempt_policy?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attempt_policy?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string
          id: string
          is_published: boolean
          source: string | null
          text: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_published?: boolean
          source?: string | null
          text: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_published?: boolean
          source?: string | null
          text?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_key: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_key: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          created_at: string
          id: string
          is_anonymous: boolean
          is_published: boolean
          question: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean
          is_published?: boolean
          question: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean
          is_published?: boolean
          question?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      publish_due_articles: { Args: never; Returns: undefined }
      submit_quiz_attempt: {
        Args: { _attempt_id: string }
        Returns: {
          max_score: number
          needs_manual: boolean
          score: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "super_admin"
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
      app_role: ["admin", "moderator", "user", "super_admin"],
    },
  },
} as const
