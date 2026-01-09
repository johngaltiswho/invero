'use client';

import { useState, useEffect } from 'react';
import { getScheduleByProjectId } from '@/lib/supabase-boq';

interface MasterScheduleProps {
  contractorProjects: any[];
  contractorId: string;
}

interface TaskWithProject {
  id: string;
  task: string;
  end_date: string;
  progress: number;
  projectId: string;
  projectName: string;
  clientName: string;
  status: 'overdue' | 'upcoming' | 'completed';
}

type SortField = 'task' | 'project' | 'dueDate' | 'status';
type SortDirection = 'asc' | 'desc';

export default function MasterSchedule({ contractorProjects, contractorId }: MasterScheduleProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allTasks, setAllTasks] = useState<TaskWithProject[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TaskWithProject[]>([]);
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'upcoming'>('upcoming');
  const [filterProject, setFilterProject] = useState<string>('all');

  useEffect(() => {
    loadSchedules();
  }, [contractorProjects]);

  const loadSchedules = async () => {
    setLoading(true);
    setError('');
    
    try {
      const today = new Date();
      const tasks: TaskWithProject[] = [];
      
      for (const project of contractorProjects) {
        try {
          const scheduleData = await getScheduleByProjectId(project.id);
          
          if (scheduleData && scheduleData.length > 0) {
            const latestSchedule = scheduleData[0];
            
            if ((latestSchedule as any).schedule_tasks) {
              (latestSchedule as any).schedule_tasks.forEach((task: any) => {
                const endDate = new Date(task.end_date);
                let status: 'overdue' | 'upcoming' | 'completed';
                
                if (task.progress >= 100) {
                  status = 'completed';
                } else if (endDate < today) {
                  status = 'overdue';
                } else {
                  status = 'upcoming';
                }
                
                tasks.push({
                  id: `${project.id}-${task.id}`,
                  task: task.task,
                  end_date: task.end_date,
                  progress: task.progress,
                  projectId: project.id,
                  projectName: project.projectName,
                  clientName: project.clientName || 'Unknown Client',
                  status
                });
              });
            }
          }
        } catch (err) {
          console.error(`Failed to load schedule for project ${project.id}:`, err);
        }
      }
      
      setAllTasks(tasks);
    } catch (err) {
      setError('Failed to load schedules');
      console.error('Error loading schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  // Apply filtering and sorting
  useEffect(() => {
    let filtered = [...allTasks];
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }
    
    // Filter by project
    if (filterProject !== 'all') {
      filtered = filtered.filter(task => task.projectId === filterProject);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortField) {
        case 'task':
          aValue = a.task.toLowerCase();
          bValue = b.task.toLowerCase();
          break;
        case 'project':
          aValue = a.projectName.toLowerCase();
          bValue = b.projectName.toLowerCase();
          break;
        case 'dueDate':
          aValue = new Date(a.end_date).getTime();
          bValue = new Date(b.end_date).getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = new Date(a.end_date).getTime();
          bValue = new Date(b.end_date).getTime();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredTasks(filtered);
  }, [allTasks, filterStatus, filterProject, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-500/20 text-red-400';
      case 'upcoming':
        return 'bg-blue-500/20 text-blue-400';
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'Overdue';
      case 'upcoming':
        return 'Upcoming';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  const overdueTasks = allTasks.filter(t => t.status === 'overdue');
  const upcomingTasks = allTasks.filter(t => t.status === 'upcoming');
  const completedTasks = allTasks.filter(t => t.status === 'completed');

  if (loading) {
    return (
      <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
        <div className="animate-pulse">
          <div className="h-6 bg-neutral-medium rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
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
          onClick={loadSchedules}
          className="mt-2 px-4 py-2 bg-accent-amber text-neutral-dark rounded hover:bg-accent-amber/90 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (allTasks.length === 0) {
    return (
      <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
        <h3 className="text-lg font-semibold mb-4 text-primary">Schedule Overview</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📅</div>
          <p className="text-secondary">No scheduled tasks found across your projects</p>
          <p className="text-secondary text-sm mt-2">Add schedules to your projects to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-dark p-6 rounded-lg border border-neutral-medium">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-primary">Schedule Overview</h3>
        
        {/* Summary Stats */}
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-secondary">Overdue: {overdueTasks.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-secondary">Upcoming: {upcomingTasks.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-secondary">Completed: {completedTasks.length}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-secondary">Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'overdue' | 'upcoming')}
            className="px-3 py-1.5 bg-neutral-darker border border-neutral-medium rounded text-sm text-primary focus:border-accent-amber focus:outline-none"
          >
            <option value="all">All</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-secondary">Project:</label>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-3 py-1.5 bg-neutral-darker border border-neutral-medium rounded text-sm text-primary focus:border-accent-amber focus:outline-none"
          >
            <option value="all">All Projects</option>
            {contractorProjects.map(project => (
              <option key={project.id} value={project.id}>
                {project.projectName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-neutral-medium">
              <th 
                className="text-left py-3 px-4 font-medium text-secondary cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('task')}
              >
                <div className="flex items-center space-x-1">
                  <span>Task</span>
                  {sortField === 'task' && (
                    <span className="text-accent-amber">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="text-left py-3 px-4 font-medium text-secondary cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('project')}
              >
                <div className="flex items-center space-x-1">
                  <span>Project</span>
                  {sortField === 'project' && (
                    <span className="text-accent-amber">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="text-left py-3 px-4 font-medium text-secondary cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('dueDate')}
              >
                <div className="flex items-center space-x-1">
                  <span>Due Date</span>
                  {sortField === 'dueDate' && (
                    <span className="text-accent-amber">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="text-left py-3 px-4 font-medium text-secondary cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  {sortField === 'status' && (
                    <span className="text-accent-amber">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="text-center py-3 px-4 font-medium text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
              <tr key={task.id} className="border-b border-neutral-medium/50 hover:bg-neutral-darker/30 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-medium text-primary">{task.task}</div>
                  <div className="text-sm text-secondary">{task.clientName}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-primary">{task.projectName}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-primary">{formatDate(task.end_date)}</div>
                  <div className="text-xs text-secondary">
                    {task.status === 'overdue' && 'Overdue'}
                    {task.status === 'upcoming' && 'Upcoming'}
                    {task.status === 'completed' && 'Completed'}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                    {getStatusText(task.status)}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => window.location.href = `/dashboard/contractor/projects/${task.projectId}?tab=schedule`}
                    className="px-3 py-1.5 bg-accent-amber text-neutral-dark rounded text-xs font-medium hover:bg-accent-amber/90 transition-colors"
                  >
                    View Schedule
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredTasks.length === 0 && (
          <div className="text-center py-8 text-secondary">
            <p>No tasks match the current filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
