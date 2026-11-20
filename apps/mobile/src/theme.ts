import type { BookmarkColor } from './data/quran-repository';

export type ThemeMode = 'paper' | 'light' | 'dark';

export interface Palette {
  background: string;
  surface: string;
  paper: string;
  text: string;
  muted: string;
  olive: string;
  oliveStrong: string;
  gold: string;
  border: string;
  soft: string;
  tab: string;
  statusBar: 'light' | 'dark';
}

export const themes: Record<ThemeMode, Palette> = {
  paper: {
    background: '#F6F2E6',
    surface: '#FFFEFA',
    paper: '#FFFDF7',
    text: '#29291F',
    muted: '#777565',
    olive: '#627536',
    oliveStrong: '#465927',
    gold: '#B49A5A',
    border: '#E8E0CC',
    soft: '#EDE8D8',
    tab: '#FAF8F1',
    statusBar: 'dark',
  },
  light: {
    background: '#F7F8F3',
    surface: '#FFFFFF',
    paper: '#FFFEFA',
    text: '#252820',
    muted: '#74786E',
    olive: '#627536',
    oliveStrong: '#465927',
    gold: '#B49A5A',
    border: '#E6E9DF',
    soft: '#EEF1E8',
    tab: '#FFFFFF',
    statusBar: 'dark',
  },
  dark: {
    background: '#161B14',
    surface: '#20271C',
    paper: '#22291E',
    text: '#F2F0E7',
    muted: '#B0B5A4',
    olive: '#B5C77C',
    oliveStrong: '#D5E4A4',
    gold: '#D0B873',
    border: '#38412D',
    soft: '#293222',
    tab: '#20271C',
    statusBar: 'light',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const fonts = {
  interface: 'Tajawal_400Regular',
  medium: 'Tajawal_500Medium',
  bold: 'Tajawal_700Bold',
  quran: 'AmiriQuran_400Regular',
} as const;

export const bookmarkColors: Record<BookmarkColor, string> = {
  olive: '#627536',
  gold: '#B49A5A',
  blue: '#4C7595',
  rose: '#B56C72',
};
