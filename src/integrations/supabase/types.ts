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
      achievement_rules: {
        Row: {
          conditions: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          reward: Json
          trigger_event: string
        }
        Insert: {
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          reward?: Json
          trigger_event: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          reward?: Json
          trigger_event?: string
        }
        Relationships: []
      }
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
      article_audio: {
        Row: {
          article_slug: string
          audio_url: string
          generated_at: string
          id: string
          voice: string | null
        }
        Insert: {
          article_slug: string
          audio_url: string
          generated_at?: string
          id?: string
          voice?: string | null
        }
        Update: {
          article_slug?: string
          audio_url?: string
          generated_at?: string
          id?: string
          voice?: string | null
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
      article_favorites: {
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
      article_read_progress: {
        Row: {
          article_slug: string
          id: string
          points_awarded: boolean
          scroll_percent: number
          seconds_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          article_slug: string
          id?: string
          points_awarded?: boolean
          scroll_percent?: number
          seconds_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          article_slug?: string
          id?: string
          points_awarded?: boolean
          scroll_percent?: number
          seconds_spent?: number
          updated_at?: string
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
      automation_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          trigger_event: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          trigger_event: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          trigger_event?: string
        }
        Relationships: []
      }
      avatar_change_log: {
        Row: {
          changed_at: string
          id: string
          new_url: string | null
          old_url: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_url?: string | null
          old_url?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_url?: string | null
          old_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          content: string | null
          cover_image: string | null
          created_at: string
          id: string
          is_published: boolean
          meta_description: string | null
          meta_keywords: string | null
          order_index: number
          parent_id: string | null
          show_in_nav: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          cover_image?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_keywords?: string | null
          order_index?: number
          parent_id?: string | null
          show_in_nav?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          cover_image?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_keywords?: string | null
          order_index?: number
          parent_id?: string | null
          show_in_nav?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_pages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_content: {
        Row: {
          body: Json
          content_type: string
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          published_at: string | null
          scheduled_at: string | null
          slug: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: Json
          content_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          published_at?: string | null
          scheduled_at?: string | null
          slug?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: Json
          content_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          published_at?: string | null
          scheduled_at?: string | null
          slug?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      entity_tags: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          taxonomy_item_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          taxonomy_item_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          taxonomy_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_tags_taxonomy_item_id_fkey"
            columns: ["taxonomy_item_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_items"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string
          data: Json
          form_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          form_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          form_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "interactive_forms"
            referencedColumns: ["id"]
          },
        ]
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
      homepage_ads: {
        Row: {
          body: string | null
          created_at: string
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          order_index: number
          position: string
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          order_index?: number
          position?: string
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          order_index?: number
          position?: string
          starts_at?: string | null
          title?: string
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
      interactive_forms: {
        Row: {
          created_at: string
          description: string | null
          fields: Json
          form_type: string
          id: string
          is_published: boolean
          settings: Json
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fields?: Json
          form_type?: string
          id?: string
          is_published?: boolean
          settings?: Json
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fields?: Json
          form_type?: string
          id?: string
          is_published?: boolean
          settings?: Json
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      last_visits: {
        Row: {
          entity_id: string
          entity_type: string
          id: string
          position_sec: number | null
          scroll_percent: number | null
          title: string | null
          user_id: string
          visited_at: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          id?: string
          position_sec?: number | null
          scroll_percent?: number | null
          title?: string | null
          user_id: string
          visited_at?: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          id?: string
          position_sec?: number | null
          scroll_percent?: number | null
          title?: string | null
          user_id?: string
          visited_at?: string
        }
        Relationships: []
      }
      lesson_favorites: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_favorites_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          id: string
          last_position_sec: number
          lesson_id: string
          seconds_watched: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          id?: string
          last_position_sec?: number
          lesson_id: string
          seconds_watched?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          id?: string
          last_position_sec?: number
          lesson_id?: string
          seconds_watched?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          category: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          instructor: string | null
          is_featured: boolean
          order_index: number
          series: string | null
          slug: string
          source_type: string
          status: string
          thumbnail: string | null
          title: string
          updated_at: string
          video_url: string | null
          youtube_url: string | null
        }
        Insert: {
          category?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          instructor?: string | null
          is_featured?: boolean
          order_index?: number
          series?: string | null
          slug: string
          source_type?: string
          status?: string
          thumbnail?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          category?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          instructor?: string | null
          is_featured?: boolean
          order_index?: number
          series?: string | null
          slug?: string
          source_type?: string
          status?: string
          thumbnail?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          youtube_url?: string | null
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
      points_adjustments: {
        Row: {
          created_at: string
          created_by: string
          delta: number
          id: string
          notification_message: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          delta: number
          id?: string
          notification_message?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          delta?: number
          id?: string
          notification_message?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          articles_read: number
          avatar_changed_at: string | null
          avatar_url: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string
          hadiths_read: number
          id: string
          last_seen_at: string | null
          level: number
          phone: string | null
          quizzes_passed: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          articles_read?: number
          avatar_changed_at?: string | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name: string
          hadiths_read?: number
          id?: string
          last_seen_at?: string | null
          level?: number
          phone?: string | null
          quizzes_passed?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          articles_read?: number
          avatar_changed_at?: string | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string
          hadiths_read?: number
          id?: string
          last_seen_at?: string | null
          level?: number
          phone?: string | null
          quizzes_passed?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      program_enrollments: {
        Row: {
          completed_at: string | null
          id: string
          program_id: string
          progress: Json
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          program_id: string
          progress?: Json
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          program_id?: string
          progress?: Json
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_steps: {
        Row: {
          body: Json
          created_at: string
          id: string
          order_index: number
          program_id: string
          required: boolean
          title: string
        }
        Insert: {
          body?: Json
          created_at?: string
          id?: string
          order_index?: number
          program_id: string
          required?: boolean
          title: string
        }
        Update: {
          body?: Json
          created_at?: string
          id?: string
          order_index?: number
          program_id?: string
          required?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_steps_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          config: Json
          cover_image: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          program_type: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          config?: Json
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          program_type?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          config?: Json
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          program_type?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      prophet_stories: {
        Row: {
          content: string | null
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          order_index: number
          prophet_name: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          order_index?: number
          prophet_name?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          order_index?: number
          prophet_name?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      public_site_settings: {
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
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions_safe"
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
      quran_bookmarks: {
        Row: {
          ayah_number: number | null
          created_at: string
          id: string
          note: string | null
          surah_number: number
          user_id: string
        }
        Insert: {
          ayah_number?: number | null
          created_at?: string
          id?: string
          note?: string | null
          surah_number: number
          user_id: string
        }
        Update: {
          ayah_number?: number | null
          created_at?: string
          id?: string
          note?: string | null
          surah_number?: number
          user_id?: string
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
      taxonomies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      taxonomy_items: {
        Row: {
          id: string
          name: string
          order_index: number
          parent_id: string | null
          slug: string
          taxonomy_id: string
        }
        Insert: {
          id?: string
          name: string
          order_index?: number
          parent_id?: string | null
          slug: string
          taxonomy_id: string
        }
        Update: {
          id?: string
          name?: string
          order_index?: number
          parent_id?: string | null
          slug?: string
          taxonomy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomy_items_taxonomy_id_fkey"
            columns: ["taxonomy_id"]
            isOneToOne: false
            referencedRelation: "taxonomies"
            referencedColumns: ["id"]
          },
        ]
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
      article_likes_count: {
        Row: {
          article_slug: string | null
          likes_count: number | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          articles_read: number | null
          avatar_url: string | null
          country: string | null
          created_at: string | null
          full_name: string | null
          hadiths_read: number | null
          id: string | null
          level: number | null
          quizzes_passed: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          articles_read?: number | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          hadiths_read?: number | null
          id?: string | null
          level?: number | null
          quizzes_passed?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          articles_read?: number | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          hadiths_read?: number | null
          id?: string | null
          level?: number | null
          quizzes_passed?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      quiz_questions_safe: {
        Row: {
          created_at: string | null
          id: string | null
          options: Json | null
          order_index: number | null
          points: number | null
          question_image: string | null
          question_text: string | null
          question_type: string | null
          quiz_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question_image?: string | null
          question_text?: string | null
          question_type?: string | null
          quiz_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question_image?: string | null
          question_text?: string | null
          question_type?: string | null
          quiz_id?: string | null
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
      user_questions_public: {
        Row: {
          answer: string | null
          answered_at: string | null
          created_at: string | null
          id: string | null
          is_anonymous: boolean | null
          is_published: boolean | null
          question: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          is_published?: boolean | null
          question?: string | null
          updated_at?: string | null
          user_id?: never
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string | null
          id?: string | null
          is_anonymous?: boolean | null
          is_published?: boolean | null
          question?: string | null
          updated_at?: string | null
          user_id?: never
        }
        Relationships: []
      }
    }
    Functions: {
      admin_adjust_points: {
        Args: {
          _delta: number
          _notify?: string
          _reason: string
          _user_id: string
        }
        Returns: boolean
      }
      admin_article_performance: {
        Args: { _article_slug?: string }
        Returns: Json
      }
      admin_assign_program: {
        Args: { _program_id: string; _user_ids: string[] }
        Returns: number
      }
      admin_assign_tag: {
        Args: {
          _entity_id: string
          _entity_type: string
          _taxonomy_item_id: string
        }
        Returns: string
      }
      admin_broadcast_notification: {
        Args: { _link?: string; _message: string; _title: string }
        Returns: number
      }
      admin_create_article: { Args: { _payload: Json }; Returns: string }
      admin_create_hadith: { Args: { _payload: Json }; Returns: string }
      admin_create_quiz_with_questions: {
        Args: { _payload: Json }
        Returns: string
      }
      admin_delete_article: { Args: { _article_id: string }; Returns: boolean }
      admin_delete_dynamic_content: { Args: { _id: string }; Returns: boolean }
      admin_delete_hadith: { Args: { _hadith_id: string }; Returns: boolean }
      admin_delete_page: { Args: { _page_id: string }; Returns: boolean }
      admin_delete_quiz: { Args: { _quiz_id: string }; Returns: boolean }
      admin_engagement_metrics: { Args: { _days?: number }; Returns: Json }
      admin_get_user_info: { Args: { _user_id: string }; Returns: Json }
      admin_list_hadiths: {
        Args: {
          _category?: string
          _hadith_id?: string
          _has_benefit?: boolean
          _has_explanation?: boolean
          _limit?: number
          _offset?: number
          _source?: string
        }
        Returns: Json
      }
      admin_moderate_comment: {
        Args: { _action: string; _comment_id: string }
        Returns: boolean
      }
      admin_preview_changes: {
        Args: { _entity_id: string; _entity_type: string }
        Returns: Json
      }
      admin_quiz_performance: { Args: { _quiz_id?: string }; Returns: Json }
      admin_respond_to_question: {
        Args: { _answer_text: string; _publish?: boolean; _question_id: string }
        Returns: string
      }
      admin_run_rls_smoke_tests: { Args: never; Returns: Json }
      admin_schedule_content: {
        Args: { _content_id: string; _publish_at: string; _type: string }
        Returns: boolean
      }
      admin_set_site_setting: {
        Args: { _key: string; _value: Json }
        Returns: boolean
      }
      admin_update_article: {
        Args: { _article_id: string; _payload: Json }
        Returns: string
      }
      admin_update_hadith: {
        Args: { _hadith_id: string; _payload: Json }
        Returns: string
      }
      admin_update_quiz: {
        Args: { _payload: Json; _quiz_id: string }
        Returns: string
      }
      admin_upsert_achievement_rule: {
        Args: { _payload: Json }
        Returns: string
      }
      admin_upsert_ad: { Args: { _payload: Json }; Returns: string }
      admin_upsert_automation: { Args: { _payload: Json }; Returns: string }
      admin_upsert_dynamic_content: {
        Args: { _payload: Json }
        Returns: string
      }
      admin_upsert_form: { Args: { _payload: Json }; Returns: string }
      admin_upsert_page: { Args: { _payload: Json }; Returns: string }
      admin_upsert_program: { Args: { _payload: Json }; Returns: string }
      admin_upsert_taxonomy: { Args: { _payload: Json }; Returns: string }
      award_badge: {
        Args: { _badge_key: string; _user_id: string }
        Returns: boolean
      }
      award_reading_points: {
        Args: {
          _article_slug: string
          _scroll_percent: number
          _seconds_spent: number
        }
        Returns: Json
      }
      change_avatar: { Args: { _new_url: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_email_confirmed: { Args: { _user_id: string }; Returns: boolean }
      leaderboard: {
        Args: { _period?: string }
        Returns: {
          avatar_url: string
          full_name: string
          points: number
          rank: number
          user_id: string
        }[]
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
      touch_last_seen: { Args: never; Returns: undefined }
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
