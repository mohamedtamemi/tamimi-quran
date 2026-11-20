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
    featureSuggestions: true,
    tajweed: false,
    sync: false,
    notifications: true,
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
    provider: 'QuranicAudio.com direct streams and user-imported local files',
    attribution:
      'Online recordings stream directly from QuranicAudio.com and are attributed to Quran Foundation and the named reciter. No recitation audio is bundled or re-hosted.',
    rightsNotice:
      'Online streaming requires internet and is for personal use under QuranicAudio.com terms. Offline audio remains limited to user-imported files the user is entitled to store.',
    sourceUrl: 'https://quranicaudio.com/about',
  },
  dailyReminder: {
    enabled: true,
    localOnly: true,
    defaultHour: 20,
  },
  featureFeedback: {
    enabled: true,
    issueListUrl: 'https://github.com/mohamedtamemi/tamimi-quran/issues',
    newIssueUrl: 'https://github.com/mohamedtamemi/tamimi-quran/issues/new',
    submissionRequiresUserAction: true,
  },
  tafsirSources: [
    { id: 'al-muyassar', name: { ar: 'التفسير الميسر', en: 'Al-Muyassar' } },
    { id: 'as-saadi', name: { ar: 'تفسير السعدي', en: 'As-Saadi' } },
    { id: 'ibn-kathir', name: { ar: 'تفسير ابن كثير', en: 'Ibn Kathir' } },
  ],
} as const;
