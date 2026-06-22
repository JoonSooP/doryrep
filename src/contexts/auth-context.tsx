"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

type User = {
  id: string;
  loginId: string;
  name: string;
  role: string;
  userType?: string;
  categories?: string;
  mustChangePassword: boolean;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  refresh: () => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  user: null, loading: true, refresh: () => {}, logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => { setUser(data); setLoading(false); })
      .catch(() => { setUser(null); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!fetched.current) {
      fetched.current = true;
      refresh();
    }
  }, [refresh]);

  const logout = async () => {
    await fetch("/api/auth/me", { method: "DELETE" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }

export function useCanEdit() {
  const { user } = useAuth();
  return user?.role === "Editor" || user?.role === "Admin";
}
