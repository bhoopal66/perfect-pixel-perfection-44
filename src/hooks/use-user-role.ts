import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Enums } from '@/integrations/supabase/types';

type AppRole = Enums<'app_role'>;

interface UseUserRoleResult {
  role: AppRole | null;
  isAdmin: boolean;
  isManager: boolean;
  isAgent: boolean;
  isLoading: boolean;
}

export function useUserRole(): UseUserRoleResult {
  const { user } = useAuthStore();

  const { data: role, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // User might not have a role yet
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data?.role as AppRole;
    },
    enabled: !!user?.id,
  });

  return {
    role: role ?? null,
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isAgent: role === 'agent',
    isLoading,
  };
}
