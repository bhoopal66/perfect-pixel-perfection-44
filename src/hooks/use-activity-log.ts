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

export function useActivityLogs(limit = 50) {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['activity-logs', organization?.id, limit],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data: logs, error } = await supabase
        .from('team_activity_logs')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Get performer details
      const performerIds = [...new Set(logs.map(log => log.performed_by))];
      const { data: performers } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', performerIds);

      // Combine logs with performer info
      return logs.map(log => ({
        ...log,
        performer: performers?.find(p => p.user_id === log.performed_by),
      })) as ActivityLog[];
    },
    enabled: !!organization?.id,
  });
}

export function useInvalidateActivityLogs() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
}
