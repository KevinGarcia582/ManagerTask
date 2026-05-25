import { supabase } from "@/src/lib/supabase";
import { Session } from "@supabase/supabase-js";
import React, { createContext, useEffect, useState } from "react";

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  program: string | null;
  semester: number | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<{ userId: string }>;
  logout: () => Promise<void>;
  updateProfile: (program: string, semester: number, userId?: string, fullName?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session) {
          fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error getting session:", error);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, program, semester")
        .eq("id", userId)
        .single();

      if (error) throw error;

      setUser({
        id: userId,
        email: session?.user.email || "",
        fullName: data.full_name,
        program: data.program,
        semester: data.semester,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!session?.user.id) return;
    await fetchProfile(session.user.id);
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error("No se pudo crear el usuario");

    return { userId: data.user.id };
  };

  const updateProfile = async (program: string, semester: number, userId?: string, fullName?: string) => {
    const id = userId || session?.user.id || (await supabase.auth.getSession()).data.session?.user.id;
    if (!id) throw new Error("No hay sesión activa");

    const name = fullName || user?.fullName;

    const { error } = await supabase
      .from("profiles")
      .update({ program, semester, full_name: name })
      .eq("id", id);

    if (error) throw error;

    await refreshProfile();
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, login, register, logout, updateProfile, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
