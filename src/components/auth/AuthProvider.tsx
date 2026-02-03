import { useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    setUser, 
    setSession, 
    setIsLoading, 
    setIsInitialized,
    fetchProfile,
    reset 
  } = useAuthStore();

  useEffect(() => {
    // Set up auth state change listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event);
        
        if (session?.user) {
          setUser(session.user);
          setSession(session);
          
          // Defer profile fetch to avoid blocking
          setTimeout(() => fetchProfile(), 0);
          
          // Redirect to dashboard if on auth pages
          if (location.pathname === '/login' || location.pathname === '/signup') {
            navigate('/dashboard');
          }
        } else {
          reset();
          
          // Redirect to login if not on public pages
          const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password'];
          if (!publicPaths.includes(location.pathname)) {
            navigate('/login');
          }
        }
        
        setIsLoading(false);
        setIsInitialized(true);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setSession(session);
        fetchProfile();
      }
      setIsLoading(false);
      setIsInitialized(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
