import type { Language } from '../i18n';

export async function scheduleDailyReadingReminder(
  _language: Language,
): Promise<boolean> {
  throw new Error('No platform-specific notification implementation is available.');
}

export async function cancelDailyReadingReminder(): Promise<void> {
  throw new Error('No platform-specific notification implementation is available.');
}
