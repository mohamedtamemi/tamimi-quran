import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '../../src/components/BrandHeader';
import { SurahCard } from '../../src/components/SurahCard';
import {
  createQuranRepository,
  type JuzStart,
  type SurahSummary,
} from '../../src/data/quran-repository';
import { t } from '../../src/i18n';
import { useAppStore } from '../../src/store/app-store';
import { fonts, radii, spacing, themes } from '../../src/theme';
import { toArabicDigits } from '../../src/utils/arabic';

type IndexTab = 'surahs' | 'juz';

export default function QuranIndexScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const repository = useMemo(() => createQuranRepository(db), [db]);
  const language = useAppStore((state) => state.language);
  const theme = useAppStore((state) => state.theme);
  const palette = themes[theme];
  const { width } = useWindowDimensions();
  const columns = width >= 1050 ? 3 : width >= 680 ? 2 : 1;
  const [activeTab, setActiveTab] = useState<IndexTab>('surahs');
  const [search, setSearch] = useState('');
  const [surahs, setSurahs] = useState<SurahSummary[]>([]);
  const [allSurahs, setAllSurahs] = useState<SurahSummary[]>([]);
  const [juzStarts, setJuzStarts] = useState<JuzStart[]>([]);
  const [completedSearch, setCompletedSearch] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const loading = completedSearch !== search;
  const isRTL = language === 'ar';

  useEffect(() => {
    let active = true;
    Promise.all([
      repository.listSurahs(search),
      repository.listSurahs(),
      repository.listJuzStarts(),
    ])
      .then(([surahItems, allSurahItems, juzItems]) => {
        if (!active) return;
        setSurahs(surahItems);
        setAllSurahs(allSurahItems);
        setJuzStarts(juzItems);
        setError(false);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setCompletedSearch(search);
      });

    return () => {
      active = false;
    };
  }, [repository, search]);

  const openReader = (surahId: number, ayahNumber = 1) => {
    router.push({
      pathname: '/reader/[surahId]',
      params: { surahId: String(surahId), ayah: String(ayahNumber) },
    });
  };

  const availableWidth = Math.min(width, 1050) - spacing.md * 2;
  const itemWidth =
    columns === 1
      ? '100%'
      : (availableWidth - spacing.sm * (columns - 1)) / columns;

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: palette.background }]}
    >
      <BrandHeader
        palette={palette}
        language={language}
        title={t('index', language)}
        subtitle={t('browseIndex', language)}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'surahs' ? (
          <View style={[styles.searchBox, { backgroundColor: palette.surface, borderColor: palette.border, direction: isRTL ? 'rtl' : 'ltr' }]}>
            <MaterialCommunityIcons name="magnify" size={21} color={palette.muted} />
            <TextInput
              accessibilityLabel={t('searchSurah', language)}
              value={search}
              onChangeText={setSearch}
              placeholder={t('searchSurah', language)}
              placeholderTextColor={palette.muted}
              style={[
                styles.searchInput,
                {
                  color: palette.text,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {search.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('search', language)}
                onPress={() => setSearch('')}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="close-circle" size={19} color={palette.muted} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.tabs, { backgroundColor: palette.soft, direction: isRTL ? 'rtl' : 'ltr' }]}>
          {(['surahs', 'juz'] as const).map((tab) => {
            const selected = activeTab === tab;
            return (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tab,
                  selected && { backgroundColor: palette.surface },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: selected ? palette.oliveStrong : palette.muted },
                  ]}
                >
                  {t(tab, language)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <Text style={[styles.message, { color: palette.muted }]}>
            {t('loading', language)}
          </Text>
        ) : error ? (
          <Text style={[styles.message, { color: palette.oliveStrong }]}>
            {t('loadError', language)}
          </Text>
        ) : activeTab === 'surahs' ? (
          surahs.length === 0 ? (
            <Text style={[styles.message, { color: palette.muted }]}>
              {t('emptySearch', language)}
            </Text>
          ) : (
            <View style={[styles.grid, { direction: isRTL ? 'rtl' : 'ltr' }]}>
              {surahs.map((surah) => (
                <View key={surah.id} style={{ width: itemWidth }}>
                  <SurahCard
                    surah={surah}
                    palette={palette}
                    language={language}
                    onPress={() => openReader(surah.id)}
                  />
                </View>
              ))}
            </View>
          )
        ) : (
          <View style={styles.juzList}>
            {juzStarts.map((start) => {
              const surah = allSurahs.find((item) => item.id === start.surah_id);
              const label = surah
                ? language === 'ar'
                  ? surah.name_ar
                  : surah.name_en
                : toArabicDigits(start.surah_id);
              return (
                <Pressable
                  key={start.juz_number}
                  accessibilityRole="button"
                  onPress={() => openReader(start.surah_id, start.ayah_number)}
                  style={({ pressed }) => [
                    styles.juzCard,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      direction: isRTL ? 'rtl' : 'ltr',
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <View style={[styles.juzNumber, { backgroundColor: palette.soft }]}>
                    <Text style={[styles.juzNumberText, { color: palette.oliveStrong }]}>
                      {toArabicDigits(start.juz_number)}
                    </Text>
                  </View>
                  <View style={styles.juzCopy}>
                    <Text style={[styles.juzTitle, { color: palette.text }]}>
                      {t('part', language)} {toArabicDigits(start.juz_number)}
                    </Text>
                    <Text style={[styles.juzDetail, { color: palette.muted }]}>
                      {t('juzStartsAt', language)} {label} · {t('ayah', language)}{' '}
                      {toArabicDigits(start.ayah_number)}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name={isRTL ? 'chevron-left' : 'chevron-right'}
                    size={21}
                    color={palette.muted}
                  />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    gap: spacing.md,
  },
  searchBox: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 0,
    fontFamily: fonts.interface,
    fontSize: 15,
  },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radii.md,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  tabText: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  juzList: {
    gap: spacing.sm,
  },
  juzCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  juzNumber: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  juzNumberText: {
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  juzCopy: {
    flex: 1,
    gap: 2,
  },
  juzTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'auto',
  },
  juzDetail: {
    fontFamily: fonts.interface,
    fontSize: 12,
    textAlign: 'auto',
  },
  message: {
    padding: spacing.xl,
    fontFamily: fonts.interface,
    textAlign: 'center',
  },
});
