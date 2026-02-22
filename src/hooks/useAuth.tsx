import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiRequest, authTokenStore } from "@/lib/api";

interface AuthUser {
  id: string;
  email: string;
}

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  color: number;
}

interface Session {
  access_token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

interface MeResponse {
  user: AuthUser;
  profile: Profile;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
  profile: Profile;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = authTokenStore.get();

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const me = await apiRequest<MeResponse>("/auth/me", { token });
        setUser(me.user);
        setProfile(me.profile);
        setSession({ access_token: token });
      } catch {
        authTokenStore.clear();
        setUser(null);
        setProfile(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: { email, password, displayName },
      });

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const loginData = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });

      authTokenStore.set(loginData.token);
      setUser(loginData.user);
      setProfile(loginData.profile);
      setSession({ access_token: loginData.token });

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    const token = authTokenStore.get();

    try {
      if (token) {
        await apiRequest("/auth/logout", { method: "POST", token });
      }
    } catch {
      // Ignore logout errors because auth is token-based and local clear is enough.
    }

    authTokenStore.clear();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
