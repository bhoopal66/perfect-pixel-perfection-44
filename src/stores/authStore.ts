import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  organization_id: string | null;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

interface Organization {
  id: string;
  name: string;
  settings: Record<string, unknown>;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setOrganization: (organization: Organization | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsInitialized: (isInitialized: boolean) => void;
  fetchProfile: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  organization: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setOrganization: (organization) => set({ organization }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsInitialized: (isInitialized) => set({ isInitialized }),

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      if (profile) {
        set({ profile: profile as Profile });

        // Fetch organization if user has one
        if (profile.organization_id) {
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profile.organization_id)
            .single();

          if (orgError) {
            console.error('Error fetching organization:', orgError);
          } else {
            set({ organization: org as Organization });
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  },

  reset: () => set({
    user: null,
    session: null,
    profile: null,
    organization: null,
    isLoading: false,
  }),
}));
