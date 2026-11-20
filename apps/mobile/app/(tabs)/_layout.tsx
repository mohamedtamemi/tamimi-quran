import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { t } from '../../src/i18n';
import { useAppStore } from '../../src/store/app-store';
import { themes } from '../../src/theme';

export default function TabLayout() {
  const language = useAppStore((state) => state.language);
  const theme = useAppStore((state) => state.theme);
  const palette = themes[theme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.olive,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: {
          height: 66,
          paddingTop: 7,
          paddingBottom: 8,
          backgroundColor: palette.tab,
          borderTopColor: palette.border,
        },
        tabBarLabelStyle: {
          fontFamily: 'Tajawal_500Medium',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home', language),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="home-variant-outline"
              color={String(color)}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="quran"
        options={{
          title: t('index', language),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="view-list-outline"
              color={String(color)}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('search', language),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="magnify"
              color={String(color)}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: t('bookmarks', language),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="bookmark-outline"
              color={String(color)}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="audio"
        options={{
          title: t('audio', language),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="headphones"
              color={String(color)}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings', language),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="tune-variant"
              color={String(color)}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
