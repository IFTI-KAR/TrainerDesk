import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'td_theme';

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch (_err) {
      // Ignore storage access errors
    }
    return 'system';
  });

  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setSystemTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_err) {
      // Ignore storage write errors
    }
  }, [theme, resolvedTheme]);

  const setTheme = (nextTheme) => {
    if (nextTheme === 'light' || nextTheme === 'dark' || nextTheme === 'system') {
      setThemeState(nextTheme);
    }
  };

  const toggleTheme = () => {
    setThemeState(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
