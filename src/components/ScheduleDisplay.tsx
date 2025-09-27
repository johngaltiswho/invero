'use client';

import { useState, useEffect } from 'react';
import { getScheduleByProjectId, deleteSchedule, saveScheduleToSupabase, updateScheduleInSupabase } from '@/lib/supabase-boq';
import type { ProjectSchedule } from '@/types/boq';

interface ScheduleDisplayProps {
  projectId: string;
  contractorId: string;
}

interface ScheduleData {
  id: string;
  file_name: string;
  total_duration: number;
  upload_date: string;
  schedule_tasks: {
    id?: string; // Database task ID 
    task: string;
    start_date: string;
    end_date: string;
    duration: number;
    progress: number;
  }[];
}

interface EditableTask {
  id?: string; // Database task ID (undefined for new tasks)
  task: string;
  start_date: string;
  end_date: string;
  duration: number;
  progress: number;
}

export default function ScheduleDisplay({ projectId, contractorId }: ScheduleDisplayProps) {
  const [scheduleData, setScheduleData] = useState<ScheduleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editingTasks, setEditingTasks] = useState<EditableTask[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadScheduleData();
  }, [projectId]);

  const loadScheduleData = async () => {
    try {
      setLoading(true);
      const data = await getScheduleByProjectId(projectId);
      setScheduleData(data || []);
      setMessage('');
    } catch (err) {
      setError('Failed to load schedule data');
      console.error('Error loading schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule? This action cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      await deleteSchedule(scheduleId);
      setMessage('Schedule deleted successfully!');
      loadScheduleData(); // Reload the data
    } catch (err) {
      setError('Failed to delete schedule');
      console.error('Error deleting schedule:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (schedule: ScheduleData) => {
    setEditingScheduleId(schedule.id);
    // Load current tasks for editing (no need to track IDs anymore)
    const tasksForEditing = schedule.schedule_tasks.map(task => ({
      task: task.task,
      start_date: task.start_date,
      end_date: task.end_date,
      duration: task.duration,
      progress: task.progress
    }));
    setEditingTasks(tasksForEditing);
  };

  const handleCancelEdit = () => {
    setEditingScheduleId(null);
    setEditingTasks([]);
  };

  const updateTask = (taskIndex: number, field: string, value: string | number) => {
    const updatedTasks = [...editingTasks];
    updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], [field]: value };

    // Auto-calculate duration for date changes
    if (field === 'start_date' || field === 'end_date') {
      const startDate = new Date(updatedTasks[taskIndex].start_date);
      const endDate = new Date(updatedTasks[taskIndex].end_date);
      if (startDate && endDate && endDate >= startDate) {
        const diffTime = endDate.getTime() - startDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        updatedTasks[taskIndex].duration = diffDays;
      }
    }

    setEditingTasks(updatedTasks);
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      
      // Filter out empty tasks
      const validTasks = editingTasks.filter(task => task.task.trim() !== '');
      
      if (validTasks.length === 0) {
        setError('Please add at least one valid task');
        return;
      }
      
      const totalDuration = Math.max(...validTasks.map(task => task.duration));
      const schedule: ProjectSchedule = {
        projectId,
        contractorId,
        uploadDate: new Date().toISOString(),
        tasks: validTasks.map(task => ({
          task: task.task,
          startDate: task.start_date,
          endDate: task.end_date,
          duration: task.duration,
          progress: task.progress
        })),
        totalDuration,
        fileName: 'Updated Schedule'
      };

      // Simple "Notion-style" update: save exactly what you see
      console.log('Saving schedule with', validTasks.length, 'tasks');
      
      await updateScheduleInSupabase(editingScheduleId!, schedule);
      
      setMessage('Schedule updated successfully!');
      setEditingScheduleId(null);
      setEditingTasks([]);
      
      // Add a small delay to ensure database consistency
      setTimeout(() => {
        loadScheduleData();
      }, 500);
    } catch (err) {
      console.error('Detailed error:', err);
      setError(`Failed to save schedule changes: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusBadge = (progress: number) => {
    if (progress >= 100) return { text: 'Completed', color: 'bg-green-100 text-green-800' };
    if (progress > 0) return { text: 'In Progress', color: 'bg-blue-100 text-blue-800' };
    return { text: 'Not Started', color: 'bg-gray-100 text-gray-800' };
  };

  if (loading) {
    return (
      <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
        <div className="animate-pulse">
          <div className="h-4 bg-neutral-medium rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-neutral-medium rounded"></div>
            <div className="h-4 bg-neutral-medium rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
        <div className="text-error">{error}</div>
        <button 
          onClick={loadScheduleData}
          className="mt-2 px-4 py-2 bg-accent-amber text-neutral-dark rounded hover:bg-accent-amber/90 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (scheduleData.length === 0) {
    return (
      <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
        <h3 className="text-lg font-semibold mb-4 text-primary">Project Schedule</h3>
        <p className="text-secondary">No schedule uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="bg-success/10 text-success border border-success/20 p-3 rounded text-sm">
          {message}
        </div>
      )}
      
      {scheduleData.map((schedule) => {
        const isEditing = editingScheduleId === schedule.id;
        const tasksToDisplay = isEditing ? editingTasks : schedule.schedule_tasks;
        
        return (
          <div key={schedule.id} className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-primary mb-2">Project Schedule</h3>
                <div className="text-sm text-secondary space-y-1">
                  <p><span className="font-medium">File:</span> {schedule.file_name}</p>
                  <p><span className="font-medium">Uploaded:</span> {formatDate(schedule.upload_date)}</p>
                  <p><span className="font-medium">Total Duration:</span> {schedule.total_duration} days</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className="px-3 py-1.5 bg-success text-white rounded hover:bg-success/90 disabled:opacity-50 text-sm font-medium"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="px-3 py-1.5 bg-neutral-medium text-secondary rounded hover:bg-neutral-light text-sm"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleEdit(schedule)}
                      className="px-3 py-1.5 bg-accent-blue text-white rounded hover:bg-accent-blue/90 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      disabled={saving}
                      className="px-3 py-1.5 bg-error text-white rounded hover:bg-error/90 disabled:opacity-50 text-sm font-medium"
                    >
                      {saving ? 'Deleting...' : 'Delete'}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse">
                <thead>
                  <tr className="bg-neutral-darker">
                    <th className="border border-neutral-medium px-3 py-2 text-left text-sm font-medium text-secondary">Task</th>
                    <th className="border border-neutral-medium px-3 py-2 text-left text-sm font-medium text-secondary">Start Date</th>
                    <th className="border border-neutral-medium px-3 py-2 text-left text-sm font-medium text-secondary">End Date</th>
                    <th className="border border-neutral-medium px-3 py-2 text-center text-sm font-medium text-secondary">Duration</th>
                    <th className="border border-neutral-medium px-3 py-2 text-center text-sm font-medium text-secondary">Progress</th>
                    <th className="border border-neutral-medium px-3 py-2 text-center text-sm font-medium text-secondary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tasksToDisplay.map((task, index) => {
                    const status = getStatusBadge(task.progress);
                    return (
                      <tr key={index} className="hover:bg-neutral-darker/50">
                        <td className="border border-neutral-medium px-3 py-2" style={{ minWidth: '300px' }}>
                          {isEditing ? (
                            <textarea
                              value={task.task}
                              onChange={(e) => updateTask(index, 'task', e.target.value)}
                              className="w-full px-2 py-1 text-sm bg-neutral-dark text-primary border-none focus:outline-none focus:ring-1 focus:ring-accent-amber rounded resize-none"
                              rows={task.task.split('\n').length || 1}
                              style={{ minHeight: '32px' }}
                            />
                          ) : (
                            <span className="text-sm text-primary whitespace-pre-wrap">{task.task}</span>
                          )}
                        </td>
                        <td className="border border-neutral-medium px-3 py-2">
                          {isEditing ? (
                            <input
                              type="date"
                              value={task.start_date}
                              onChange={(e) => updateTask(index, 'start_date', e.target.value)}
                              className="w-full px-2 py-1 text-sm bg-neutral-dark text-primary border-none focus:outline-none focus:ring-1 focus:ring-accent-amber rounded"
                            />
                          ) : (
                            <span className="text-sm text-primary">{formatDate(task.start_date)}</span>
                          )}
                        </td>
                        <td className="border border-neutral-medium px-3 py-2">
                          {isEditing ? (
                            <input
                              type="date"
                              value={task.end_date}
                              onChange={(e) => updateTask(index, 'end_date', e.target.value)}
                              className="w-full px-2 py-1 text-sm bg-neutral-dark text-primary border-none focus:outline-none focus:ring-1 focus:ring-accent-amber rounded"
                            />
                          ) : (
                            <span className="text-sm text-primary">{formatDate(task.end_date)}</span>
                          )}
                        </td>
                        <td className="border border-neutral-medium px-3 py-2 text-center">
                          <span className="text-sm font-medium text-primary">{task.duration} days</span>
                        </td>
                        <td className="border border-neutral-medium px-3 py-2">
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={task.progress}
                                onChange={(e) => updateTask(index, 'progress', parseFloat(e.target.value))}
                                className="flex-1 accent-accent-amber"
                              />
                              <span className="text-xs font-medium w-12 text-right text-secondary">{task.progress}%</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <div className="w-full bg-neutral-medium rounded-full h-2 mr-2">
                                <div
                                  className={`h-2 rounded-full ${getProgressColor(task.progress)}`}
                                  style={{ width: `${Math.min(task.progress, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-medium text-secondary">{task.progress}%</span>
                            </div>
                          )}
                          {isEditing && (
                            <div className="mt-1 w-full bg-neutral-medium rounded-full h-1">
                              <div
                                className={`h-1 rounded-full ${getProgressColor(task.progress)}`}
                                style={{ width: `${Math.min(task.progress, 100)}%` }}
                              ></div>
                            </div>
                          )}
                        </td>
                        <td className="border border-neutral-medium px-3 py-2 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                            {status.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Stats */}
            <div className="mt-4 grid grid-cols-3 gap-4 p-4 bg-neutral-darker rounded-lg border border-neutral-medium">
              <div className="text-center">
                <div className="text-xl font-bold text-success">
                  {tasksToDisplay.filter(task => task.progress >= 100).length}
                </div>
                <div className="text-sm text-secondary">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-accent-blue">
                  {tasksToDisplay.filter(task => task.progress > 0 && task.progress < 100).length}
                </div>
                <div className="text-sm text-secondary">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-primary">
                  {tasksToDisplay.filter(task => task.progress === 0).length}
                </div>
                <div className="text-sm text-secondary">Not Started</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}