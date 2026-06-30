import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { ThemeMode } from '../types';
import { StorageService } from '../services/storage.service';
import { STORAGE_KEYS } from '../utils/constants';

interface ThemeContextProps {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextProps>({
  themeMode: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      const storedTheme = await StorageService.get<ThemeMode>(STORAGE_KEYS.THEME);
      if (storedTheme) {
        setThemeModeState(storedTheme);
      }
      setIsLoaded(true);
    };
    loadTheme();
  }, []);

  const setTheme = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await StorageService.set(STORAGE_KEYS.THEME, mode);
  };

  const toggleTheme = async () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    await setTheme(newMode);
  };

  if (!isLoaded) return null; // Prevent flicker

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
