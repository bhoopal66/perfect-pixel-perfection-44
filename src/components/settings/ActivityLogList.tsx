import { useState } from 'react';
import { formatDistanceToNow, startOfDay, endOfDay, format } from 'date-fns';
import { 
  UserPlus, 
  UserMinus, 
  Shield, 
  RefreshCw, 
  Trash2, 
  XCircle,
  Users,
  Activity,
  Download
} from 'lucide-react';
import { useActivityLogs, type ActivityAction, type ActivityLog, type ActivityLogFilters } from '@/hooks/use-activity-log';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ActivityLogFilters as ActivityLogFiltersComponent, type ActivityLogFiltersState } from './ActivityLogFilters';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
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

const PAGE_SIZE = 10;

// Helper to build description for CSV export
function buildDescription(log: ActivityLog): string {
  const details = getDetails(log);
  const targetName = (details.target_name as string) || log.target_email || 'a user';
  
  switch (log.action) {
    case 'member_invited':
      return `invited ${targetName} as ${details.role || 'agent'}`;
    case 'invitation_cancelled':
      return `cancelled invitation for ${targetName}`;
    case 'member_added':
      return `added ${targetName} as ${details.role || 'agent'}`;
    case 'member_removed':
      return `removed ${targetName}`;
    case 'member_reactivated':
      return `reactivated ${targetName}`;
    case 'member_deleted':
      return `permanently deleted ${targetName}`;
    case 'role_changed':
      return `changed ${targetName}'s role to ${details.new_role || 'unknown'}`;
    case 'bulk_role_changed': {
      const count = details.count || 0;
      return `changed role to ${details.new_role} for ${count} member${Number(count) > 1 ? 's' : ''}`;
    }
    case 'bulk_removed': {
      const removeCount = details.count || 0;
      return `removed ${removeCount} member${Number(removeCount) > 1 ? 's' : ''}`;
    }
    default:
      return log.action;
  }
}

export function ActivityLogList() {
  const { organization } = useAuthStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<ActivityLogFiltersState>({
    actionType: 'all',
    startDate: undefined,
    endDate: undefined,
  });

  // Convert UI filter state to API filter format
  const apiFilters: ActivityLogFilters = {
    actionType: filters.actionType,
    startDate: filters.startDate,
    endDate: filters.endDate,
  };

  const { data, isLoading } = useActivityLogs(currentPage, PAGE_SIZE, apiFilters);

  const logs = data?.logs || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Reset to page 1 when filters change
  const handleFiltersChange = (newFilters: ActivityLogFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Export logs to CSV
  const handleExportCSV = async () => {
    if (!organization?.id) return;
    
    setIsExporting(true);
    try {
      // Fetch all logs for export (with filters applied server-side for date range)
      let query = supabase
        .from('team_activity_logs')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (filters.actionType !== 'all') {
        query = query.eq('action', filters.actionType);
      }
      if (filters.startDate) {
        query = query.gte('created_at', startOfDay(filters.startDate).toISOString());
      }
      if (filters.endDate) {
        query = query.lte('created_at', endOfDay(filters.endDate).toISOString());
      }

      const { data: allLogs, error } = await query;
      if (error) throw error;

      // Get performer details
      const performerIds = [...new Set(allLogs.map(log => log.performed_by))];
      const { data: performers } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', performerIds);

      // Build CSV content
      const headers = ['Date', 'Time', 'Performed By', 'Action', 'Description', 'Target Email'];
      const rows = allLogs.map(log => {
        const performer = performers?.find(p => p.user_id === log.performed_by);
        const performerName = performer?.full_name || performer?.email || 'Unknown';
        const logWithPerformer = { ...log, performer } as ActivityLog;
        const description = buildDescription(logWithPerformer);
        const date = new Date(log.created_at);
        
        return [
          format(date, 'yyyy-MM-dd'),
          format(date, 'HH:mm:ss'),
          performerName,
          ACTION_CONFIG[log.action as ActivityAction]?.label || log.action,
          description,
          log.target_email || ''
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `activity-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Activity log exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export activity log');
    } finally {
      setIsExporting(false);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 'ellipsis', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, 'ellipsis', currentPage, 'ellipsis', totalPages);
      }
    }
    return pages;
  };

  if (!logs.length && !isLoading) {
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
      <div className="flex items-center justify-between gap-2 mb-2">
        <ActivityLogFiltersComponent filters={filters} onFiltersChange={handleFiltersChange} />
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={isExporting || (!logs.length && !isLoading)}
          className="shrink-0"
        >
          <Download className="h-4 w-4 mr-1" />
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>
      
      {isLoading ? (
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
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Activity className="h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">No matching activity found</p>
          <p className="text-xs">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {logs.map((log) => {
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

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {getPageNumbers().map((page, idx) => (
                  <PaginationItem key={idx}>
                    {page === 'ellipsis' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
