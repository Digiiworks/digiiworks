import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

type AppRole = 'admin' | 'editor' | 'client';

const INACTIVITY_WARN_MS = 25 * 60 * 1000;  // 25 minutes
const INACTIVITY_LOGOUT_MS = 30 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL_MS = 60 * 1000;          // check every 60 seconds

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  profile: { display_name: string | null; email: string | null; avatar_url: string | null } | null;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isClient: boolean;
  signOut: () => Promise<void>;
  dismissInactivityWarning: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);

  const lastActivityRef = useRef(Date.now());
  const warnedRef = useRef(false);
  const userRef = useRef<User | null>(null);

  const fetchUserData = async (userId: string) => {
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('profiles').select('display_name, email, avatar_url').eq('user_id', userId).single(),
    ]);

    if (rolesRes.data) {
      setRoles(rolesRes.data.map((r: any) => r.role as AppRole));
    }
    if (profileRes.data) {
      setProfile(profileRes.data);
    }
  };

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    setProfile(null);
    warnedRef.current = false;
  }, []);

  const dismissInactivityWarning = useCallback(() => {
    lastActivityRef.current = Date.now();
    warnedRef.current = false;
  }, []);

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      warnedRef.current = false;
    };
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, []);

  // Inactivity check interval — only active when a user is signed in
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!userRef.current) return;
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= INACTIVITY_LOGOUT_MS) {
        signOut();
        toast.error('You have been signed out due to inactivity.');
      } else if (idle >= INACTIVITY_WARN_MS && !warnedRef.current) {
        warnedRef.current = true;
        toast.warning("You'll be signed out in 5 minutes due to inactivity.", {
          duration: 5 * 60 * 1000,
          action: {
            label: 'Stay signed in',
            onClick: dismissInactivityWarning,
          },
        });
      }
    }, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [signOut, dismissInactivityWarning]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Defer data fetch to avoid Supabase deadlock
        setTimeout(() => fetchUserData(session.user.id), 0);
      } else {
        setRoles([]);
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      roles,
      profile,
      hasRole,
      isAdmin: hasRole('admin'),
      isEditor: hasRole('editor'),
      isClient: hasRole('client'),
      signOut,
      dismissInactivityWarning,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
