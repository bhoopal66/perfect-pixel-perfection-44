import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useSendWaMessage } from './use-whatsapp-api';

export interface WaConversation {
  id: string;
  organization_id: string;
  session_id: string;
  phone: string;
  contact_name: string | null;
  contact_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  status: string | null;
  channel: string | null;
  assigned_to: string | null;
  created_at: string | null;
  updated_at: string | null;
  contact?: {
    id: string;
    phone_number: string;
    display_name: string | null;
    profile_picture_url: string | null;
  } | null;
}

export interface WaMessage {
  id: string;
  message_id: string;
  session_id: string;
  organization_id: string;
  from_me: boolean | null;
  sender_phone: string | null;
  sender_name: string | null;
  recipient_phone: string | null;
  body: string | null;
  message_type: string | null;
  media_url: string | null;
  status: string | null;
  timestamp: string;
  jid: string | null;
  metadata: unknown;
  created_at: string | null;
}

export type WaConversationFilter = 'all' | 'unread' | 'assigned' | 'unassigned';

export function useWaConversationList(filter: WaConversationFilter = 'all') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wa-conversations', filter],
    queryFn: async () => {
      let q = supabase
        .from('wa_conversations')
        .select('*, contact:contacts(*)')
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (filter === 'unread') {
        q = q.gt('unread_count', 0);
      } else if (filter === 'assigned') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) q = q.eq('assigned_to', user.id);
      } else if (filter === 'unassigned') {
        q = q.is('assigned_to', null);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as WaConversation[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('wa-conv-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_conversations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['wa-conversations'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

export function useWaConversation(conversationId: string | null) {
  return useQuery({
    queryKey: ['wa-conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const { data, error } = await supabase
        .from('wa_conversations')
        .select('*, contact:contacts(*)')
        .eq('id', conversationId)
        .maybeSingle();
      if (error) throw error;
      return data as WaConversation | null;
    },
    enabled: !!conversationId,
  });
}

export function useWaMessageList(conversationId: string | null) {
  const queryClient = useQueryClient();

  // First get the conversation to know session_id & phone
  const { data: conv } = useWaConversation(conversationId);

  const query = useQuery({
    queryKey: ['wa-conv-messages', conversationId],
    queryFn: async () => {
      if (!conv) return [];

      const { data, error } = await supabase
        .from('wa_messages')
        .select('*')
        .eq('session_id', conv.session_id)
        .or(`sender_phone.eq.${conv.phone},recipient_phone.eq.${conv.phone}`)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data as WaMessage[];
    },
    enabled: !!conv,
  });

  // Realtime
  useEffect(() => {
    if (!conv) return;
    const channel = supabase
      .channel(`wa-msgs-${conv.session_id}-${conv.phone}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'wa_messages',
        filter: `session_id=eq.${conv.session_id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['wa-conv-messages', conversationId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conv, conversationId, queryClient]);

  return query;
}

export function useSendWaConversationMessage() {
  const sendWa = useSendWaMessage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversation, text }: { conversation: WaConversation; text: string }) => {
      return sendWa.mutateAsync({
        sessionId: conversation.session_id,
        to: conversation.phone,
        text,
      });
    },
    onSuccess: (_, { conversation }) => {
      queryClient.invalidateQueries({ queryKey: ['wa-conv-messages', conversation.id] });
      queryClient.invalidateQueries({ queryKey: ['wa-conversations'] });
    },
  });
}

export function useUpdateWaConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WaConversation> & { id: string }) => {
      const { data, error } = await supabase
        .from('wa_conversations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wa-conversations'] });
    },
  });
}

export function useMarkWaConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('wa_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wa-conversations'] });
    },
  });
}
