import { useState, useEffect } from 'react';
import { ThemeMode } from '../types';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('app_theme_mode');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return 'dark'; // Dark Elegance по умолчанию для корпоративного стиля
  });

  useEffect(() => {
    localStorage.setItem('app_theme_mode', theme);
    const root = document.documentElement;

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
        root.classList.add('dark-elegance');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.classList.remove('dark-elegance');
        root.style.colorScheme = 'light';
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [theme]);

  return { theme, setTheme };
}
