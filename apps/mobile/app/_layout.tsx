import { AmiriQuran_400Regular } from '@expo-google-fonts/amiri-quran';
import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
} from '@expo-google-fonts/tajawal';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { initializeDatabase } from '../src/data/quran-repository';
import { RecitationProvider } from '../src/audio/RecitationProvider';
import '../src/notifications/notification-handler';
import { useAppStore } from '../src/store/app-store';
import { themes } from '../src/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    AmiriQuran_400Regular,
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
  });
  const theme = useAppStore((state) => state.theme);
  const language = useAppStore((state) => state.language);
  const palette = themes[theme];

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [language]);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SQLiteProvider
      databaseName="quran.db"
      assetSource={{ assetId: require('../assets/quran.db') }}
      onInit={initializeDatabase}
    >
      <RecitationProvider>
        <StatusBar style={palette.statusBar} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.background },
            animation: 'fade_from_bottom',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="reader/[surahId]" />
        </Stack>
      </RecitationProvider>
    </SQLiteProvider>
  );
}
