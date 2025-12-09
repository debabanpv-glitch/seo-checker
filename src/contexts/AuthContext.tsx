'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUser, hasPermission, Permission } from '@/types/auth';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkPermission: (permission: Permission) => boolean;
  canAccessProject: (projectId: string) => boolean;
  canAccessTask: (pic: string | null, projectId: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Login
  const login = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setUser(data.user);
        return { success: true };
      }

      return { success: false, error: data.error || 'Đăng nhập thất bại' };
    } catch {
      return { success: false, error: 'Có lỗi xảy ra' };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  // Check permission
  const checkPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  // Check if user can access project
  const canAccessProject = (projectId: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'seo') return true;
    // Member chỉ xem project của mình
    return user.project_ids.includes(projectId);
  };

  // Check if user can access task
  const canAccessTask = (pic: string | null, projectId: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'seo') return true;
    // Member chỉ xem task của mình hoặc trong dự án của mình
    if (user.pic_name && pic === user.pic_name) return true;
    return user.project_ids.includes(projectId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        checkPermission,
        canAccessProject,
        canAccessTask,
        refreshUser,
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
