import { useState, useCallback } from 'react';

const AUTH_KEY = 'skct-auth';

export interface AuthUser {
  userId: string;
  name: string;
  className: string;
}

function loadAuth(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(loadAuth);

  const login = useCallback((authUser: AuthUser) => {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_KEY);
    // Clear all skct-* keys from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('skct-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    setUser(null);
  }, []);

  return { user, login, logout };
}
