import { supabase } from './supabase';
import type { ProjectBOQ, ProjectSchedule, BOQItem, ScheduleItem } from '@/types/boq';

// BOQ Functions
// Test Supabase connection
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('project_boqs')
      .select('id')
      .limit(1);
    
    console.log('Supabase connection test:', { data, error });
    return { connected: !error, error };
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return { connected: false, error };
  }
}

export async function saveBOQToSupabase(boq: ProjectBOQ) {
  try {
    console.log('Starting BOQ save process...');
    console.log('BOQ data:', JSON.stringify(boq, null, 2));
    
    // Test connection first
    const connectionTest = await testSupabaseConnection();
    console.log('Connection test result:', connectionTest);
    
    if (!connectionTest.connected) {
      const errorMessage = connectionTest.error && typeof connectionTest.error === 'object' && 'message' in connectionTest.error 
        ? (connectionTest.error as any).message 
        : 'Unknown connection error';
      throw new Error(`Supabase connection failed: ${errorMessage}`);
    }
    
    // Insert BOQ record
    const { data: boqData, error: boqError } = await supabase
      .from('project_boqs')
      .insert({
        project_id: boq.projectId,
        contractor_id: boq.contractorId,
        upload_date: boq.uploadDate,
        total_amount: Math.round(boq.totalAmount), // Round to nearest integer
        file_name: boq.fileName
      })
      .select()
      .single();

    console.log('BOQ insert result:', { data: boqData, error: boqError });

    if (boqError) {
      console.error('BOQ insert error:', boqError);
      throw new Error(`Failed to insert BOQ: ${boqError.message} (Code: ${boqError.code})`);
    }

    // Insert BOQ items
    const boqItems = boq.items.map(item => {
      const quantityText = String(item.quantity || '');
      const quantityNumeric = typeof item.quantity === 'number' ? item.quantity : parseFloat(quantityText);
      
      // Handle description-only rows (headers)
      const isHeaderRow = !item.quantity && !item.rate && !item.amount;
      
      return {
        boq_id: boqData.id,
        description: item.description,
        unit: item.unit || 'N/A',
        quantity_text: isHeaderRow ? 'HEADER' : quantityText,
        quantity_numeric: isHeaderRow ? null : (isNaN(quantityNumeric) ? null : parseFloat(quantityNumeric.toFixed(2))),
        rate: isHeaderRow ? 0 : parseFloat(item.rate.toFixed(2)),
        amount: isHeaderRow ? 0 : parseFloat(item.amount.toFixed(2)),
        category: isHeaderRow ? 'HEADER' : null
      };
    });

    console.log('BOQ items to insert:', JSON.stringify(boqItems, null, 2));

    const { error: itemsError } = await supabase
      .from('boq_items')
      .insert(boqItems);

    console.log('BOQ items insert error:', itemsError);

    if (itemsError) {
      console.error('BOQ items insert error:', itemsError);
      throw new Error(`Failed to insert BOQ items: ${itemsError.message} (Code: ${itemsError.code})`);
    }

    console.log('BOQ save completed successfully');

    // Update project metrics after BOQ save
    try {
      const { updateProjectMetrics } = await import('./contractor-metrics');
      await updateProjectMetrics(boq.projectId);
      console.log('✅ Project metrics updated after BOQ save');
    } catch (metricsError) {
      console.error('Failed to update project metrics after BOQ save:', metricsError);
      // Don't throw - BOQ save should succeed even if metrics update fails
    }

    return boqData;
  } catch (error) {
    console.error('Error saving BOQ to Supabase:', error);
    throw error;
  }
}

export async function getBOQByProjectId(projectId: string) {
  try {
    const { data, error } = await supabase
      .from('project_boqs')
      .select(`
        *,
        boq_items (*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching BOQ:', error);
    throw error;
  }
}

// Schedule Functions
export async function saveScheduleToSupabase(schedule: ProjectSchedule) {
  try {
    // Insert Schedule record
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('project_schedules')
      .insert({
        project_id: schedule.projectId,
        contractor_id: schedule.contractorId,
        upload_date: schedule.uploadDate,
        total_duration: schedule.totalDuration,
        file_name: schedule.fileName
      })
      .select()
      .single();

    if (scheduleError) throw scheduleError;

    // Insert Schedule tasks
    const scheduleTasks = schedule.tasks.map(task => ({
      schedule_id: scheduleData.id,
      task: task.task,
      start_date: task.startDate,
      end_date: task.endDate,
      duration: task.duration,
      progress: task.progress,
      responsible: null,
      dependencies: null
    }));

    const { error: tasksError } = await supabase
      .from('schedule_tasks')
      .insert(scheduleTasks);

    if (tasksError) throw tasksError;

    // Update project metrics after Schedule save
    try {
      const { updateProjectMetrics } = await import('./contractor-metrics');
      await updateProjectMetrics(schedule.projectId);
      console.log('✅ Project metrics updated after Schedule save');
    } catch (metricsError) {
      console.error('Failed to update project metrics after Schedule save:', metricsError);
      // Don't throw - Schedule save should succeed even if metrics update fails
    }

    return scheduleData;
  } catch (error) {
    console.error('Error saving Schedule to Supabase:', error);
    throw error;
  }
}

export async function getScheduleByProjectId(projectId: string) {
  try {
    const { data, error } = await supabase
      .from('project_schedules')
      .select(`
        *,
        schedule_tasks (*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching Schedule:', error);
    throw error;
  }
}

// Delete functions
export async function deleteBOQ(boqId: string) {
  try {
    console.log('Attempting to delete BOQ with ID:', boqId);
    
    const { error } = await supabase
      .from('project_boqs')
      .delete()
      .eq('id', boqId);

    console.log('Delete result:', { error });

    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Failed to delete BOQ: ${error.message} (Code: ${error.code})`);
    }
    
    console.log('BOQ deleted successfully');
  } catch (error) {
    console.error('Error deleting BOQ:', error);
    throw error;
  }
}

export async function deleteSchedule(scheduleId: string) {
  try {
    const { error } = await supabase
      .from('project_schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting Schedule:', error);
    throw error;
  }
}

export async function updateScheduleInSupabase(scheduleId: string, schedule: ProjectSchedule) {
  try {
    // Update the main schedule record
    const { error: scheduleError } = await supabase
      .from('project_schedules')
      .update({
        total_duration: schedule.totalDuration,
        file_name: schedule.fileName,
        upload_date: new Date().toISOString()
      })
      .eq('id', scheduleId);

    if (scheduleError) throw scheduleError;

    // Simple approach: Delete all existing tasks and insert current tasks
    // This is the "Notion way" - what you see is what gets saved
    const { error: deleteError } = await supabase
      .from('schedule_tasks')
      .delete()
      .eq('schedule_id', scheduleId);

    if (deleteError) throw deleteError;

    // Insert all current tasks
    if (schedule.tasks.length > 0) {
      const scheduleTasks = schedule.tasks.map(task => ({
        schedule_id: scheduleId,
        task: task.task,
        start_date: task.startDate,
        end_date: task.endDate,
        duration: task.duration,
        progress: task.progress,
        responsible: null,
        dependencies: null
      }));

      const { error: tasksError } = await supabase
        .from('schedule_tasks')
        .insert(scheduleTasks);

      if (tasksError) throw tasksError;
    }

    console.log(`Schedule updated: ${schedule.tasks.length} tasks saved`);

    // Update project metrics after Schedule update
    try {
      const { updateProjectMetrics } = await import('./contractor-metrics');
      await updateProjectMetrics(schedule.projectId);
      console.log('✅ Project metrics updated after Schedule update');
    } catch (metricsError) {
      console.error('Failed to update project metrics after Schedule update:', metricsError);
      // Don't throw - Schedule update should succeed even if metrics update fails
    }

    return true;
  } catch (error) {
    console.error('Error updating schedule in Supabase:', error);
    throw error;
  }
}