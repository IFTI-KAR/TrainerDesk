import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { queryClient } from '../lib/queryClient';
import { useTheme } from './ThemeContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [trainer, setTrainer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setTheme } = useTheme();

  const syncTrainerTheme = useCallback(
    (loadedTrainer) => {
      const prefTheme = loadedTrainer?.preferences?.theme;
      if (prefTheme === 'light' || prefTheme === 'dark' || prefTheme === 'system') {
        try {
          if (!localStorage.getItem('td_theme')) {
            setTheme(prefTheme);
          }
        } catch (_err) {
          setTheme(prefTheme);
        }
      }
    },
    [setTheme]
  );

  useEffect(() => {
    let active = true;

    async function fetchSession() {
      try {
        const res = await api.get('/auth/me');
        if (active) {
          const loaded = res.data?.data?.trainer || null;
          setTrainer(loaded);
          syncTrainerTheme(loaded);
        }
      } catch (_err) {
        if (active) setTrainer(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchSession();

    const handleAuthExpired = () => {
      setTrainer(null);
      queryClient.clear();
    };

    window.addEventListener('td:auth-expired', handleAuthExpired);
    return () => {
      active = false;
      window.removeEventListener('td:auth-expired', handleAuthExpired);
    };
  }, [syncTrainerTheme]);

  const login = useCallback(
    async (credentials) => {
      const res = await api.post('/auth/login', credentials);
      const nextTrainer = res.data.data.trainer;
      setTrainer(nextTrainer);
      syncTrainerTheme(nextTrainer);
      return nextTrainer;
    },
    [syncTrainerTheme]
  );

  const register = useCallback(async (payload) => {
    const res = await api.post('/auth/register', payload);
    const nextTrainer = res.data.data.trainer;
    setTrainer(nextTrainer);
    return nextTrainer;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setTrainer(null);
      queryClient.clear();
    }
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const res = await api.patch('/auth/me', updates);
    const nextTrainer = res.data.data.trainer;
    setTrainer(nextTrainer);
    return nextTrainer;
  }, []);

  const changePassword = useCallback(async (payload) => {
    const res = await api.patch('/auth/password', payload);
    if (res.data?.data?.trainer) {
      setTrainer(res.data.data.trainer);
    }
    return res.data;
  }, []);

  const value = useMemo(
    () => ({
      trainer,
      isLoading,
      isAuthenticated: Boolean(trainer),
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      setTrainer,
    }),
    [trainer, isLoading, login, register, logout, updateProfile, changePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
