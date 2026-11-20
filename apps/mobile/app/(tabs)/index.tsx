import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '../../src/components/BrandHeader';
import { SurahCard } from '../../src/components/SurahCard';
import {
  createQuranRepository,
  type ReadingProgress,
  type SurahSummary,
} from '../../src/data/quran-repository';
import { t } from '../../src/i18n';
import { useAppStore } from '../../src/store/app-store';
import { fonts, radii, spacing, themes } from '../../src/theme';
import { toArabicDigits } from '../../src/utils/arabic';

export default function HomeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const repository = useMemo(() => createQuranRepository(db), [db]);
  const language = useAppStore((state) => state.language);
  const theme = useAppStore((state) => state.theme);
  const lastRead = useAppStore((state) => state.lastRead);
  const palette = themes[theme];
  const [surahs, setSurahs] = useState<SurahSummary[]>([]);
  const [savedProgress, setSavedProgress] = useState<ReadingProgress | null>(
    null,
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([repository.listSurahs(), repository.getReadingProgress()])
      .then(([items, progress]) => {
        if (!active) return;
        setSurahs(items);
        setSavedProgress(progress);
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
    };
  }, [repository]);

  const position = savedProgress
    ? {
        surahId: savedProgress.surah_id,
        ayahNumber: savedProgress.ayah_number,
      }
    : lastRead;
  const currentSurah = surahs.find((surah) => surah.id === position.surahId);
  const isRTL = language === 'ar';

  const openReader = useCallback(
    (surahId: number, ayahNumber = 1) => {
      router.push({
        pathname: '/reader/[surahId]',
        params: { surahId: String(surahId), ayah: String(ayahNumber) },
      });
    },
    [router],
  );

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: palette.background }]}
    >
      <BrandHeader
        palette={palette}
        language={language}
        title={t('appName', language)}
        subtitle={t('homeTagline', language)}
        onSettings={() => router.push('/settings')}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.hero,
            {
              backgroundColor: palette.oliveStrong,
              direction: isRTL ? 'rtl' : 'ltr',
            },
          ]}
        >
          <View style={styles.heroCopy}>
            <View style={[styles.offlinePill, { backgroundColor: '#FFFFFF1F' }]}>
              <MaterialCommunityIcons
                name="cloud-off-outline"
                size={15}
                color="#FFFFFF"
              />
              <Text style={styles.offlineText}>
                {t('offlineLabel', language)}
              </Text>
            </View>
            <Text style={styles.heroTitle}>{t('continueReading', language)}</Text>
            <Text style={styles.heroSubtitle}>
              {currentSurah
                ? `${currentSurah.name_ar}  ·  ${t('ayah', language)} ${toArabicDigits(position.ayahNumber)}`
                : t('homeTagline', language)}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => openReader(position.surahId, position.ayahNumber)}
              style={({ pressed }) => [
                styles.continueButton,
                { opacity: pressed ? 0.84 : 1 },
              ]}
            >
              <Text style={[styles.continueButtonText, { color: palette.oliveStrong }]}>
                {t('startReading', language)}
              </Text>
              <MaterialCommunityIcons
                name={isRTL ? 'arrow-left' : 'arrow-right'}
                size={18}
                color={palette.oliveStrong}
              />
            </Pressable>
          </View>
          <View style={styles.heroIllustration}>
            <MaterialCommunityIcons
              name="book-open-page-variant"
              size={80}
              color="#FFFFFFD9"
            />
            <View style={[styles.heroHalo, { borderColor: '#FFFFFF36' }]} />
          </View>
        </View>

        <View style={[styles.shortcutRow, { direction: isRTL ? 'rtl' : 'ltr' }]}>
          <Shortcut
            palette={palette}
            language={language}
            icon="view-list-outline"
            title={t('browseIndex', language)}
            onPress={() => router.push('/quran')}
          />
          <Shortcut
            palette={palette}
            language={language}
            icon="format-size"
            title={t('settings', language)}
            onPress={() => router.push('/settings')}
          />
        </View>

        <View style={[styles.sectionHeading, { direction: isRTL ? 'rtl' : 'ltr' }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {t('allSurahs', language)}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/quran')}
            hitSlop={8}
          >
            <Text style={[styles.viewAll, { color: palette.olive }]}>
              {t('viewAll', language)}
            </Text>
          </Pressable>
        </View>

        {error ? (
          <Text style={[styles.error, { color: palette.oliveStrong }]}>
            {t('loadError', language)}
          </Text>
        ) : (
          <View style={styles.surahList}>
            {surahs.slice(0, 3).map((surah) => (
              <SurahCard
                key={surah.id}
                surah={surah}
                palette={palette}
                language={language}
                onPress={() => openReader(surah.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface ShortcutProps {
  palette: (typeof themes)[keyof typeof themes];
  language: 'ar' | 'en';
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  onPress: () => void;
}

function Shortcut({
  palette,
  language,
  icon,
  title,
  onPress,
}: ShortcutProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.shortcut,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          direction: language === 'ar' ? 'rtl' : 'ltr',
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <View style={[styles.shortcutIcon, { backgroundColor: palette.soft }]}>
        <MaterialCommunityIcons name={icon} size={19} color={palette.olive} />
      </View>
      <Text style={[styles.shortcutText, { color: palette.text }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 1050,
    alignSelf: 'center',
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  hero: {
    minHeight: 230,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    padding: spacing.lg,
    borderRadius: radii.lg,
  },
  heroCopy: {
    flex: 1,
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  offlineText: {
    color: '#FFFFFF',
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 23,
    textAlign: 'auto',
  },
  heroSubtitle: {
    color: '#FFFFFFC7',
    fontFamily: fonts.interface,
    fontSize: 14,
    textAlign: 'auto',
  },
  continueButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.xs,
    paddingHorizontal: 15,
    borderRadius: radii.pill,
    backgroundColor: '#F6F2E6',
  },
  continueButtonText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  heroIllustration: {
    width: 100,
    height: 125,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: spacing.sm,
  },
  heroHalo: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderWidth: 1,
    borderRadius: 54,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shortcut: {
    flex: 1,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  shortcutIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  shortcutText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    textAlign: 'auto',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  viewAll: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  surahList: {
    gap: spacing.sm,
  },
  error: {
    fontFamily: fonts.interface,
    textAlign: 'center',
    padding: spacing.md,
  },
});
