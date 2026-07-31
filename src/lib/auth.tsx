import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "employee" | "employer";

type User = { id: string; email: string; role?: string; first_name?: string; last_name?: string; phone?: string };
type Session = { access_token: string; user: User | null };

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: Role[];
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, roles: [], loading: true,
  refresh: async () => {}, signOut: async () => {},
});

function extractRoles(user: User | null | undefined): Role[] {
  if (!user?.role) return [];
  return [user.role as Role];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes (fires immediately with stored session)
    const { subscription } = supabase.auth.onAuthStateChange((_evt, s) => {
      const sess = s as Session | null;
      setSession(sess);
      setRoles(extractRoles(sess?.user ?? null));
      setLoading(false);
    });

    // Also read session directly to handle SSR/initial load
    supabase.auth.getSession().then(({ data }) => {
      const sess = data.session as Session | null;
      setSession(sess);
      setRoles(extractRoles(sess?.user ?? null));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    const sess = data.session as Session | null;
    setSession(sess);
    setRoles(extractRoles(sess?.user ?? null));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRoles([]);
  };

  return (
    <Ctx.Provider value={{ user: session?.user ?? null, session, roles, loading, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
