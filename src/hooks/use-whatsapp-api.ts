import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const FUNCTION_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/whatsapp-api`;

async function callApi(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${FUNCTION_URL}/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Backend returned non-JSON (HTTP ${res.status}). First 200 chars: ${text.slice(0, 200)}`
    );
  }
  if (!res.ok) throw new Error(data.error || `API error (HTTP ${res.status})`);
  return data;
}

// ---- Sessions ----

export function useWaSessions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wa-sessions'],
    queryFn: () => callApi('sessions'),
    select: (data) => data.sessions || [],
  });

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('wa-sessions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_sessions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['wa-sessions'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

export function useCreateWaSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { sessionId?: string; name?: string }) =>
      callApi('sessions', { method: 'POST', body: JSON.stringify(params) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wa-sessions'] });
    },
  });
}

export function useDeleteWaSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      callApi(`sessions/${sessionId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wa-sessions'] });
    },
  });
}

export function useWaSessionStatus(sessionId: string | null) {
  return useQuery({
    queryKey: ['wa-session-status', sessionId],
    queryFn: () => callApi(`sessions/${sessionId}`),
    enabled: !!sessionId,
    refetchInterval: 5000, // Poll every 5s while active
  });
}

// ---- QR Code ----

export function useWaQrCode(sessionId: string | null) {
  return useQuery({
    queryKey: ['wa-qr', sessionId],
    queryFn: () => callApi(`qr/${sessionId}`),
    enabled: !!sessionId,
    refetchInterval: 15000, // QR refreshes every ~15s in Baileys
    retry: 3,
  });
}

// ---- Send Message ----

export function useSendWaMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      sessionId: string;
      to: string;
      text?: string;
      type?: string;
      caption?: string;
      mediaUrl?: string;
    }) => callApi('send', { method: 'POST', body: JSON.stringify(params) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wa-messages'] });
      queryClient.invalidateQueries({ queryKey: ['wa-conversations'] });
    },
  });
}

// ---- Conversations from DB (wa_conversations) ----

export function useWaConversations() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wa-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wa_conversations')
        .select('*, contact:contacts(*)')
        .order('last_message_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('wa-conversations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_conversations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['wa-conversations'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

// ---- Messages from DB (wa_messages) ----

export function useWaMessages(sessionId: string | null, phone: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wa-messages', sessionId, phone],
    queryFn: async () => {
      if (!sessionId) return [];
      let q = supabase
        .from('wa_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (phone) {
        // Get messages to/from this phone
        q = q.or(`sender_phone.eq.${phone},recipient_phone.eq.${phone}`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`wa-messages-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'wa_messages',
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['wa-messages', sessionId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, queryClient]);

  return query;
}
