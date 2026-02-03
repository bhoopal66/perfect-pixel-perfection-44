import { useState, useMemo } from 'react';
import { formatDistanceToNow, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { 
  UserPlus, 
  UserMinus, 
  Shield, 
  RefreshCw, 
  Trash2, 
  XCircle,
  Users,
  Activity
} from 'lucide-react';
import { useActivityLogs, type ActivityAction, type ActivityLog } from '@/hooks/use-activity-log';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityLogFilters, type ActivityLogFiltersState } from './ActivityLogFilters';

// Helper to safely get details as a typed record
function getDetails(log: ActivityLog): Record<string, string | number | boolean | null> {
  if (typeof log.details === 'object' && log.details !== null && !Array.isArray(log.details)) {
    return log.details as Record<string, string | number | boolean | null>;
  }
  return {};
}

const ACTION_CONFIG: Record<ActivityAction, { 
  icon: typeof UserPlus; 
  label: string;
  color: string;
}> = {
  member_invited: { 
    icon: UserPlus, 
    label: 'Invited',
    color: 'text-primary'
  },
  invitation_cancelled: { 
    icon: XCircle, 
    label: 'Cancelled invitation',
    color: 'text-muted-foreground'
  },
  member_added: { 
    icon: UserPlus, 
    label: 'Added',
    color: 'text-primary'
  },
  member_removed: { 
    icon: UserMinus, 
    label: 'Removed',
    color: 'text-orange-500'
  },
  member_reactivated: { 
    icon: RefreshCw, 
    label: 'Reactivated',
    color: 'text-primary'
  },
  member_deleted: { 
    icon: Trash2, 
    label: 'Permanently deleted',
    color: 'text-destructive'
  },
  role_changed: { 
    icon: Shield, 
    label: 'Changed role',
    color: 'text-blue-500'
  },
  bulk_role_changed: { 
    icon: Users, 
    label: 'Bulk role change',
    color: 'text-blue-500'
  },
  bulk_removed: { 
    icon: Users, 
    label: 'Bulk removed',
    color: 'text-orange-500'
  },
};

export function ActivityLogList() {
  const { data: logs, isLoading } = useActivityLogs();
  const [filters, setFilters] = useState<ActivityLogFiltersState>({
    actionType: 'all',
    startDate: undefined,
    endDate: undefined,
  });

  // Filter logs based on selected filters
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    
    return logs.filter((log) => {
      // Filter by action type
      if (filters.actionType !== 'all' && log.action !== filters.actionType) {
        return false;
      }
      
      // Filter by date range
      const logDate = new Date(log.created_at);
      
      if (filters.startDate && filters.endDate) {
        return isWithinInterval(logDate, {
          start: startOfDay(filters.startDate),
          end: endOfDay(filters.endDate),
        });
      }
      
      if (filters.startDate && logDate < startOfDay(filters.startDate)) {
        return false;
      }
      
      if (filters.endDate && logDate > endOfDay(filters.endDate)) {
        return false;
      }
      
      return true;
    });
  }, [logs, filters]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Activity className="h-12 w-12 mb-3 opacity-50" />
        <p className="font-medium">No activity yet</p>
        <p className="text-sm">Team management actions will appear here</p>
      </div>
    );
  }

  return (
    <div>
      <ActivityLogFilters filters={filters} onFiltersChange={setFilters} />
      
      {filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Activity className="h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">No matching activity found</p>
          <p className="text-xs">Try adjusting your filters</p>
        </div>
      ) : (
        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-4">
            {filteredLogs.map((log) => {
              const config = ACTION_CONFIG[log.action as ActivityAction] || {
                icon: Activity,
            label: log.action,
            color: 'text-muted-foreground'
          };
          const Icon = config.icon;
          const performerName = log.performer?.full_name || log.performer?.email || 'Unknown';
          const details = getDetails(log);
          
          // Build description
          let description = '';
          const targetName = (details.target_name as string) || log.target_email || 'a user';
          
          switch (log.action) {
            case 'member_invited':
              description = `invited ${targetName} as ${details.role || 'agent'}`;
              break;
            case 'invitation_cancelled':
              description = `cancelled invitation for ${targetName}`;
              break;
            case 'member_added':
              description = `added ${targetName} as ${details.role || 'agent'}`;
              break;
            case 'member_removed':
              description = `removed ${targetName}`;
              break;
            case 'member_reactivated':
              description = `reactivated ${targetName}`;
              break;
            case 'member_deleted':
              description = `permanently deleted ${targetName}`;
              break;
            case 'role_changed':
              description = `changed ${targetName}'s role to ${details.new_role || 'unknown'}`;
              break;
            case 'bulk_role_changed': {
              const count = details.count || 0;
              description = `changed role to ${details.new_role} for ${count} member${Number(count) > 1 ? 's' : ''}`;
              break;
            }
            case 'bulk_removed': {
              const removeCount = details.count || 0;
              description = `removed ${removeCount} member${Number(removeCount) > 1 ? 's' : ''}`;
              break;
            }
            default:
              description = log.action;
          }

          return (
            <div key={log.id} className="flex items-start gap-3">
              <div className={`p-2 rounded-full bg-muted ${config.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{performerName}</span>
                  {' '}
                  <span className="text-muted-foreground">{description}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
