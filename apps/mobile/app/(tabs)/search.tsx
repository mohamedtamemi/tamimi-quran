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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '../../src/components/BrandHeader';
import {
  createQuranRepository,
  type SearchResult,
} from '../../src/data/quran-repository';
import { t } from '../../src/i18n';
import { useAppStore } from '../../src/store/app-store';
import { fonts, radii, spacing, themes } from '../../src/theme';
import { normalizeSearch, toArabicDigits } from '../../src/utils/arabic';

export default function SearchScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const repository = useMemo(() => createQuranRepository(db), [db]);
  const language = useAppStore((state) => state.language);
  const theme = useAppStore((state) => state.theme);
  const palette = themes[theme];
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [completedQuery, setCompletedQuery] = useState('');
  const [error, setError] = useState(false);
  const normalizedQuery = normalizeSearch(query);
  const loading = normalizedQuery.length > 0 && completedQuery !== query;
  const isRTL = language === 'ar';

  useEffect(() => {
    let active = true;
    if (!normalizedQuery) {
      return () => {
        active = false;
      };
    }

    repository
      .searchAyahs(query)
      .then((items) => {
        if (!active) return;
        setResults(items);
        setError(false);
        setCompletedQuery(query);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setCompletedQuery(query);
      });

    return () => {
      active = false;
    };
  }, [normalizedQuery, query, repository]);

  const openAyah = (surahId: number, ayahNumber: number) => {
    router.push({
      pathname: '/reader/[surahId]',
      params: { surahId: String(surahId), ayah: String(ayahNumber) },
    });
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: palette.background }]}
    >
      <BrandHeader
        palette={palette}
        language={language}
        title={t('search', language)}
        subtitle={t('searchHint', language)}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              direction: isRTL ? 'rtl' : 'ltr',
            },
          ]}
        >
          <MaterialCommunityIcons name="magnify" size={21} color={palette.muted} />
          <TextInput
            accessibilityLabel={t('searchAyahs', language)}
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchAyahs', language)}
            placeholderTextColor={palette.muted}
            style={[
              styles.searchInput,
              { color: palette.text, textAlign: isRTL ? 'right' : 'left' },
            ]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('close', language)}
              onPress={() => setQuery('')}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={19}
                color={palette.muted}
              />
            </Pressable>
          ) : null}
        </View>

        {normalizedQuery.length === 0 ? (
          <Text style={[styles.message, { color: palette.muted }]}>
            {t('searchPrompt', language)}
          </Text>
        ) : loading ? (
          <Text style={[styles.message, { color: palette.muted }]}>
            {t('loading', language)}
          </Text>
        ) : error ? (
          <Text style={[styles.message, { color: palette.oliveStrong }]}>
            {t('loadError', language)}
          </Text>
        ) : results.length === 0 ? (
          <Text style={[styles.message, { color: palette.muted }]}>
            {t('emptySearch', language)}
          </Text>
        ) : (
          <View style={styles.results}>
            <Text
              style={[
                styles.resultCount,
                { color: palette.muted, textAlign: isRTL ? 'right' : 'left' },
              ]}
            >
              {t('searchResults', language)} · {toArabicDigits(results.length)}
            </Text>
            {results.length === 100 ? (
              <Text style={[styles.resultCount, { color: palette.muted }]}>
                {t('searchLimit', language)}
              </Text>
            ) : null}
            {results.map((result) => (
              <Pressable
                key={`${result.surah_id}:${result.ayah_number}`}
                accessibilityRole="button"
                accessibilityLabel={`${result.surah_name_ar}، ${t('ayah', language)} ${toArabicDigits(result.ayah_number)}`}
                onPress={() => openAyah(result.surah_id, result.ayah_number)}
                style={({ pressed }) => [
                  styles.resultCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    direction: isRTL ? 'rtl' : 'ltr',
                    opacity: pressed ? 0.84 : 1,
                  },
                ]}
              >
                <View style={styles.resultHeading}>
                  <Text style={[styles.surahName, { color: palette.oliveStrong }]}>
                    {language === 'ar' ? result.surah_name_ar : result.name_en}
                  </Text>
                  <Text style={[styles.reference, { color: palette.muted }]}>
                    {toArabicDigits(result.surah_id)}:{toArabicDigits(result.ayah_number)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.ayahText,
                    {
                      color: palette.text,
                      textAlign: 'right',
                      writingDirection: 'rtl',
                    },
                  ]}
                >
                  {result.text_ar}
                </Text>
              </Pressable>
            ))}
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
    maxWidth: 900,
    alignSelf: 'center',
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  searchBox: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 0,
    fontFamily: fonts.interface,
    fontSize: 15,
  },
  message: {
    padding: spacing.xl,
    fontFamily: fonts.interface,
    fontSize: 14,
    textAlign: 'center',
  },
  results: {
    gap: spacing.sm,
  },
  resultCount: {
    fontFamily: fonts.medium,
    fontSize: 12,
    paddingHorizontal: spacing.xs,
  },
  resultCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  resultHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  surahName: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  reference: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  ayahText: {
    fontFamily: fonts.quran,
    fontSize: 22,
    lineHeight: 38,
  },
});
