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
          gst_manual_verified: boolean
          gst_manual_verified_at: string | null
          gst_manual_verified_by: string | null
          gst_manual_verification_notes: string | null
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
          platform_fee_rate: number | null
          platform_fee_cap: number | null
          participation_fee_rate_daily: number | null
          
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
          onboarding_stage:
            | 'application_submitted'
            | 'documents_pending'
            | 'documents_uploaded'
            | 'kyc_under_review'
            | 'kyc_approved'
            | 'commercial_review'
            | 'commercial_approved'
            | 'master_agreement_pending'
            | 'master_agreement_issued'
            | 'master_agreement_executed'
            | 'active'
            | 'financing_pending'
            | 'financing_issued'
            | 'financing_executed'
            | 'suspended'
            | 'rejected'
            | null
          portal_active: boolean
          procurement_enabled: boolean
          financing_enabled: boolean
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
          gst_manual_verified?: boolean
          gst_manual_verified_at?: string | null
          gst_manual_verified_by?: string | null
          gst_manual_verification_notes?: string | null
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
          platform_fee_rate?: number | null
          platform_fee_cap?: number | null
          participation_fee_rate_daily?: number | null
          documents?: Record<string, any>
          capacity_utilization?: number
          available_capacity?: number
          next_available_date?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'suspended'
          verification_status?: 'documents_pending' | 'documents_uploaded' | 'under_verification' | 'verified' | 'rejected'
          onboarding_stage?:
            | 'application_submitted'
            | 'documents_pending'
            | 'documents_uploaded'
            | 'kyc_under_review'
            | 'kyc_approved'
            | 'commercial_review'
            | 'commercial_approved'
            | 'master_agreement_pending'
            | 'master_agreement_issued'
            | 'master_agreement_executed'
            | 'active'
            | 'financing_pending'
            | 'financing_issued'
            | 'financing_executed'
            | 'suspended'
            | 'rejected'
            | null
          portal_active?: boolean
          procurement_enabled?: boolean
          financing_enabled?: boolean
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
          gst_manual_verified?: boolean
          gst_manual_verified_at?: string | null
          gst_manual_verified_by?: string | null
          gst_manual_verification_notes?: string | null
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
          platform_fee_rate?: number | null
          platform_fee_cap?: number | null
          participation_fee_rate_daily?: number | null
          documents?: Record<string, any>
          capacity_utilization?: number
          available_capacity?: number
          next_available_date?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'suspended'
          verification_status?: 'documents_pending' | 'documents_uploaded' | 'under_verification' | 'verified' | 'rejected'
          onboarding_stage?:
            | 'application_submitted'
            | 'documents_pending'
            | 'documents_uploaded'
            | 'kyc_under_review'
            | 'kyc_approved'
            | 'commercial_review'
            | 'commercial_approved'
            | 'master_agreement_pending'
            | 'master_agreement_issued'
            | 'master_agreement_executed'
            | 'active'
            | 'financing_pending'
            | 'financing_issued'
            | 'financing_executed'
            | 'suspended'
            | 'rejected'
            | null
          portal_active?: boolean
          procurement_enabled?: boolean
          financing_enabled?: boolean
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
          line_order: number | null
          measurement_input_unit: string | null
          measurement_conversion_factor: number | null
          notes: string | null
          updated_at: string | null
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
          line_order?: number | null
          measurement_input_unit?: string | null
          measurement_conversion_factor?: number | null
          notes?: string | null
          updated_at?: string | null
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
          line_order?: number | null
          measurement_input_unit?: string | null
          measurement_conversion_factor?: number | null
          notes?: string | null
          updated_at?: string | null
        }
      }
      boq_measurement_rows: {
        Row: {
          id: string
          project_id: string
          contractor_id: string
          boq_item_id: string
          measurement_date: string
          location_description: string | null
          remarks: string | null
          measurement_mode: 'direct_qty' | 'nos_x_l' | 'nos_x_l_x_b' | 'nos_x_l_x_b_x_h'
          nos: number | null
          length: number | null
          breadth: number | null
          height: number | null
          direct_qty: number | null
          computed_qty: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          contractor_id: string
          boq_item_id: string
          measurement_date?: string
          location_description?: string | null
          remarks?: string | null
          measurement_mode: 'direct_qty' | 'nos_x_l' | 'nos_x_l_x_b' | 'nos_x_l_x_b_x_h'
          nos?: number | null
          length?: number | null
          breadth?: number | null
          height?: number | null
          direct_qty?: number | null
          computed_qty?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          contractor_id?: string
          boq_item_id?: string
          measurement_date?: string
          location_description?: string | null
          remarks?: string | null
          measurement_mode?: 'direct_qty' | 'nos_x_l' | 'nos_x_l_x_b' | 'nos_x_l_x_b_x_h'
          nos?: number | null
          length?: number | null
          breadth?: number | null
          height?: number | null
          direct_qty?: number | null
          computed_qty?: number
          created_at?: string
          updated_at?: string
        }
      }
      boq_linked_workbooks: {
        Row: {
          id: string
          project_id: string
          contractor_id: string
          provider: 'microsoft' | 'google'
          original_file_path: string
          original_file_name: string
          original_content_type: string | null
          provider_file_id: string | null
          provider_drive_id: string | null
          provider_site_id: string | null
          provider_web_url: string | null
          status: 'source_uploaded' | 'linked' | 'link_failed' | 'syncing' | 'synced' | 'sync_failed'
          active: boolean
          last_synced_at: string | null
          last_sync_status: 'success' | 'failed' | null
          last_sync_error: string | null
          last_synced_boq_id: string | null
          metadata: Record<string, any> | null
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          contractor_id: string
          provider?: 'microsoft' | 'google'
          original_file_path: string
          original_file_name: string
          original_content_type?: string | null
          provider_file_id?: string | null
          provider_drive_id?: string | null
          provider_site_id?: string | null
          provider_web_url?: string | null
          status?: 'source_uploaded' | 'linked' | 'link_failed' | 'syncing' | 'synced' | 'sync_failed'
          active?: boolean
          last_synced_at?: string | null
          last_sync_status?: 'success' | 'failed' | null
          last_sync_error?: string | null
          last_synced_boq_id?: string | null
          metadata?: Record<string, any> | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          contractor_id?: string
          provider?: 'microsoft' | 'google'
          original_file_path?: string
          original_file_name?: string
          original_content_type?: string | null
          provider_file_id?: string | null
          provider_drive_id?: string | null
          provider_site_id?: string | null
          provider_web_url?: string | null
          status?: 'source_uploaded' | 'linked' | 'link_failed' | 'syncing' | 'synced' | 'sync_failed'
          active?: boolean
          last_synced_at?: string | null
          last_sync_status?: 'success' | 'failed' | null
          last_sync_error?: string | null
          last_synced_boq_id?: string | null
          metadata?: Record<string, any> | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
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
      vehicles: {
        Row: {
          id: string
          contractor_id: string
          vehicle_number: string
          vehicle_type: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contractor_id: string
          vehicle_number: string
          vehicle_type: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contractor_id?: string
          vehicle_number?: string
          vehicle_type?: string
          is_active?: boolean
          updated_at?: string
        }
      }
      fuel_expenses: {
        Row: {
          id: string
          contractor_id: string
          vehicle_id: string
          bill_image_url: string
          bill_number: string | null
          bill_date: string | null
          pump_name: string | null
          fuel_type: 'Petrol' | 'Diesel' | null
          quantity_liters: number | null
          rate_per_liter: number | null
          total_amount: number | null
          ocr_raw_response: any | null
          status: 'submitted' | 'ocr_processing' | 'pending_review' | 'approved' | 'rejected' | 'ocr_failed'
          admin_notes: string | null
          approved_by: string | null
          approved_at: string | null
          rejected_reason: string | null
          submitted_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contractor_id: string
          vehicle_id: string
          bill_image_url: string
          bill_number?: string | null
          bill_date?: string | null
          pump_name?: string | null
          fuel_type?: 'Petrol' | 'Diesel' | null
          quantity_liters?: number | null
          rate_per_liter?: number | null
          total_amount?: number | null
          ocr_raw_response?: any | null
          status?: 'submitted' | 'ocr_processing' | 'pending_review' | 'approved' | 'rejected' | 'ocr_failed'
          admin_notes?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejected_reason?: string | null
          submitted_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contractor_id?: string
          vehicle_id?: string
          bill_image_url?: string
          bill_number?: string | null
          bill_date?: string | null
          pump_name?: string | null
          fuel_type?: 'Petrol' | 'Diesel' | null
          quantity_liters?: number | null
          rate_per_liter?: number | null
          total_amount?: number | null
          ocr_raw_response?: any | null
          status?: 'submitted' | 'ocr_processing' | 'pending_review' | 'approved' | 'rejected' | 'ocr_failed'
          admin_notes?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejected_reason?: string | null
          updated_at?: string
        }
      }
      fuel_pumps: {
        Row: {
          id: string
          pump_name: string
          oem_name: string | null
          address: string | null
          city: string | null
          state: string | null
          pincode: string | null
          contact_person: string | null
          contact_phone: string | null
          contact_email: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pump_name: string
          oem_name?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          pincode?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pump_name?: string
          oem_name?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          pincode?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      contractor_fuel_settings: {
        Row: {
          id: string
          contractor_id: string
          monthly_fuel_budget: number
          per_request_max_amount: number
          per_request_max_liters: number
          max_fills_per_vehicle_per_day: number
          min_hours_between_fills: number
          auto_approve_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contractor_id: string
          monthly_fuel_budget?: number
          per_request_max_amount?: number
          per_request_max_liters?: number
          max_fills_per_vehicle_per_day?: number
          min_hours_between_fills?: number
          auto_approve_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contractor_id?: string
          monthly_fuel_budget?: number
          per_request_max_amount?: number
          per_request_max_liters?: number
          max_fills_per_vehicle_per_day?: number
          min_hours_between_fills?: number
          auto_approve_enabled?: boolean
          updated_at?: string
        }
      }
      contractor_approved_pumps: {
        Row: {
          id: string
          contractor_id: string
          pump_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contractor_id: string
          pump_id: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contractor_id?: string
          pump_id?: string
          is_active?: boolean
          updated_at?: string
        }
      }
      fuel_approvals: {
        Row: {
          id: string
          approval_code: string
          vehicle_id: string
          contractor_id: string
          pump_id: string
          max_amount: number
          max_liters: number
          valid_from: string
          valid_until: string
          status: 'pending' | 'filled' | 'expired' | 'cancelled'
          request_type: string
          auto_approved: boolean
          requested_notes: string | null
          filled_at: string | null
          filled_quantity: number | null
          filled_amount: number | null
          pump_notes: string | null
          approved_by: string | null
          approved_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          approval_code?: string
          vehicle_id: string
          contractor_id: string
          pump_id: string
          max_amount: number
          max_liters: number
          valid_from?: string
          valid_until: string
          status?: 'pending' | 'filled' | 'expired' | 'cancelled'
          request_type?: string
          auto_approved?: boolean
          requested_notes?: string | null
          filled_at?: string | null
          filled_quantity?: number | null
          filled_amount?: number | null
          pump_notes?: string | null
          approved_by?: string | null
          approved_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          approval_code?: string
          vehicle_id?: string
          contractor_id?: string
          pump_id?: string
          max_amount?: number
          max_liters?: number
          valid_from?: string
          valid_until?: string
          status?: 'pending' | 'filled' | 'expired' | 'cancelled'
          request_type?: string
          auto_approved?: boolean
          requested_notes?: string | null
          filled_at?: string | null
          filled_quantity?: number | null
          filled_amount?: number | null
          pump_notes?: string | null
          approved_by?: string | null
          approved_at?: string
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

export type Vehicle = Database['public']['Tables']['vehicles']['Row']
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert']
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update']

export type FuelExpense = Database['public']['Tables']['fuel_expenses']['Row']
export type FuelExpenseInsert = Database['public']['Tables']['fuel_expenses']['Insert']
export type FuelExpenseUpdate = Database['public']['Tables']['fuel_expenses']['Update']

export type FuelExpenseStatus = 'submitted' | 'ocr_processing' | 'pending_review' | 'approved' | 'rejected' | 'ocr_failed'

// Fuel expense with relations for admin review
export interface FuelExpenseWithRelations extends FuelExpense {
  vehicle: Vehicle
  contractor: {
    id: string
    company_name: string
    contact_person: string
  }
}

// Fuel auto-approval system types
export type FuelPump = Database['public']['Tables']['fuel_pumps']['Row']
export type FuelPumpInsert = Database['public']['Tables']['fuel_pumps']['Insert']
export type FuelPumpUpdate = Database['public']['Tables']['fuel_pumps']['Update']

export type ContractorFuelSettings = Database['public']['Tables']['contractor_fuel_settings']['Row']
export type ContractorFuelSettingsInsert = Database['public']['Tables']['contractor_fuel_settings']['Insert']
export type ContractorFuelSettingsUpdate = Database['public']['Tables']['contractor_fuel_settings']['Update']

export type ContractorApprovedPump = Database['public']['Tables']['contractor_approved_pumps']['Row']
export type ContractorApprovedPumpInsert = Database['public']['Tables']['contractor_approved_pumps']['Insert']
export type ContractorApprovedPumpUpdate = Database['public']['Tables']['contractor_approved_pumps']['Update']

export type FuelApproval = Database['public']['Tables']['fuel_approvals']['Row']
export type FuelApprovalInsert = Database['public']['Tables']['fuel_approvals']['Insert']
export type FuelApprovalUpdate = Database['public']['Tables']['fuel_approvals']['Update']

export type ApprovalStatus = 'pending' | 'filled' | 'expired' | 'cancelled'

// Fuel approval with relations
export interface FuelApprovalWithRelations extends FuelApproval {
  vehicle: Vehicle
  pump: FuelPump
  contractor: {
    id: string
    company_name: string
    contact_person: string
  }
}
