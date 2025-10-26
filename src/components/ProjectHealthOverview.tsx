'use client';

import { useState, useEffect } from 'react';
import { getScheduleByProjectId, getBOQByProjectId } from '@/lib/supabase-boq';

interface ProjectHealthOverviewProps {
  projects: any[];
}

interface ProjectHealth {
  id: string;
  name: string;
  client: string;
  hasSchedule: boolean;
  hasBOQ: boolean;
  overdueTasks: number;
  totalTasks: number;
  lastUpdated: string | null;
  status: 'healthy' | 'needs-attention' | 'missing-data';
  issues: string[];
}

export default function ProjectHealthOverview({ projects }: ProjectHealthOverviewProps) {
  const [projectsHealth, setProjectsHealth] = useState<ProjectHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeProjectHealth();
  }, [projects]);

  const analyzeProjectHealth = async () => {
    setLoading(true);
    
    try {
      const healthData: ProjectHealth[] = [];
      
      for (const project of projects) {
        const issues: string[] = [];
        let hasSchedule = false;
        let hasBOQ = false;
        let overdueTasks = 0;
        let totalTasks = 0;
        let lastUpdated: string | null = null;

        try {
          // Check for schedule
          const scheduleData = await getScheduleByProjectId(project.id);
          if (scheduleData && scheduleData.length > 0) {
            hasSchedule = true;
            lastUpdated = scheduleData[0].upload_date;
            
            // Count overdue tasks
            const today = new Date();
            scheduleData[0].schedule_tasks?.forEach((task: any) => {
              totalTasks++;
              const endDate = new Date(task.end_date);
              if (endDate < today && task.progress < 100) {
                overdueTasks++;
              }
            });
          } else {
            issues.push('Missing schedule');
          }

          // Check for BOQ
          const boqData = await getBOQByProjectId(project.id);
          if (boqData && boqData.length > 0) {
            hasBOQ = true;
            if (!lastUpdated || new Date(boqData[0].upload_date) > new Date(lastUpdated)) {
              lastUpdated = boqData[0].upload_date;
            }
          } else {
            issues.push('Missing BOQ');
          }

        } catch (error) {
          console.error(`Error analyzing project ${project.id}:`, error);
        }

        // Add other potential issues
        if (overdueTasks > 0) {
          issues.push(`${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}`);
        }

        if (!lastUpdated) {
          issues.push('No recent updates');
        } else {
          const daysSinceUpdate = Math.floor(
            (new Date().getTime() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceUpdate > 7) {
            issues.push(`Last updated ${daysSinceUpdate} days ago`);
          }
        }

        // Determine overall health status
        let status: 'healthy' | 'needs-attention' | 'missing-data';
        if (!hasSchedule || !hasBOQ) {
          status = 'missing-data';
        } else if (issues.length > 0) {
          status = 'needs-attention';
        } else {
          status = 'healthy';
        }

        healthData.push({
          id: project.id,
          name: project.project_name || project.projectName,
          client: project.client_name || project.clientName || 'Unknown Client',
          hasSchedule,
          hasBOQ,
          overdueTasks,
          totalTasks,
          lastUpdated,
          status,
          issues
        });
      }

      // Sort by status priority (needs attention first)
      healthData.sort((a, b) => {
        const statusOrder = { 'missing-data': 0, 'needs-attention': 1, 'healthy': 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });

      setProjectsHealth(healthData);
    } catch (error) {
      console.error('Error analyzing project health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-success/10 border-success/20';
      case 'needs-attention':
        return 'bg-warning/10 border-warning/20';
      case 'missing-data':
        return 'bg-error/10 border-error/20';
      default:
        return 'bg-neutral-medium/10 border-neutral-medium/20';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-success';
      case 'needs-attention':
        return 'text-warning';
      case 'missing-data':
        return 'text-error';
      default:
        return 'text-secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'needs-attention':
        return 'Needs Attention';
      case 'missing-data':
        return 'Missing Data';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-neutral-medium rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-8 text-secondary">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-sm">No projects to analyze</p>
      </div>
    );
  }

  const healthyProjects = projectsHealth.filter(p => p.status === 'healthy').length;
  const needsAttentionProjects = projectsHealth.filter(p => p.status === 'needs-attention').length;
  const missingDataProjects = projectsHealth.filter(p => p.status === 'missing-data').length;

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold text-success">{healthyProjects}</div>
          <div className="text-xs text-secondary">Healthy</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-warning">{needsAttentionProjects}</div>
          <div className="text-xs text-secondary">Need Attention</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-error">{missingDataProjects}</div>
          <div className="text-xs text-secondary">Missing Data</div>
        </div>
      </div>

      {/* Project List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {projectsHealth.map((project) => (
          <div key={project.id} className={`p-3 rounded-lg border ${getStatusColor(project.status)}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  project.status === 'healthy' ? 'bg-success' : 
                  project.status === 'needs-attention' ? 'bg-warning' : 'bg-error'
                }`}></div>
                <div>
                  <h4 className="font-medium text-primary text-sm">{project.name}</h4>
                  <p className="text-xs text-secondary">{project.client}</p>
                </div>
              </div>
              <div className={`text-xs font-medium px-2 py-1 rounded ${
                project.status === 'healthy' ? 'bg-success/20 text-success' : 
                project.status === 'needs-attention' ? 'bg-warning/20 text-warning' : 'bg-error/20 text-error'
              }`}>
                {getStatusText(project.status)}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${project.hasSchedule ? 'bg-success' : 'bg-error'}`}></div>
                  <span className="text-secondary">Schedule</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${project.hasBOQ ? 'bg-success' : 'bg-error'}`}></div>
                  <span className="text-secondary">BOQ</span>
                </div>
              </div>
              {project.overdueTasks > 0 && (
                <span className="text-error font-medium bg-error/10 px-2 py-1 rounded">
                  {project.overdueTasks} overdue
                </span>
              )}
            </div>
            
            {/* Issues description */}
            {project.issues.length > 0 && (
              <div className="text-xs text-warning mb-2">
                {project.issues.slice(0, 2).join(' • ')}
                {project.issues.length > 2 && ' • ...'}
              </div>
            )}
            
            {/* Action Button */}
            <div className="flex justify-end">
              <button
                onClick={() => window.location.href = `/dashboard/contractor/projects?project=${project.id}`}
                className="text-xs text-accent-amber hover:text-accent-amber/80 font-medium"
              >
                View Project →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}