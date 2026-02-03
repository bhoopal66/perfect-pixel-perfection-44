import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import type { Tables, Enums } from '@/integrations/supabase/types';

type TeamInvitation = Tables<'team_invitations'>;
type Profile = Tables<'profiles'>;
type UserRole = Tables<'user_roles'>;
type AppRole = Enums<'app_role'>;

export interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  is_active: boolean;
}

export function useTeamInvitations() {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['team-invitations', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TeamInvitation[];
    },
    enabled: !!organization?.id,
  });
}

export function useTeamMembers() {
  const { organization } = useAuthStore();

  return useQuery({
    queryKey: ['team-members', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Get profiles in the organization
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true);

      if (profilesError) throw profilesError;

      // Get roles for these users
      const userIds = profiles.map((p) => p.user_id);
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const members: TeamMember[] = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: userRole?.role || 'agent',
          is_active: profile.is_active,
        };
      });

      return members;
    },
    enabled: !!organization?.id,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  const { organization, user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      if (!organization?.id || !user?.id) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('team_invitations')
        .insert({
          organization_id: organization.id,
          email: email.toLowerCase().trim(),
          role,
          invited_by: user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('An invitation already exists for this email');
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      toast.success('Invitation created! Copy the link to share.');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create invitation');
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      toast.success('Invitation cancelled');
    },
    onError: () => {
      toast.error('Failed to cancel invitation');
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // First check if user already has a role entry
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        // Update existing role - need admin to have UPDATE permission
        // For now, delete and recreate
        await supabase.from('user_roles').delete().eq('user_id', userId);
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Role updated');
    },
    onError: () => {
      toast.error('Failed to update role');
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Deactivate the profile instead of deleting
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false, organization_id: null })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Team member removed');
    },
    onError: () => {
      toast.error('Failed to remove team member');
    },
  });
}

export function generateInviteLink(token: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/signup?invite=${token}`;
}
