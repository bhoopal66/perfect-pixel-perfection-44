import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccountStore } from '@/stores/accountStore';
import { useEffect } from 'react';

export interface Contact {
  id: string;
  organization_id: string;
  whatsapp_account_id: string;
  phone_number: string;
  display_name: string | null;
  profile_picture_url: string | null;
  is_blocked: boolean;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ContactFilter = 'all' | 'blocked' | 'recent';

export function useContacts(filter: ContactFilter = 'all', searchQuery: string = '', selectedTags: string[] = []) {
  const { selectedAccountId } = useAccountStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['contacts', selectedAccountId, filter, searchQuery, selectedTags],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (selectedAccountId) {
        query = query.eq('whatsapp_account_id', selectedAccountId);
      }

      if (filter === 'blocked') {
        query = query.eq('is_blocked', true);
      } else if (filter === 'recent') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        query = query.gte('updated_at', oneWeekAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      let contacts = data as Contact[];

      // Client-side search filtering
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        contacts = contacts.filter((contact) => {
          const name = contact.display_name?.toLowerCase() || '';
          const phone = contact.phone_number.toLowerCase();
          const notes = contact.notes?.toLowerCase() || '';
          return name.includes(lowerQuery) || phone.includes(lowerQuery) || notes.includes(lowerQuery);
        });
      }

      // Client-side tag filtering
      if (selectedTags.length > 0) {
        contacts = contacts.filter((contact) => {
          if (!contact.tags) return false;
          return selectedTags.some((tag) => contact.tags?.includes(tag));
        });
      }

      return contacts;
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('contacts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['contacts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useContact(contactId: string | null) {
  return useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      if (!contactId) return null;

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .maybeSingle();

      if (error) throw error;
      return data as Contact | null;
    },
    enabled: !!contactId,
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contact> & { id: string }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useAllTags() {
  const { selectedAccountId } = useAccountStore();

  return useQuery({
    queryKey: ['contact-tags', selectedAccountId],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('tags');

      if (selectedAccountId) {
        query = query.eq('whatsapp_account_id', selectedAccountId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Extract unique tags
      const allTags = new Set<string>();
      data?.forEach((contact) => {
        contact.tags?.forEach((tag: string) => allTags.add(tag));
      });

      return Array.from(allTags).sort();
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}
