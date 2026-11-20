import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AndroidImportance,
  IosAuthorizationStatus,
  SchedulableTriggerInputTypes,
  cancelScheduledNotificationAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
} from 'expo-notifications';
import { Platform } from 'react-native';

import type { Language } from '../i18n';

const REMINDER_ID_KEY = 'tamimi-mushaf-daily-reminder-id';
const REMINDER_CHANNEL_ID = 'daily-reading';
const REMINDER_HOUR = 20;

export async function scheduleDailyReadingReminder(
  language: Language,
): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  if (Platform.OS === 'android') {
    await setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: language === 'ar' ? 'تذكير الورد اليومي' : 'Daily reading reminder',
      importance: AndroidImportance.DEFAULT,
    });
  }

  const currentPermission = await getPermissionsAsync();
  const permission =
    currentPermission.granted ||
    currentPermission.ios?.status === IosAuthorizationStatus.PROVISIONAL
      ? currentPermission
      : await requestPermissionsAsync();
  if (!permission.granted) return false;

  await cancelDailyReadingReminder();
  const identifier = await scheduleNotificationAsync({
    content: {
      title: language === 'ar' ? 'موعد وردك اليومي' : 'Your daily reading time',
      body:
        language === 'ar'
          ? 'افتح مصحف تميمي وتابع قراءتك.'
          : 'Open Tamimi Mushaf and continue reading.',
      data: { url: '/(tabs)' },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: REMINDER_HOUR,
      minute: 0,
      ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {}),
    },
  });

  try {
    await AsyncStorage.setItem(REMINDER_ID_KEY, identifier);
  } catch (error) {
    await cancelScheduledNotificationAsync(identifier);
    throw error;
  }
  return true;
}

export async function cancelDailyReadingReminder(): Promise<void> {
  const identifier = await AsyncStorage.getItem(REMINDER_ID_KEY);
  if (!identifier) return;
  await cancelScheduledNotificationAsync(identifier);
  await AsyncStorage.removeItem(REMINDER_ID_KEY);
}
