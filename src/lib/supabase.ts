import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key (first 20 chars):', supabaseAnonKey?.substring(0, 20));

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types based on our schema
export interface Database {
  public: {
    Tables: {
      contractors: {
        Row: {
          id: string
          company_name: string
          registration_number: string
          pan_number: string
          gstin: string
          contact_person: string
          email: string
          phone: string
          years_in_business: number
          employee_count: number
          annual_turnover: number
          business_category: string
          specializations: string[]
          completed_projects: number
          success_rate: number
          average_project_value: number
          credit_score: number
          risk_rating: 'Low' | 'Medium' | 'High'
          bank_name: string
          account_number: string
          ifsc_code: string
          documents: {
            panCard: boolean
            gstCertificate: boolean
            incorporationCertificate: boolean
            bankStatements: boolean
            financialStatements: boolean
          }
          capacity_utilization: number
          available_capacity: number
          next_available_date: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['contractors']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['contractors']['Insert']>
      }
      projects: {
        Row: {
          id: string
          contractor_id: string
          project_name: string
          client_name: string
          project_value: number
          start_date: string
          expected_end_date: string
          current_progress: number
          status: 'Planning' | 'Active' | 'On Hold' | 'Delayed' | 'Completing' | 'Completed'
          priority: 'High' | 'Medium' | 'Low'
          next_milestone: string
          next_milestone_date: string
          team_size: number
          monthly_burn_rate: number
          funding_required: number
          funding_status: string
          expected_irr: number
          project_tenure: number
          esg_compliance: string
          risk_level: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
      project_boqs: {
        Row: {
          id: string
          project_id: string
          contractor_id: string
          upload_date: string
          total_amount: number
          file_name: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['project_boqs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['project_boqs']['Insert']>
      }
      boq_items: {
        Row: {
          id: string
          boq_id: string
          description: string
          unit: string
          quantity_text: string
          quantity_numeric: number | null
          rate: number
          amount: number
          category: string | null
        }
        Insert: Omit<Database['public']['Tables']['boq_items']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['boq_items']['Insert']>
      }
      project_schedules: {
        Row: {
          id: string
          project_id: string
          contractor_id: string
          upload_date: string
          total_duration: number
          file_name: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['project_schedules']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['project_schedules']['Insert']>
      }
      schedule_tasks: {
        Row: {
          id: string
          schedule_id: string
          task: string
          start_date: string
          end_date: string
          duration: number
          progress: number
          responsible: string | null
          dependencies: string | null
        }
        Insert: Omit<Database['public']['Tables']['schedule_tasks']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['schedule_tasks']['Insert']>
      }
    }
  }
}