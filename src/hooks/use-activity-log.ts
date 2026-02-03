import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Json } from '@/integrations/supabase/types';

export type ActivityAction = 
  | 'member_invited'
  | 'invitation_cancelled'
  | 'member_added'
  | 'member_removed'
  | 'member_reactivated'
  | 'member_deleted'
  | 'role_changed'
  | 'bulk_role_changed'
  | 'bulk_removed';

export interface ActivityLog {
  id: string;
  organization_id: string;
  performed_by: string;
  action: ActivityAction;
  target_user_id: string | null;
  target_email: string | null;
  details: Json;
  created_at: string;
  performer?: {
    email: string;
    full_name: string | null;
  };
}

export async function logActivity(
  action: ActivityAction,
  targetUserId?: string | null,
  targetEmail?: string | null,
  details: Record<string, string | number | boolean | null> = {}
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.organization_id) return;

  await supabase.from('team_activity_logs').insert([{
    organization_id: profile.organization_id,
    performed_by: user.id,
    action,
    target_user_id: targetUserId || null,
    target_email: targetEmail || null,
    details,
  }]);
}

export interface ActivityLogFilters {
  actionType?: ActivityAction | 'all';
  startDate?: Date;
  endDate?: Date;
}

export function useActivityLogs(
  page = 1, 
  pageSize = 10,
  filters: ActivityLogFilters = {}
) {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['activity-logs', organization?.id, page, pageSize, filters.actionType, filters.startDate?.toISOString(), filters.endDate?.toISOString()],
    queryFn: async () => {
      if (!organization?.id) return { logs: [], totalCount: 0 };

      // Build base query for count
      let countQuery = supabase
        .from('team_activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id);

      // Apply filters to count query
      if (filters.actionType && filters.actionType !== 'all') {
        countQuery = countQuery.eq('action', filters.actionType);
      }
      if (filters.startDate) {
        const startOfDay = new Date(filters.startDate);
        startOfDay.setHours(0, 0, 0, 0);
        countQuery = countQuery.gte('created_at', startOfDay.toISOString());
      }
      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        countQuery = countQuery.lte('created_at', endOfDay.toISOString());
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      // Build paginated query with same filters
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let logsQuery = supabase
        .from('team_activity_logs')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      // Apply filters to logs query
      if (filters.actionType && filters.actionType !== 'all') {
        logsQuery = logsQuery.eq('action', filters.actionType);
      }
      if (filters.startDate) {
        const startOfDay = new Date(filters.startDate);
        startOfDay.setHours(0, 0, 0, 0);
        logsQuery = logsQuery.gte('created_at', startOfDay.toISOString());
      }
      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        logsQuery = logsQuery.lte('created_at', endOfDay.toISOString());
      }

      const { data: logs, error } = await logsQuery.range(from, to);
      if (error) throw error;

      // Get performer details
      const performerIds = [...new Set(logs.map(log => log.performed_by))];
      const { data: performers } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', performerIds);

      // Combine logs with performer info
      const logsWithPerformers = logs.map(log => ({
        ...log,
        performer: performers?.find(p => p.user_id === log.performed_by),
      })) as ActivityLog[];

      return {
        logs: logsWithPerformers,
        totalCount: count || 0,
      };
    },
    enabled: !!organization?.id,
  });
}

export function useInvalidateActivityLogs() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
}
