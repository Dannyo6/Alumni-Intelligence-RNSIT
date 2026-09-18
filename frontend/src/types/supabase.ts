export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | string
          is_active: boolean
          full_name: string | null
          email: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          role?: 'admin' | string
          is_active?: boolean
          full_name?: string | null
          email?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          role?: 'admin' | string
          is_active?: boolean
          full_name?: string | null
          email?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      alumni: {
        Row: {
          id: string
          name: string
          name_normalized: string | null
          current_company: string | null
          current_company_normalized: string | null
          current_designation: string | null
          designation_normalized: string | null
          company_sector: string | null
          city: string | null
          city_normalized: string | null
          country: string | null
          country_code: string | null
          email: string | null
          alternate_emails: string[] | null
          email_normalized: string | null
          mobile: string | null
          mobile_normalized: string | null
          mobile_valid: boolean | null
          joining_year: number | null
          leaving_year: number | null
          branch_or_designation_raw: string | null
          academic_branch: string | null
          rnsit_role: string | null
          profile_link: string | null
          profile_link_normalized: string | null
          linkedin_url: string | null
          primary_category: string | null // GENERATED column
          is_high_value: boolean | null
          is_top_employer: boolean | null
          is_global: boolean | null
          is_student_or_rnsit: boolean | null
          needs_verification: boolean | null
          value_score: number | null
          status: string | null
          data_confidence: string | null
          notes: string | null
          source_workbook: string | null
          source_sheet: string | null
          last_import_job_id: string | null
          last_verified_at: string | null
          created_at: string | null
          updated_at: string | null
          search_vector: string | null
        }
        Insert: {
          id?: string
          name: string
          name_normalized?: string | null
          current_company?: string | null
          current_company_normalized?: string | null
          current_designation?: string | null
          designation_normalized?: string | null
          company_sector?: string | null
          city?: string | null
          city_normalized?: string | null
          country?: string | null
          country_code?: string | null
          email?: string | null
          alternate_emails?: string[] | null
          email_normalized?: string | null
          mobile?: string | null
          mobile_normalized?: string | null
          mobile_valid?: boolean | null
          joining_year?: number | null
          leaving_year?: number | null
          branch_or_designation_raw?: string | null
          academic_branch?: string | null
          rnsit_role?: string | null
          profile_link?: string | null
          profile_link_normalized?: string | null
          linkedin_url?: string | null
          // primary_category is omitted as it is a generated column
          is_high_value?: boolean | null
          is_top_employer?: boolean | null
          is_global?: boolean | null
          is_student_or_rnsit?: boolean | null
          needs_verification?: boolean | null
          value_score?: number | null
          status?: string | null
          data_confidence?: string | null
          notes?: string | null
          source_workbook?: string | null
          source_sheet?: string | null
          last_import_job_id?: string | null
          last_verified_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          search_vector?: string | null
        }
        Update: {
          id?: string
          name?: string
          name_normalized?: string | null
          current_company?: string | null
          current_company_normalized?: string | null
          current_designation?: string | null
          designation_normalized?: string | null
          company_sector?: string | null
          city?: string | null
          city_normalized?: string | null
          country?: string | null
          country_code?: string | null
          email?: string | null
          alternate_emails?: string[] | null
          email_normalized?: string | null
          mobile?: string | null
          mobile_normalized?: string | null
          mobile_valid?: boolean | null
          joining_year?: number | null
          leaving_year?: number | null
          branch_or_designation_raw?: string | null
          academic_branch?: string | null
          rnsit_role?: string | null
          profile_link?: string | null
          profile_link_normalized?: string | null
          linkedin_url?: string | null
          // primary_category is omitted as it is a generated column
          is_high_value?: boolean | null
          is_top_employer?: boolean | null
          is_global?: boolean | null
          is_student_or_rnsit?: boolean | null
          needs_verification?: boolean | null
          value_score?: number | null
          status?: string | null
          data_confidence?: string | null
          notes?: string | null
          source_workbook?: string | null
          source_sheet?: string | null
          last_import_job_id?: string | null
          last_verified_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          search_vector?: string | null
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          id: string
          file_name: string
          status: string
          total_rows: number | null
          processed_rows: number | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          file_name: string
          status?: string
          total_rows?: number | null
          processed_rows?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          file_name?: string
          status?: string
          total_rows?: number | null
          processed_rows?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      import_staging_rows: {
        Row: {
          id: string
          job_id: string
          row_number: number
          raw_data: Json | null
          status: string
          error_message: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          job_id: string
          row_number: number
          raw_data?: Json | null
          status?: string
          error_message?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          row_number?: number
          raw_data?: Json | null
          status?: string
          error_message?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      import_errors: {
        Row: {
          id: string
          job_id: string
          row_number: number | null
          field_name: string | null
          error_message: string
          created_at: string | null
        }
        Insert: {
          id?: string
          job_id: string
          row_number?: number | null
          field_name?: string | null
          error_message: string
          created_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          row_number?: number | null
          field_name?: string | null
          error_message?: string
          created_at?: string | null
        }
        Relationships: []
      }
      duplicate_candidates: {
        Row: {
          id: string
          job_id: string | null
          source_row_id: string | null
          matched_alumni_id: string | null
          confidence_score: number | null
          match_reasons: Json | null
          status: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          job_id?: string | null
          source_row_id?: string | null
          matched_alumni_id?: string | null
          confidence_score?: number | null
          match_reasons?: Json | null
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string | null
          source_row_id?: string | null
          matched_alumni_id?: string | null
          confidence_score?: number | null
          match_reasons?: Json | null
          status?: string | null
          created_at?: string | null
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
