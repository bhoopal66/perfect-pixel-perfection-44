import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccountStore } from '@/stores/accountStore';
import { useEffect } from 'react';

export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'archived';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export interface Contact {
  id: string;
  organization_id: string;
  whatsapp_account_id: string;
  phone_number: string;
  display_name: string | null;
  profile_picture_url: string | null;
  is_blocked: boolean;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  organization_id: string;
  whatsapp_account_id: string;
  contact_id: string;
  status: ConversationStatus;
  assigned_to: string | null;
  priority: Priority;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
  contact?: Contact;
}

export type MessageDirection = 'inbound' | 'outbound';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  conversation_id: string;
  whatsapp_message_id: string | null;
  direction: MessageDirection;
  message_type: MessageType;
  content: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  status: MessageStatus;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type ConversationFilter = 'all' | 'unread' | 'assigned' | 'unassigned';

export function useConversations(filter: ConversationFilter = 'all') {
  const { selectedAccountId } = useAccountStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['conversations', selectedAccountId, filter],
    queryFn: async () => {
      let query = supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts(*)
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (selectedAccountId) {
        query = query.eq('whatsapp_account_id', selectedAccountId);
      }

      if (filter === 'unread') {
        query = query.gt('unread_count', 0);
      } else if (filter === 'assigned') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq('assigned_to', user.id);
        }
      } else if (filter === 'unassigned') {
        query = query.is('assigned_to', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Conversation[];
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useConversation(conversationId: string | null) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts(*)
        `)
        .eq('id', conversationId)
        .maybeSingle();

      if (error) throw error;
      return data as Conversation | null;
    },
    enabled: !!conversationId,
  });
}

export function useMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
  });

  // Subscribe to realtime messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          queryClient.setQueryData(
            ['messages', conversationId],
            (old: Message[] | undefined) => {
              if (!old) return [payload.new as Message];
              return [...old, payload.new as Message];
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          queryClient.setQueryData(
            ['messages', conversationId],
            (old: Message[] | undefined) => {
              if (!old) return old;
              return old.map((msg) =>
                msg.id === (payload.new as Message).id ? (payload.new as Message) : msg
              );
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return query;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      messageType = 'text',
    }: {
      conversationId: string;
      content: string;
      messageType?: MessageType;
    }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          direction: 'outbound',
          message_type: messageType,
          content,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation's last message
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: content.slice(0, 100),
        })
        .eq('id', conversationId);

      return data as Message;
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Conversation> & { id: string }) => {
      const { data, error } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
