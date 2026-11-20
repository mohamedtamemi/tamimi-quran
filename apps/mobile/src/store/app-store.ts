import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Language } from '../i18n';
import type { ThemeMode } from '../theme';

export interface ReadingPosition {
  surahId: number;
  ayahNumber: number;
}

interface AppState {
  theme: ThemeMode;
  language: Language;
  fontSize: number;
  lastRead: ReadingPosition;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: Language) => void;
  setFontSize: (fontSize: number) => void;
  setLastRead: (position: ReadingPosition) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'paper',
      language: 'ar',
      fontSize: 24,
      lastRead: { surahId: 1, ayahNumber: 1 },
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLastRead: (lastRead) => set({ lastRead }),
    }),
    {
      name: 'tamimi-mushaf-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        fontSize: state.fontSize,
        lastRead: state.lastRead,
      }),
    },
  ),
);
