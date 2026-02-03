import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccountStore } from '@/stores/accountStore';
import { useEffect } from 'react';

export interface PipelineConversation {
  id: string;
  organization_id: string;
  whatsapp_account_id: string;
  contact_id: string;
  status: string;
  priority: string | null;
  pipeline_stage: string;
  deal_value: number;
  unread_count: number;
  last_message_preview: string | null;
  last_message_at: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  contact: {
    id: string;
    display_name: string | null;
    phone_number: string;
    profile_picture_url: string | null;
    tags: string[] | null;
  } | null;
}

export const PIPELINE_STAGES = [
  { id: 'new_lead', name: 'New Lead', color: 'bg-blue-500' },
  { id: 'qualified', name: 'Qualified', color: 'bg-yellow-500' },
  { id: 'proposal', name: 'Proposal', color: 'bg-purple-500' },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-orange-500' },
  { id: 'closed_won', name: 'Closed Won', color: 'bg-emerald-500' },
  { id: 'closed_lost', name: 'Closed Lost', color: 'bg-destructive' },
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number]['id'];

export function usePipelineConversations() {
  const { selectedAccountId } = useAccountStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pipeline-conversations', selectedAccountId],
    queryFn: async () => {
      let queryBuilder = supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts(
            id,
            display_name,
            phone_number,
            profile_picture_url,
            tags
          )
        `)
        .order('updated_at', { ascending: false });

      if (selectedAccountId) {
        queryBuilder = queryBuilder.eq('whatsapp_account_id', selectedAccountId);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;

      return data as PipelineConversation[];
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('pipeline-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pipeline-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useUpdatePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      stage, 
      dealValue 
    }: { 
      conversationId: string; 
      stage: PipelineStage;
      dealValue?: number;
    }) => {
      const updates: Record<string, unknown> = { pipeline_stage: stage };
      if (dealValue !== undefined) {
        updates.deal_value = dealValue;
      }

      const { data, error } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-conversations'] });
    },
  });
}

export interface CreateDealInput {
  contactId: string;
  dealValue: number;
  pipelineStage: string;
  priority?: string;
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  const { selectedAccountId } = useAccountStore();

  return useMutation({
    mutationFn: async (input: CreateDealInput) => {
      // Get user's organization_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      // Get the contact to get its whatsapp_account_id
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('whatsapp_account_id')
        .eq('id', input.contactId)
        .single();

      if (contactError || !contact) throw new Error('Contact not found');

      // Check if a conversation already exists for this contact
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('contact_id', input.contactId)
        .maybeSingle();

      if (existingConv) {
        // Update the existing conversation with deal info
        const { data, error } = await supabase
          .from('conversations')
          .update({
            deal_value: input.dealValue,
            pipeline_stage: input.pipelineStage,
            priority: input.priority || 'normal',
          })
          .eq('id', existingConv.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // Create new conversation as a deal
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          organization_id: profile.organization_id,
          whatsapp_account_id: contact.whatsapp_account_id,
          contact_id: input.contactId,
          deal_value: input.dealValue,
          pipeline_stage: input.pipelineStage,
          priority: input.priority || 'normal',
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function usePipelineStats() {
  const { data: conversations } = usePipelineConversations();

  const stats = {
    totalPipeline: 0,
    avgDealValue: 0,
    winRate: 0,
    activeDeals: 0,
  };

  if (conversations && conversations.length > 0) {
    const activeConversations = conversations.filter(
      (c) => c.pipeline_stage !== 'closed_won' && c.pipeline_stage !== 'closed_lost'
    );
    const wonConversations = conversations.filter((c) => c.pipeline_stage === 'closed_won');
    const closedConversations = conversations.filter(
      (c) => c.pipeline_stage === 'closed_won' || c.pipeline_stage === 'closed_lost'
    );

    stats.activeDeals = activeConversations.length;
    stats.totalPipeline = activeConversations.reduce((sum, c) => sum + (c.deal_value || 0), 0);
    
    if (activeConversations.length > 0) {
      stats.avgDealValue = stats.totalPipeline / activeConversations.length;
    }
    
    if (closedConversations.length > 0) {
      stats.winRate = (wonConversations.length / closedConversations.length) * 100;
    }
  }

  return stats;
}
