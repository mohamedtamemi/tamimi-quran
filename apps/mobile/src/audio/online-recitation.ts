import type { RecitationTrack } from '../data/recitation-repository';

export interface OnlineReciter {
  id: number;
  nameAr: string;
  nameEn: string;
  audioBaseUrl: string;
  sourceUrl: string;
}

export const ONLINE_RECITERS: readonly OnlineReciter[] = [
  {
    id: 1,
    nameAr: 'مشاري بن راشد العفاسي',
    nameEn: 'Mishari Rashid al-Afasy',
    audioBaseUrl:
      'https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee/',
    sourceUrl: 'https://quranicaudio.com/quran/5',
  },
  {
    id: 2,
    nameAr: 'محمد صديق المنشاوي',
    nameEn: 'Muhammad Siddiq al-Minshawi',
    audioBaseUrl:
      'https://download.quranicaudio.com/quran/muhammad_siddeeq_al-minshaawee/',
    sourceUrl: 'https://quranicaudio.com/quran/6',
  },
  {
    id: 3,
    nameAr: 'محمود خليل الحصري (إذاعة)',
    nameEn: 'Mahmoud Khaleel al-Husary (broadcast)',
    audioBaseUrl:
      'https://download.quranicaudio.com/quran/mahmood_khaleel_al-husaree_iza3a/',
    sourceUrl: 'https://quranicaudio.com/quran/122',
  },
  {
    id: 4,
    nameAr: 'سعود الشريم',
    nameEn: 'Saud al-Shuraim',
    audioBaseUrl: 'https://download.quranicaudio.com/quran/sa3ood_al-shuraym/',
    sourceUrl: 'https://quranicaudio.com/quran/4',
  },
  {
    id: 5,
    nameAr: 'عبد الرحمن السديس',
    nameEn: 'Abdurrahman as-Sudais',
    audioBaseUrl:
      'https://download.quranicaudio.com/quran/abdurrahmaan_as-sudays/',
    sourceUrl: 'https://quranicaudio.com/quran/7',
  },
  {
    id: 6,
    nameAr: 'ماهر المعيقلي',
    nameEn: 'Maher al-Muaiqly',
    audioBaseUrl:
      'https://download.quranicaudio.com/quran/maher_almu3aiqly/year1440/',
    sourceUrl: 'https://quranicaudio.com/quran/159',
  },
];

export function getOnlineRecitationUrl(
  reciter: OnlineReciter,
  surahId: number,
): string {
  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) {
    throw new RangeError('Surah ID must be an integer from 1 to 114.');
  }
  return `${reciter.audioBaseUrl}${String(surahId).padStart(3, '0')}.mp3`;
}

export function createOnlineTrack(
  reciter: OnlineReciter,
  surah: { id: number; name_ar: string },
): RecitationTrack {
  return {
    id: -reciter.id,
    surah_id: surah.id,
    surah_name_ar: surah.name_ar,
    reciter_name: reciter.nameAr,
    file_uri: getOnlineRecitationUrl(reciter, surah.id),
    file_size: 0,
    added_at: '',
    source: 'stream',
  };
}
