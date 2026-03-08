import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'admin' | 'editor' | 'client';

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

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    setProfile(null);
  };

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
    }}>
      {children}
    </AuthContext.Provider>
  );
};
