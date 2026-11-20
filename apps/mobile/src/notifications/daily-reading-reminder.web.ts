import type { Language } from '../i18n';

export async function scheduleDailyReadingReminder(
  _language: Language,
): Promise<boolean> {
  throw new Error('Local notifications are not supported on web.');
}

export async function cancelDailyReadingReminder(): Promise<void> {
  throw new Error('Local notifications are not supported on web.');
}
