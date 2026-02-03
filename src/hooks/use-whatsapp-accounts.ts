import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface WhatsAppAccount {
  id: string;
  organization_id: string;
  account_name: string;
  phone_number: string | null;
  display_name: string | null;
  profile_picture_url: string | null;
  is_connected: boolean;
  last_sync_at: string | null;
  connection_token: string | null;
  connection_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserAccountAssignment {
  id: string;
  user_id: string;
  whatsapp_account_id: string;
  is_primary: boolean;
  assigned_at: string;
  assigned_by: string | null;
  whatsapp_account?: WhatsAppAccount;
}

// Fetch all WhatsApp accounts for the organization
export function useWhatsAppAccounts() {
  return useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WhatsAppAccount[];
    },
  });
}

// Fetch user's assigned accounts
export function useAssignedAccounts() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['assigned-accounts', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_account_assignments')
        .select(`
          *,
          whatsapp_account:whatsapp_accounts(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data as (UserAccountAssignment & { whatsapp_account: WhatsAppAccount })[];
    },
    enabled: !!user,
  });
}

// Generate a random 6-digit pairing code
function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create a new WhatsApp account
export function useCreateWhatsAppAccount() {
  const queryClient = useQueryClient();
  const { organization, user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ accountName }: { accountName: string }) => {
      if (!organization) throw new Error('No organization found');
      if (!user) throw new Error('Not authenticated');

      const connectionToken = generatePairingCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

      const { data: account, error: accountError } = await supabase
        .from('whatsapp_accounts')
        .insert({
          organization_id: organization.id,
          account_name: accountName,
          connection_token: connectionToken,
          connection_token_expires_at: expiresAt,
        })
        .select()
        .single();

      if (accountError) throw accountError;

      // Auto-assign to the creating user
      const { error: assignError } = await supabase
        .from('user_account_assignments')
        .insert({
          user_id: user.id,
          whatsapp_account_id: account.id,
          is_primary: true,
          assigned_by: user.id,
        });

      if (assignError) throw assignError;

      return { ...account, connection_token: connectionToken } as WhatsAppAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-accounts'] });
    },
  });
}

// Regenerate pairing code for an account
export function useRegeneratePairingCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const connectionToken = generatePairingCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .update({
          connection_token: connectionToken,
          connection_token_expires_at: expiresAt,
        })
        .eq('id', accountId)
        .select()
        .single();

      if (error) throw error;
      return data as WhatsAppAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
    },
  });
}

// Disconnect an account
export function useDisconnectAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .update({
          is_connected: false,
          connection_token: null,
          connection_token_expires_at: null,
        })
        .eq('id', accountId)
        .select()
        .single();

      if (error) throw error;
      return data as WhatsAppAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-accounts'] });
    },
  });
}

// Update an account
export function useUpdateWhatsAppAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accountId,
      accountName,
      displayName,
    }: {
      accountId: string;
      accountName: string;
      displayName: string | null;
    }) => {
      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .update({
          account_name: accountName,
          display_name: displayName,
        })
        .eq('id', accountId)
        .select()
        .single();

      if (error) throw error;
      return data as WhatsAppAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-accounts'] });
    },
  });
}

// Delete an account
export function useDeleteWhatsAppAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('whatsapp_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-accounts'] });
    },
  });
}
