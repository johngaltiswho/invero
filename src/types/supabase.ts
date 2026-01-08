export interface Database {
  public: {
    Tables: {
      contractors: {
        Row: {
          id: string
          clerk_user_id: string | null
          email: string
          
          // Company Information
          company_name: string
          registration_number: string | null
          pan_number: string | null
          gstin: string | null
          incorporation_date: string | null
          company_type: 'private-limited' | 'partnership' | 'proprietorship' | 'llp' | null
          business_address: string | null
          city: string | null
          state: string | null
          pincode: string | null
          
          // Contact Information
          contact_person: string
          designation: string | null
          phone: string
          alternate_phone: string | null
          
          // Business Profile
          years_in_business: number | null
          employee_count: number | null
          annual_turnover: number | null
          business_category: string | null
          specializations: string | null
          completed_projects: number
          success_rate: number
          average_project_value: number
          
          // Financial Information
          credit_score: number | null
          risk_rating: 'Low' | 'Medium' | 'High'
          bank_name: string | null
          account_number: string | null
          ifsc_code: string | null
          current_working_capital: number | null
          existing_loans: number
          
          // KYC Documents with verification status
          documents: {
            pan_card: {
              uploaded: boolean
              verified: boolean
              file_url: string | null
              file_name: string | null
              uploaded_at: string | null
              verified_at: string | null
              rejection_reason: string | null
            }
            gst_certificate: {
              uploaded: boolean
              verified: boolean
              file_url: string | null
              file_name: string | null
              uploaded_at: string | null
              verified_at: string | null
              rejection_reason: string | null
            }
            company_registration: {
              uploaded: boolean
              verified: boolean
              file_url: string | null
              file_name: string | null
              uploaded_at: string | null
              verified_at: string | null
              rejection_reason: string | null
            }
            cancelled_cheque: {
              uploaded: boolean
              verified: boolean
              file_url: string | null
              file_name: string | null
              uploaded_at: string | null
              verified_at: string | null
              rejection_reason: string | null
            }
          }
          
          // Capacity Management
          capacity_utilization: number
          available_capacity: number
          next_available_date: string | null
          
          // Status & Verification
          status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended'
          verification_status: 'documents_pending' | 'documents_uploaded' | 'under_verification' | 'verified' | 'rejected'
          application_date: string
          approved_date: string | null
          verified_by: string | null
          rejection_reason: string | null
          
          // Timestamps
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_user_id?: string | null
          email: string
          company_name: string
          registration_number?: string | null
          pan_number?: string | null
          gstin?: string | null
          incorporation_date?: string | null
          company_type?: 'private-limited' | 'partnership' | 'proprietorship' | 'llp' | null
          business_address?: string | null
          city?: string | null
          state?: string | null
          pincode?: string | null
          contact_person: string
          designation?: string | null
          phone: string
          alternate_phone?: string | null
          years_in_business?: number | null
          employee_count?: number | null
          annual_turnover?: number | null
          business_category?: string | null
          specializations?: string | null
          completed_projects?: number
          success_rate?: number
          average_project_value?: number
          credit_score?: number | null
          risk_rating?: 'Low' | 'Medium' | 'High'
          bank_name?: string | null
          account_number?: string | null
          ifsc_code?: string | null
          current_working_capital?: number | null
          existing_loans?: number
          documents?: Record<string, any>
          capacity_utilization?: number
          available_capacity?: number
          next_available_date?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'suspended'
          verification_status?: 'documents_pending' | 'documents_uploaded' | 'under_verification' | 'verified' | 'rejected'
          application_date?: string
          approved_date?: string | null
          verified_by?: string | null
          rejection_reason?: string | null
        }
        Update: {
          id?: string
          clerk_user_id?: string | null
          email?: string
          company_name?: string
          registration_number?: string | null
          pan_number?: string | null
          gstin?: string | null
          incorporation_date?: string | null
          company_type?: 'private-limited' | 'partnership' | 'proprietorship' | 'llp' | null
          business_address?: string | null
          city?: string | null
          state?: string | null
          pincode?: string | null
          contact_person?: string
          designation?: string | null
          phone?: string
          alternate_phone?: string | null
          years_in_business?: number | null
          employee_count?: number | null
          annual_turnover?: number | null
          business_category?: string | null
          specializations?: string | null
          completed_projects?: number
          success_rate?: number
          average_project_value?: number
          credit_score?: number | null
          risk_rating?: 'Low' | 'Medium' | 'High'
          bank_name?: string | null
          account_number?: string | null
          ifsc_code?: string | null
          current_working_capital?: number | null
          existing_loans?: number
          documents?: Record<string, any>
          capacity_utilization?: number
          available_capacity?: number
          next_available_date?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'suspended'
          verification_status?: 'documents_pending' | 'documents_uploaded' | 'under_verification' | 'verified' | 'rejected'
          application_date?: string
          approved_date?: string | null
          verified_by?: string | null
          rejection_reason?: string | null
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          contractor_id: string
          project_name: string
          project_id_external: string | null
          client_name: string
          project_value: number
          start_date: string | null
          expected_end_date: string | null
          actual_end_date: string | null
          current_progress: number
          status: 'Planning' | 'Active' | 'On Hold' | 'Delayed' | 'Completing' | 'Completed'
          priority: 'High' | 'Medium' | 'Low'
          next_milestone: string | null
          next_milestone_date: string | null
          team_size: number | null
          monthly_burn_rate: number | null
          funding_required: number | null
          funding_status: string
          expected_irr: number | null
          project_tenure: number | null
          esg_compliance: string | null
          risk_level: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contractor_id: string
          project_name: string
          project_id_external?: string | null
          client_name: string
          project_value: number
          start_date?: string | null
          expected_end_date?: string | null
          actual_end_date?: string | null
          current_progress?: number
          status?: 'Planning' | 'Active' | 'On Hold' | 'Delayed' | 'Completing' | 'Completed'
          priority?: 'High' | 'Medium' | 'Low'
          next_milestone?: string | null
          next_milestone_date?: string | null
          team_size?: number | null
          monthly_burn_rate?: number | null
          funding_required?: number | null
          funding_status?: string
          expected_irr?: number | null
          project_tenure?: number | null
          esg_compliance?: string | null
          risk_level?: string | null
        }
        Update: {
          id?: string
          contractor_id?: string
          project_name?: string
          project_id_external?: string | null
          client_name?: string
          project_value?: number
          start_date?: string | null
          expected_end_date?: string | null
          actual_end_date?: string | null
          current_progress?: number
          status?: 'Planning' | 'Active' | 'On Hold' | 'Delayed' | 'Completing' | 'Completed'
          priority?: 'High' | 'Medium' | 'Low'
          next_milestone?: string | null
          next_milestone_date?: string | null
          team_size?: number | null
          monthly_burn_rate?: number | null
          funding_required?: number | null
          funding_status?: string
          expected_irr?: number | null
          project_tenure?: number | null
          esg_compliance?: string | null
          risk_level?: string | null
          updated_at?: string
        }
      }
      project_milestones: {
        Row: {
          id: string
          project_id: string
          contractor_id: string
          milestone_name: string
          description: string | null
          due_date: string
          completion_date: string | null
          progress: number
          status: 'pending' | 'in_progress' | 'completed' | 'overdue'
          priority: 'high' | 'medium' | 'low'
          dependencies: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          contractor_id: string
          milestone_name: string
          description?: string | null
          due_date: string
          completion_date?: string | null
          progress?: number
          status?: 'pending' | 'in_progress' | 'completed' | 'overdue'
          priority?: 'high' | 'medium' | 'low'
          dependencies?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          contractor_id?: string
          milestone_name?: string
          description?: string | null
          due_date?: string
          completion_date?: string | null
          progress?: number
          status?: 'pending' | 'in_progress' | 'completed' | 'overdue'
          priority?: 'high' | 'medium' | 'low'
          dependencies?: string | null
          updated_at?: string
        }
      }
      financial_milestones: {
        Row: {
          id: string
          project_id: string
          contractor_id: string
          description: string
          amount: number
          category: string | null
          transaction_type: string
          due_date: string | null
          transaction_date: string | null
          status: 'pending' | 'processing' | 'completed' | 'cancelled'
          remarks: string | null
          reference_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          contractor_id: string
          description: string
          amount: number
          category?: string | null
          transaction_type: string
          due_date?: string | null
          transaction_date?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'cancelled'
          remarks?: string | null
          reference_number?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          contractor_id?: string
          description?: string
          amount?: number
          category?: string | null
          transaction_type?: string
          due_date?: string | null
          transaction_date?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'cancelled'
          remarks?: string | null
          reference_number?: string | null
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          contractor_id: string
          project_id: string | null
          type: string
          title: string
          description: string | null
          status: string
          metadata: Record<string, any>
          amount: number | null
          activity_date: string
          created_at: string
        }
        Insert: {
          id?: string
          contractor_id: string
          project_id?: string | null
          type: string
          title: string
          description?: string | null
          status?: string
          metadata?: Record<string, any>
          amount?: number | null
          activity_date?: string
        }
        Update: {
          id?: string
          contractor_id?: string
          project_id?: string | null
          type?: string
          title?: string
          description?: string | null
          status?: string
          metadata?: Record<string, any>
          amount?: number | null
          activity_date?: string
        }
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
        Insert: {
          id?: string
          project_id: string
          contractor_id: string
          upload_date?: string
          total_amount: number
          file_name: string
        }
        Update: {
          id?: string
          project_id?: string
          contractor_id?: string
          upload_date?: string
          total_amount?: number
          file_name?: string
        }
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
        Insert: {
          id?: string
          boq_id: string
          description: string
          unit: string
          quantity_text: string
          quantity_numeric?: number | null
          rate: number
          amount: number
          category?: string | null
        }
        Update: {
          id?: string
          boq_id?: string
          description?: string
          unit?: string
          quantity_text?: string
          quantity_numeric?: number | null
          rate?: number
          amount?: number
          category?: string | null
        }
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
        Insert: {
          id?: string
          project_id: string
          contractor_id: string
          upload_date?: string
          total_duration: number
          file_name: string
        }
        Update: {
          id?: string
          project_id?: string
          contractor_id?: string
          upload_date?: string
          total_duration?: number
          file_name?: string
        }
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
        Insert: {
          id?: string
          schedule_id: string
          task: string
          start_date: string
          end_date: string
          duration: number
          progress?: number
          responsible?: string | null
          dependencies?: string | null
        }
        Update: {
          id?: string
          schedule_id?: string
          task?: string
          start_date?: string
          end_date?: string
          duration?: number
          progress?: number
          responsible?: string | null
          dependencies?: string | null
        }
      }
      contacts: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          company: string | null
          subject: string
          message: string
          consent: boolean
          status: 'new' | 'in_progress' | 'resolved' | 'closed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email: string
          company?: string | null
          subject: string
          message: string
          consent?: boolean
          status?: 'new' | 'in_progress' | 'resolved' | 'closed'
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string
          company?: string | null
          subject?: string
          message?: string
          consent?: boolean
          status?: 'new' | 'in_progress' | 'resolved' | 'closed'
          updated_at?: string
        }
      }
    }
  }
}

// Convenience types
export type Contractor = Database['public']['Tables']['contractors']['Row']
export type ContractorInsert = Database['public']['Tables']['contractors']['Insert']
export type ContractorUpdate = Database['public']['Tables']['contractors']['Update']

export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export type ProjectMilestone = Database['public']['Tables']['project_milestones']['Row']
export type ProjectMilestoneInsert = Database['public']['Tables']['project_milestones']['Insert']
export type ProjectMilestoneUpdate = Database['public']['Tables']['project_milestones']['Update']

export type FinancialMilestone = Database['public']['Tables']['financial_milestones']['Row']
export type FinancialMilestoneInsert = Database['public']['Tables']['financial_milestones']['Insert']
export type FinancialMilestoneUpdate = Database['public']['Tables']['financial_milestones']['Update']

export type Activity = Database['public']['Tables']['activities']['Row']
export type ActivityInsert = Database['public']['Tables']['activities']['Insert']
export type ActivityUpdate = Database['public']['Tables']['activities']['Update']