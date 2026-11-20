export const APP_CONFIG = {
  name: 'مصحف تميمي',
  shortName: 'تميمي',
  version: '1.0.0',
  features: {
    home: true,
    surahIndex: true,
    juzIndex: true,
    mushafReader: true,
    appearanceSettings: true,
    offlineQuran: true,
    arabicEnglish: true,
    tafsir: true,
    irab: true,
    bookmarks: true,
    search: true,
    audio: true,
    tajweed: false,
    sync: false,
    notifications: false,
  },
  quranCorpus: {
    source: 'quran-json v3.1.2',
    narration: 'Hafs an Asim',
    surahCount: 114,
    ayahCount: 6236,
    license: 'CC BY-SA 4.0',
    sourceUrl: 'https://github.com/risan/quran-json/tree/v3.1.2',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    attribution: {
      ar: 'النص العربي: quran-json v3.1.2، بترخيص CC BY-SA 4.0.',
      en: 'Arabic text: quran-json v3.1.2, licensed under CC BY-SA 4.0.',
    },
    englishTranslationIncluded: false,
  },
  commentaryData: {
    included: false,
    sourceCatalogUrl: 'https://qul.tarteel.ai/resources/tafsir',
    reason:
      'No redistribution license has been verified for a specific tafsir or i’rab corpus.',
  },
  recitationAudio: {
    bundled: false,
    provider: 'user-imported-local-files',
    attribution:
      'Audio files are imported by the user and remain on the device. No recitation audio is bundled or redistributed.',
    rightsNotice:
      'Users are responsible for importing audio they are entitled to store and play.',
  },
  tafsirSources: [
    { id: 'al-muyassar', name: { ar: 'التفسير الميسر', en: 'Al-Muyassar' } },
    { id: 'as-saadi', name: { ar: 'تفسير السعدي', en: 'As-Saadi' } },
    { id: 'ibn-kathir', name: { ar: 'تفسير ابن كثير', en: 'Ibn Kathir' } },
  ],
} as const;
