'use client';

import { useState, useEffect } from 'react';
import { getScheduleByProjectId, getBOQByProjectId } from '@/lib/supabase-boq';

interface RecentActivityProps {
  projects: any[];
  contractorId: string;
}

interface ActivityItem {
  id: string;
  type: 'boq_upload' | 'schedule_upload' | 'schedule_update' | 'project_created';
  projectId: string;
  projectName: string;
  clientName: string;
  description: string;
  timestamp: string;
  fileName?: string;
}

export default function RecentActivity({ projects, contractorId }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentActivity();
  }, [projects]);

  const loadRecentActivity = async () => {
    setLoading(true);
    
    try {
      const allActivities: ActivityItem[] = [];
      
      for (const project of projects) {
        const projectName = project.project_name || project.projectName;
        const clientName = project.client_name || project.clientName || 'Unknown Client';
        
        try {
          // Get BOQ activities
          const boqData = await getBOQByProjectId(project.id);
          if (boqData && boqData.length > 0) {
            boqData.forEach((boq: any) => {
              allActivities.push({
                id: `boq-${boq.id}`,
                type: 'boq_upload',
                projectId: project.id,
                projectName,
                clientName,
                description: 'Uploaded BOQ',
                timestamp: boq.upload_date || boq.created_at,
                fileName: boq.file_name
              });
            });
          }

          // Get Schedule activities
          const scheduleData = await getScheduleByProjectId(project.id);
          if (scheduleData && scheduleData.length > 0) {
            scheduleData.forEach((schedule: any) => {
              allActivities.push({
                id: `schedule-${schedule.id}`,
                type: 'schedule_upload',
                projectId: project.id,
                projectName,
                clientName,
                description: 'Updated project schedule',
                timestamp: schedule.upload_date || schedule.created_at,
                fileName: schedule.file_name
              });
            });
          }

        } catch (error) {
          console.error(`Error loading activity for project ${project.id}:`, error);
        }

        // Add project creation activity
        if (project.created_at) {
          allActivities.push({
            id: `project-${project.id}`,
            type: 'project_created',
            projectId: project.id,
            projectName,
            clientName,
            description: 'Created new project',
            timestamp: project.created_at
          });
        }
      }

      // Sort by timestamp (most recent first) and take last 10
      allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(allActivities.slice(0, 10));

    } catch (error) {
      console.error('Error loading recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'boq_upload':
        return '📊';
      case 'schedule_upload':
      case 'schedule_update':
        return '📅';
      case 'project_created':
        return '🏗️';
      default:
        return '📝';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'boq_upload':
        return 'text-accent-blue';
      case 'schedule_upload':
      case 'schedule_update':
        return 'text-accent-amber';
      case 'project_created':
        return 'text-success';
      default:
        return 'text-secondary';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    
    return activityTime.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFullDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-neutral-medium rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-neutral-medium rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-neutral-medium rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-secondary">
        <div className="text-4xl mb-2">📋</div>
        <p className="text-sm">No recent activity</p>
        <p className="text-xs mt-1">Activity will appear here as you work on projects</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3">
          {/* Activity Icon */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-neutral-darker rounded-full flex items-center justify-center text-sm">
              {getActivityIcon(activity.type)}
            </div>
          </div>
          
          {/* Activity Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-primary">
                  <span className={`font-medium ${getActivityColor(activity.type)}`}>
                    {activity.description}
                  </span>
                  {activity.fileName && (
                    <span className="text-secondary"> • {activity.fileName}</span>
                  )}
                </p>
                <p className="text-xs text-secondary truncate mt-1">
                  {activity.projectName} • {activity.clientName}
                </p>
              </div>
              <div className="flex-shrink-0 ml-2">
                <p className="text-xs text-secondary" title={formatFullDate(activity.timestamp)}>
                  {formatTimeAgo(activity.timestamp)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {activities.length === 10 && (
        <div className="text-center pt-2">
          <p className="text-xs text-secondary">Showing last 10 activities</p>
        </div>
      )}
    </div>
  );
}