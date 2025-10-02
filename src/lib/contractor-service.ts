import { supabase, supabaseAdmin, createAuthenticatedSupabaseClient } from './supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { 
  Contractor, 
  ContractorInsert, 
  ContractorUpdate,
  Project,
  ProjectInsert,
  ProjectMilestone,
  FinancialMilestone,
  Activity 
} from '@/types/supabase'

// Contractor CRUD operations
export class ContractorService {
  
  // Get contractor by email (for login)
  static async getContractorByEmail(email: string): Promise<Contractor | null> {
    const { data, error } = await supabaseAdmin
      .from('contractors')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      console.error('Error fetching contractor by email:', error)
      return null
    }
    
    return data
  }

  // Get contractor by Clerk user ID
  static async getContractorByClerkId(clerkUserId: string): Promise<Contractor | null> {
    const { data, error } = await supabaseAdmin
      .from('contractors')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (error) {
      console.error('Error fetching contractor by Clerk ID:', error)
      return null
    }
    
    return data
  }

  // Create new contractor (Clerk handles auth, service role handles DB)
  static async createContractor(contractorData: ContractorInsert): Promise<Contractor | null> {
    const { data, error } = await supabaseAdmin
      .from('contractors')
      .insert(contractorData)
      .select()
      .single()

    if (error) {
      console.error('Error creating contractor:', error)
      throw new Error(`Failed to create contractor: ${error.message}`)
    }

    return data
  }

  // Update contractor
  static async updateContractor(id: string, updates: ContractorUpdate): Promise<Contractor | null> {
    const { data, error } = await supabaseAdmin
      .from('contractors')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating contractor:', error)
      throw new Error(`Failed to update contractor: ${error.message}`)
    }

    return data
  }

  // Get contractor with full profile (projects, milestones, activities)
  static async getContractorProfile(contractorId: string) {
    try {
      // Get contractor basic info
      const { data: contractor, error: contractorError } = await supabase
        .from('contractors')
        .select('*')
        .eq('id', contractorId)
        .single()

      if (contractorError) throw contractorError

      // Get projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError

      // Get project milestones
      const { data: projectMilestones, error: milestonesError } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('due_date', { ascending: true })

      if (milestonesError) throw milestonesError

      // Get financial milestones
      const { data: financialMilestones, error: financialError } = await supabase
        .from('financial_milestones')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('due_date', { ascending: false })

      if (financialError) throw financialError

      // Get recent activities
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('contractor_id', contractorId)
        .order('activity_date', { ascending: false })
        .limit(50)

      if (activitiesError) throw activitiesError

      return {
        contractor,
        projects: projects || [],
        projectMilestones: projectMilestones || [],
        financialMilestones: financialMilestones || [],
        activities: activities || []
      }
    } catch (error) {
      console.error('Error fetching contractor profile:', error)
      throw error
    }
  }

  // Create project
  static async createProject(projectData: ProjectInsert): Promise<Project | null> {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert(projectData)
      .select()
      .single()

    if (error) {
      console.error('Error creating project:', error)
      throw new Error(`Failed to create project: ${error.message}`)
    }

    return data
  }

  // Update project progress
  static async updateProjectProgress(projectId: string, progress: number, status?: string) {
    const updates: any = { current_progress: progress }
    if (status) updates.status = status

    const { data, error } = await supabaseAdmin
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single()

    if (error) {
      console.error('Error updating project progress:', error)
      throw new Error(`Failed to update project progress: ${error.message}`)
    }

    return data
  }

  // Add activity (optional - skip if table doesn't exist)
  static async addActivity(activityData: {
    contractor_id: string
    project_id?: string
    type: string
    title: string
    description?: string
    amount?: number
    metadata?: Record<string, any>
  }) {
    try {
      const { data, error } = await supabaseAdmin
        .from('activities')
        .insert(activityData)
        .select()
        .single()

      if (error) {
        console.warn('Activity logging skipped (table not found):', error.message)
        return null
      }

      return data
    } catch (error) {
      console.warn('Activity logging failed, continuing without it:', error)
      return null
    }
  }

  // Import contractor from Google Sheets format (migration helper)
  static async importFromGoogleSheetsFormat(sheetsData: any): Promise<Contractor | null> {
    try {
      // Transform Google Sheets format to Supabase format
      const contractorData: ContractorInsert = {
        email: sheetsData.email || '',
        company_name: sheetsData.companyName || '',
        registration_number: sheetsData.registrationNumber || null,
        pan_number: sheetsData.panNumber || null,
        gstin: sheetsData.gstin || null,
        contact_person: sheetsData.contactPerson || '',
        phone: sheetsData.phone || '',
        years_in_business: sheetsData.yearsInBusiness || null,
        employee_count: sheetsData.employeeCount || null,
        annual_turnover: sheetsData.annualTurnover || null,
        business_category: sheetsData.businessCategory || null,
        specializations: Array.isArray(sheetsData.specializations) 
          ? sheetsData.specializations.join(', ') 
          : sheetsData.specializations || null,
        completed_projects: sheetsData.completedProjects || 0,
        success_rate: sheetsData.successRate || 0,
        average_project_value: sheetsData.averageProjectValue || 0,
        credit_score: sheetsData.creditScore || null,
        risk_rating: sheetsData.riskRating || 'Medium',
        bank_name: sheetsData.bankName || null,
        account_number: sheetsData.accountNumber || null,
        ifsc_code: sheetsData.ifscCode || null,
        capacity_utilization: sheetsData.capacityUtilization || 0,
        available_capacity: sheetsData.availableCapacity || 0,
        status: 'approved' // Assume existing contractors are approved
      }

      return await this.createContractor(contractorData)
    } catch (error) {
      console.error('Error importing contractor from Google Sheets:', error)
      throw error
    }
  }

  // Get all contractors (admin function)
  static async getAllContractors(): Promise<Contractor[]> {
    const { data, error } = await supabaseAdmin
      .from('contractors')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all contractors:', error)
      throw new Error(`Failed to fetch contractors: ${error.message}`)
    }

    return data || []
  }

  // Link Clerk user ID to existing contractor
  static async linkClerkUser(contractorId: string, clerkUserId: string): Promise<Contractor | null> {
    const { data, error } = await supabaseAdmin
      .from('contractors')
      .update({ clerk_user_id: clerkUserId })
      .eq('id', contractorId)
      .select()
      .single()

    if (error) {
      console.error('Error linking Clerk user:', error)
      throw new Error(`Failed to link Clerk user: ${error.message}`)
    }

    return data
  }
}