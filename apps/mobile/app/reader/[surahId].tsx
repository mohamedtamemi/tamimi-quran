import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '../../src/components/BrandHeader';
import { AyahDetailsSheet } from '../../src/components/AyahDetailsSheet';
import { MushafPage } from '../../src/components/MushafPage';
import {
  createQuranRepository,
  type Ayah,
  type Surah,
} from '../../src/data/quran-repository';
import { t } from '../../src/i18n';
import { useAppStore } from '../../src/store/app-store';
import { fonts, radii, spacing, themes } from '../../src/theme';
import { toArabicDigits } from '../../src/utils/arabic';

export default function ReaderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ surahId: string; ayah?: string }>();
  const db = useSQLiteContext();
  const repository = useMemo(() => createQuranRepository(db), [db]);
  const language = useAppStore((state) => state.language);
  const theme = useAppStore((state) => state.theme);
  const fontSize = useAppStore((state) => state.fontSize);
  const setLastRead = useAppStore((state) => state.setLastRead);
  const palette = themes[theme];
  const { width } = useWindowDimensions();
  const surahId = Number(Array.isArray(params.surahId) ? params.surahId[0] : params.surahId);
  const requestedAyah = Number(Array.isArray(params.ayah) ? params.ayah[0] : params.ayah) || 1;
  const [surah, setSurah] = useState<Surah | null>(null);
  const [basmala, setBasmala] = useState('');
  const [juzNumber, setJuzNumber] = useState(1);
  const [activeAyah, setActiveAyah] = useState(requestedAyah);
  const [detailAyah, setDetailAyah] = useState<number | null>(null);
  const [loadedSurahId, setLoadedSurahId] = useState<number | null>(null);
  const [failedSurahId, setFailedSurahId] = useState<number | null>(null);
  const [saveErrorPosition, setSaveErrorPosition] = useState<string | null>(null);
  const loading = loadedSurahId !== surahId;
  const loadError = failedSurahId === surahId;
  const saveError = saveErrorPosition === `${surahId}:${activeAyah}`;
  const isRTL = language === 'ar';
  const showSpread = width >= 980;

  useEffect(() => {
    let active = true;
    Promise.all([
      repository.getSurah(surahId),
      surahId !== 1 && surahId !== 9 ? repository.getBasmala() : Promise.resolve(''),
    ])
      .then(async ([loadedSurah, loadedBasmala]) => {
        if (!active) return;
        if (!loadedSurah) {
          setFailedSurahId(surahId);
          setSurah(null);
          setLoadedSurahId(surahId);
          return;
        }
        const validAyah = Math.max(
          1,
          Math.min(requestedAyah, loadedSurah.ayah_count),
        );
        const loadedJuz = await repository.getJuzNumber(surahId, validAyah);
        if (!active) return;
        setSurah(loadedSurah);
        setBasmala(loadedBasmala);
        setJuzNumber(loadedJuz);
        setActiveAyah(validAyah);
        setLoadedSurahId(surahId);
        setFailedSurahId(null);
        setLastRead({ surahId, ayahNumber: validAyah });
        try {
          await repository.saveReadingProgress(surahId, validAyah);
          if (active) setSaveErrorPosition(null);
        } catch {
          if (active) setSaveErrorPosition(`${surahId}:${validAyah}`);
        }
      })
      .catch(() => {
        if (active) {
          setFailedSurahId(surahId);
          setLoadedSurahId(surahId);
        }
      });

    return () => {
      active = false;
    };
  }, [repository, requestedAyah, setLastRead, surahId]);

  const selectAyah = useCallback(
    async (ayahNumber: number) => {
      setActiveAyah(ayahNumber);
      setLastRead({ surahId, ayahNumber });
      setSaveErrorPosition(null);
      try {
        setJuzNumber(await repository.getJuzNumber(surahId, ayahNumber));
        await repository.saveReadingProgress(surahId, ayahNumber);
      } catch {
        setSaveErrorPosition(`${surahId}:${ayahNumber}`);
      }
    },
    [repository, setLastRead, surahId],
  );

  const moveSurah = (nextSurahId: number) => {
    router.replace({
      pathname: '/reader/[surahId]',
      params: { surahId: String(nextSurahId), ayah: '1' },
    });
  };

  const renderAyahs = (ayahs: Ayah[]) => (
    <View style={styles.ayahList}>
      {ayahs.map((ayah) => {
        const selected = ayah.ayah_number === activeAyah;
        return (
          <Pressable
            key={ayah.ayah_number}
            accessibilityRole="button"
            accessibilityLabel={`${t('ayah', language)} ${toArabicDigits(ayah.ayah_number)}`}
            onPress={() => {
              void selectAyah(ayah.ayah_number);
              setDetailAyah(ayah.ayah_number);
            }}
            style={[
              styles.ayahPressable,
              selected && { backgroundColor: palette.soft },
            ]}
          >
            <Text
              style={[
                styles.ayahText,
                {
                  color: palette.text,
                  fontSize,
                  lineHeight: Math.round(fontSize * 2),
                  textAlign: 'right',
                },
              ]}
            >
              {ayah.text_ar}
              {' '}
              <Text style={[styles.ayahNumber, { color: palette.olive }]}>
                ﴿{toArabicDigits(ayah.ayah_number)}﴾
              </Text>
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: palette.background }]}
    >
      <BrandHeader
        palette={palette}
        language={language}
        title={surah?.name_ar ?? t('index', language)}
        subtitle={
          surah
            ? `${surah.transliteration} · ${toArabicDigits(surah.ayah_count)} ${t('ayahs', language)}`
            : undefined
        }
        onBack={() => router.back()}
      />

      <View style={[styles.pageToolbar, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        <View style={[styles.juzBadge, { backgroundColor: palette.soft }]}>
          <Text style={[styles.juzBadgeText, { color: palette.oliveStrong }]}>
            {t('part', language)} {toArabicDigits(juzNumber)}
          </Text>
        </View>
        {surah ? (
          <Text style={[styles.toolbarMeta, { color: palette.muted }]}>
            {toArabicDigits(activeAyah)} / {toArabicDigits(surah.ayah_count)}
          </Text>
        ) : null}
      </View>

      {loading ? (
        <Text style={[styles.message, { color: palette.muted }]}>
          {t('loading', language)}
        </Text>
      ) : loadError || !surah ? (
        <Text style={[styles.message, { color: palette.oliveStrong }]}>
          {t('loadError', language)}
        </Text>
      ) : (
        <ScrollView
          contentContainerStyle={styles.readerContent}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.spread,
              showSpread && styles.spreadWide,
              { direction: isRTL ? 'rtl' : 'ltr' },
            ]}
          >
            <MushafPage
              palette={palette}
              surahName={surah.name_ar}
              juzLabel={`${t('part', language)} ${toArabicDigits(juzNumber)}`}
            >
              {!showSpread ? (
                <SurahHeading
                  surah={surah}
                  basmala={basmala}
                  palette={palette}
                  language={language}
                />
              ) : null}
              {renderAyahs(
                showSpread
                  ? surah.ayahs.slice(0, Math.ceil(surah.ayahs.length / 2))
                  : surah.ayahs,
              )}
            </MushafPage>
            {showSpread ? (
              <MushafPage
                palette={palette}
                surahName={surah.name_ar}
                juzLabel={`${t('part', language)} ${toArabicDigits(juzNumber)}`}
              >
                <SurahHeading
                  surah={surah}
                  basmala={basmala}
                  palette={palette}
                  language={language}
                  continuation
                />
                {renderAyahs(
                  surah.ayahs.slice(Math.ceil(surah.ayahs.length / 2)),
                )}
              </MushafPage>
            ) : null}
          </View>
        </ScrollView>
      )}

      {saveError ? (
        <Text style={[styles.saveError, { color: palette.oliveStrong }]}>
          {t('progressSaveError', language)}
        </Text>
      ) : null}

      <View
        style={[
          styles.navigation,
          { backgroundColor: palette.surface, borderTopColor: palette.border },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('previousSurah', language)}
          disabled={!surah || surah.id <= 1}
          onPress={() => surah && moveSurah(surah.id - 1)}
          style={({ pressed }) => [
            styles.navigationButton,
            {
              backgroundColor: palette.soft,
              opacity: !surah || surah.id <= 1 ? 0.4 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={isRTL ? 'arrow-right' : 'arrow-left'}
            size={18}
            color={palette.olive}
          />
          <Text style={[styles.navigationLabel, { color: palette.oliveStrong }]}>
            {t('previousSurah', language)}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nextSurah', language)}
          disabled={!surah || surah.id >= 114}
          onPress={() => surah && moveSurah(surah.id + 1)}
          style={({ pressed }) => [
            styles.navigationButton,
            {
              backgroundColor: palette.soft,
              opacity: !surah || surah.id >= 114 ? 0.4 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text style={[styles.navigationLabel, { color: palette.oliveStrong }]}>
            {t('nextSurah', language)}
          </Text>
          <MaterialCommunityIcons
            name={isRTL ? 'arrow-left' : 'arrow-right'}
            size={18}
            color={palette.olive}
          />
        </Pressable>
      </View>
      {detailAyah !== null && surah ? (
        <AyahDetailsSheet
          key={`${surahId}:${detailAyah}`}
          visible
          surahId={surahId}
          ayahNumber={detailAyah}
          ayahText={
            surah.ayahs.find((ayah) => ayah.ayah_number === detailAyah)?.text_ar ??
            ''
          }
          repository={repository}
          onClose={() => setDetailAyah(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

interface SurahHeadingProps {
  surah: Surah;
  basmala: string;
  palette: (typeof themes)[keyof typeof themes];
  language: 'ar' | 'en';
  continuation?: boolean;
}

function SurahHeading({
  surah,
  basmala,
  palette,
  language,
  continuation = false,
}: SurahHeadingProps) {
  return (
    <View style={styles.surahHeading}>
      {!continuation ? (
        <View style={[styles.surahSeal, { borderColor: palette.gold }]}>
          <Text style={[styles.surahHeadingName, { color: palette.oliveStrong }]}>
            {surah.name_ar}
          </Text>
          <Text style={[styles.surahHeadingMeta, { color: palette.muted }]}>
            {toArabicDigits(surah.ayah_count)} {t('ayahs', language)}
          </Text>
        </View>
      ) : null}
      {basmala && !continuation ? (
        <Text style={[styles.basmala, { color: palette.oliveStrong }]}>
          {basmala}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  pageToolbar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  juzBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  juzBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  toolbarMeta: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  readerContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 1220,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  spread: {
    flex: 1,
    gap: spacing.md,
  },
  spreadWide: {
    flexDirection: 'row',
  },
  surahHeading: {
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  surahSeal: {
    minWidth: 145,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  surahHeadingName: {
    fontFamily: fonts.quran,
    fontSize: 23,
  },
  surahHeadingMeta: {
    marginTop: 1,
    fontFamily: fonts.interface,
    fontSize: 11,
  },
  basmala: {
    fontFamily: fonts.quran,
    fontSize: 25,
    textAlign: 'center',
  },
  ayahList: {
    gap: spacing.xs,
  },
  ayahPressable: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  ayahText: {
    fontFamily: fonts.quran,
  },
  ayahNumber: {
    fontFamily: fonts.quran,
  },
  navigation: {
    minHeight: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navigationButton: {
    minHeight: 42,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  navigationLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  message: {
    flex: 1,
    padding: spacing.xl,
    fontFamily: fonts.interface,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  saveError: {
    padding: spacing.xs,
    fontFamily: fonts.interface,
    fontSize: 12,
    textAlign: 'center',
  },
});
