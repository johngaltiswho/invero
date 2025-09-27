import { createClient } from '@supabase/supabase-js';
import { getBOQByProjectId, getScheduleByProjectId } from './supabase-boq';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ProjectMetrics {
  projectValue?: number;
  currentProgress?: number;
  endDate?: string;
}

/**
 * Calculate and update project metrics from BOQ, Schedule, and fallback to Google Sheets values
 * This runs in the background to keep project data up-to-date
 */
export async function calculateProjectMetrics(projectId: string): Promise<ProjectMetrics> {
  try {
    console.log(`📊 Calculating metrics for project: ${projectId}`);
    
    // Note: Projects table doesn't exist in Supabase yet, so we'll only calculate from BOQ/Schedule
    // When projects table is created, uncomment the code below for fallback values
    /*
    const { data: currentProject, error: projectError } = await supabase
      .from('projects')
      .select('project_value, current_progress, expected_end_date')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('Error fetching current project:', projectError);
      return {};
    }
    */

    const metrics: ProjectMetrics = {};

    // 1. Calculate Project Value from BOQ
    try {
      const boqData = await getBOQByProjectId(projectId);
      if (boqData && boqData.length > 0) {
        // Use latest BOQ total amount
        const latestBOQ = boqData[0]; // Assuming sorted by latest
        metrics.projectValue = latestBOQ.total_amount;
        console.log(`💰 Project value from BOQ: ${metrics.projectValue}`);
      } else {
        console.log(`💰 No BOQ data found for project ${projectId}`);
      }
    } catch (error) {
      console.log('No BOQ data available');
    }

    // 2. Calculate Current Progress from Schedule
    try {
      const scheduleData = await getScheduleByProjectId(projectId);
      if (scheduleData && scheduleData.length > 0) {
        const latestSchedule = scheduleData[0]; // Assuming sorted by latest
        const tasks = latestSchedule.schedule_tasks;
        
        if (tasks && tasks.length > 0) {
          // Calculate average progress across all tasks
          const totalProgress = tasks.reduce((sum: number, task: any) => sum + task.progress, 0);
          metrics.currentProgress = Math.round(totalProgress / tasks.length);
          console.log(`📈 Progress from Schedule: ${metrics.currentProgress}%`);
        } else {
          console.log(`📈 No schedule tasks found for project ${projectId}`);
        }
      } else {
        console.log(`📈 No schedule data found for project ${projectId}`);
      }
    } catch (error) {
      console.log('No Schedule data available');
    }

    // 3. Calculate End Date from Schedule
    try {
      const scheduleData = await getScheduleByProjectId(projectId);
      if (scheduleData && scheduleData.length > 0) {
        const latestSchedule = scheduleData[0];
        const tasks = latestSchedule.schedule_tasks;
        
        if (tasks && tasks.length > 0) {
          // Find the latest end date among all tasks
          const latestEndDate = tasks.reduce((latest: string, task: any) => {
            const taskEndDate = new Date(task.end_date);
            const currentLatest = new Date(latest);
            return taskEndDate > currentLatest ? task.end_date : latest;
          }, tasks[0].end_date);
          
          metrics.endDate = latestEndDate;
          console.log(`📅 End date from Schedule: ${metrics.endDate}`);
        } else {
          console.log(`📅 No schedule tasks found for project ${projectId}`);
        }
      } else {
        console.log(`📅 No schedule data found for project ${projectId}`);
      }
    } catch (error) {
      console.log('No Schedule data available');
    }

    return metrics;
  } catch (error) {
    console.error('Error calculating project metrics:', error);
    return {};
  }
}

/**
 * Update project record with calculated metrics
 */
export async function updateProjectMetrics(projectId: string): Promise<void> {
  try {
    const metrics = await calculateProjectMetrics(projectId);
    
    if (Object.keys(metrics).length === 0) {
      console.log('No metrics to update');
      return;
    }

    // Update project record with calculated values
    const { error } = await supabase
      .from('projects')
      .update({
        ...(metrics.projectValue !== undefined && { project_value: metrics.projectValue }),
        ...(metrics.currentProgress !== undefined && { current_progress: metrics.currentProgress }),
        ...(metrics.endDate && { expected_end_date: metrics.endDate }),
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (error) {
      console.error('Error updating project metrics:', error);
      throw error;
    }

    console.log(`✅ Project metrics updated for ${projectId}:`, metrics);
  } catch (error) {
    console.error('Failed to update project metrics:', error);
    throw error;
  }
}

// Future KPI functions can be added here:
// - calculateContractorPerformance()
// - calculateProjectDelay()
// - calculateCostVariance()
// - calculateResourceUtilization()