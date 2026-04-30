import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AppRole } from '@/types/database';
import {
  authForgotPassword,
  authLogin,
  authMe,
  authResetPassword,
  authSignup,
} from '@/lib/authApi';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null; user?: AuthUser }>;
  signup: (name: string, email: string, password: string, role: AppRole) => Promise<{ error: Error | null; email?: string }>;
  forgotPassword: (email: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ error: Error | null }>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'token';
const USER_STORAGE_KEY = 'user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as AuthUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  });
  const [loading, setLoading] = useState(true);

  const saveToken = (nextToken: string | null) => {
    if (typeof window !== 'undefined') {
      if (nextToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
    setToken(nextToken);
  };

  const saveUser = (nextUser: AuthUser | null) => {
    if (typeof window !== 'undefined') {
      if (nextUser) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
    setUser(nextUser);
  };

  const fetchUser = useCallback(async () => {
    if (!token) {
      saveUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await authMe(token);
      saveUser(data.user);
    } catch {
      saveToken(null);
      saveUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    try {
      const data = await authLogin(email, password);
      saveToken(data.token);
      saveUser(data.user);
      return { error: null, user: data.user };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signup = async (name: string, email: string, password: string, role: AppRole) => {
    try {
      await authSignup(name, email, password, role);
      return { error: null, email };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await authForgotPassword(email);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    try {
      await authResetPassword(email, otp, newPassword);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const logout = () => {
    saveToken(null);
    saveUser(null);
  };

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        login,
        signup,
        forgotPassword,
        resetPassword,
        logout,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
