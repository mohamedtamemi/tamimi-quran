import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '../../src/components/BrandHeader';
import { AyahDetailsSheet } from '../../src/components/AyahDetailsSheet';
import { MushafPage } from '../../src/components/MushafPage';
import {
  createQuranRepository,
  type Ayah,
  type JuzStart,
  type Surah,
} from '../../src/data/quran-repository';
import { t } from '../../src/i18n';
import { findJuzNumber, paginateByLines } from '../../src/reader/pagination';
import { useAppStore } from '../../src/store/app-store';
import { fonts, radii, spacing, themes } from '../../src/theme';
import { toArabicDigits } from '../../src/utils/arabic';

interface ReaderSize {
  width: number;
  height: number;
}

interface Measurement {
  key: string;
  lines: number[];
}

const EMPTY_LINE_COUNTS: readonly number[] = [];

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
  const surahId = Number(Array.isArray(params.surahId) ? params.surahId[0] : params.surahId);
  const requestedAyah = Number(Array.isArray(params.ayah) ? params.ayah[0] : params.ayah) || 1;
  const [surah, setSurah] = useState<Surah | null>(null);
  const [basmala, setBasmala] = useState('');
  const [juzNumber, setJuzNumber] = useState(1);
  const [juzStarts, setJuzStarts] = useState<JuzStart[]>([]);
  const [activeAyah, setActiveAyah] = useState(requestedAyah);
  const [detailAyah, setDetailAyah] = useState<number | null>(null);
  const [loadedSurahId, setLoadedSurahId] = useState<number | null>(null);
  const [failedSurahId, setFailedSurahId] = useState<number | null>(null);
  const [saveErrorPosition, setSaveErrorPosition] = useState<string | null>(null);
  const [readerSize, setReaderSize] = useState<ReaderSize>({ width: 0, height: 0 });
  const [bodyHeight, setBodyHeight] = useState(0);
  const [headingHeight, setHeadingHeight] = useState(0);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [manualPageIndex, setManualPageIndex] = useState<number | null>(null);
  const measurementBuffer = useRef<Measurement | null>(null);
  const loading = loadedSurahId !== surahId;
  const loadError = failedSurahId === surahId;
  const saveError = saveErrorPosition === `${surahId}:${activeAyah}`;
  const isRTL = language === 'ar';
  const showSpread = readerSize.width >= 820;
  const usableWidth = Math.max(0, readerSize.width - spacing.md);
  const pageWidth = showSpread
    ? Math.max(0, (usableWidth - spacing.md) / 2)
    : usableWidth;
  const contentWidth = Math.max(0, pageWidth - 52);
  const lineHeight = Math.round(fontSize * 1.9);
  const measurementKey = `${surah?.id ?? surahId}:${contentWidth}:${fontSize}`;
  const measuredLines =
    measurement?.key === measurementKey ? measurement.lines : EMPTY_LINE_COUNTS;
  const measurementsReady =
    surah !== null &&
    measuredLines.length === surah.ayahs.length &&
    measuredLines.every((count) => count > 0);

  const pageRanges = useMemo(() => {
    if (!measurementsReady || bodyHeight < lineHeight) return [];
    const regularCapacity = Math.max(1, Math.floor(bodyHeight / lineHeight));
    const firstCapacity = Math.max(
      1,
      Math.floor(Math.max(lineHeight, bodyHeight - headingHeight) / lineHeight),
    );
    return paginateByLines(measuredLines, firstCapacity, regularCapacity);
  }, [
    bodyHeight,
    headingHeight,
    lineHeight,
    measuredLines,
    measurementsReady,
  ]);
  const activeAyahIndex =
    surah?.ayahs.findIndex((ayah) => ayah.ayah_number === activeAyah) ?? -1;
  const activePageIndex = pageRanges.findIndex(
    (range) =>
      activeAyahIndex >= range.start && activeAyahIndex < range.end,
  );
  const activePageStart =
    activePageIndex < 0
      ? 0
      : showSpread
        ? activePageIndex - (activePageIndex % 2)
        : activePageIndex;
  const requestedPageStart = manualPageIndex ?? activePageStart;
  const maximumPageStart = Math.max(0, pageRanges.length - 1);
  const pageIndex = Math.min(requestedPageStart, maximumPageStart);
  const displayPageIndex = showSpread ? pageIndex - (pageIndex % 2) : pageIndex;

  useEffect(() => {
    let active = true;
    Promise.all([
      repository.getSurah(surahId),
      surahId !== 1 && surahId !== 9 ? repository.getBasmala() : Promise.resolve(''),
      repository.listJuzStarts(),
    ])
      .then(async ([loadedSurah, loadedBasmala, starts]) => {
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
        setJuzStarts(starts);
        setJuzNumber(loadedJuz);
        setActiveAyah(validAyah);
        setManualPageIndex(null);
        setMeasurement(null);
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
      setManualPageIndex(null);
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

  const measureAyah = (index: number, height: number) => {
    if (!surah) return;
    const lineCount = Math.max(1, Math.round((height + 3) / lineHeight));
    if (measurementBuffer.current?.key !== measurementKey) {
      measurementBuffer.current = {
        key: measurementKey,
        lines: Array.from({ length: surah.ayahs.length }, () => 0),
      };
    }

    const currentLines = measurementBuffer.current.lines;
    if (currentLines[index] === lineCount) return;
    currentLines[index] = lineCount;
    if (currentLines.every((count) => count > 0)) {
      setMeasurement({ key: measurementKey, lines: [...currentLines] });
    }
  };

  const movePage = (direction: -1 | 1) => {
    const step = showSpread ? 2 : 1;
    const maximum = Math.max(0, pageRanges.length - 1);
    setManualPageIndex(
      Math.min(maximum, Math.max(0, displayPageIndex + direction * step)),
    );
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
                  lineHeight,
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

  const visiblePages = showSpread ? 2 : 1;
  const shownRanges = pageRanges.slice(
    displayPageIndex,
    displayPageIndex + visiblePages,
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
        <View style={styles.pageControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('previousPage', language)}
            accessibilityState={{ disabled: displayPageIndex === 0 || !pageRanges.length }}
            disabled={displayPageIndex === 0 || !pageRanges.length}
            onPress={() => movePage(-1)}
            style={[
              styles.pageControl,
              { backgroundColor: palette.soft, opacity: displayPageIndex === 0 ? 0.4 : 1 },
            ]}
          >
            <MaterialCommunityIcons
              name={isRTL ? 'chevron-right' : 'chevron-left'}
              size={20}
              color={palette.olive}
            />
          </Pressable>
          <Text style={[styles.toolbarMeta, { color: palette.muted }]}>
            {toArabicDigits(displayPageIndex + 1)} / {toArabicDigits(pageRanges.length || 1)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('nextPage', language)}
            accessibilityState={{
              disabled:
                pageRanges.length === 0 ||
                displayPageIndex + visiblePages >= pageRanges.length,
            }}
            disabled={
              pageRanges.length === 0 ||
              displayPageIndex + visiblePages >= pageRanges.length
            }
            onPress={() => movePage(1)}
            style={[
              styles.pageControl,
              {
                backgroundColor: palette.soft,
                opacity:
                  pageRanges.length === 0 ||
                  displayPageIndex + visiblePages >= pageRanges.length
                    ? 0.4
                    : 1,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={isRTL ? 'chevron-left' : 'chevron-right'}
              size={20}
              color={palette.olive}
            />
          </Pressable>
        </View>
        {surah ? (
          <Text style={[styles.toolbarMeta, { color: palette.muted }]}>
            {toArabicDigits(activeAyah)} / {toArabicDigits(surah.ayah_count)}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.pageDisclaimer, { color: palette.muted }]}>
        {t('readerPageDisclaimer', language)}
      </Text>

      {loading ? (
        <Text style={[styles.message, { color: palette.muted }]}>
          {t('loading', language)}
        </Text>
      ) : loadError || !surah ? (
        <Text style={[styles.message, { color: palette.oliveStrong }]}>
          {t('loadError', language)}
        </Text>
      ) : (
        <View
          onLayout={(event) => {
            const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
            setReaderSize((current) =>
              current.width === nextWidth && current.height === nextHeight
                ? current
                : { width: nextWidth, height: nextHeight },
            );
          }}
          style={styles.readerArea}
        >
          <View
            style={[
              styles.spread,
              showSpread && styles.spreadWide,
              { direction: isRTL ? 'rtl' : 'ltr' },
            ]}
          >
            {shownRanges.length === 0 ? (
              <MushafPage
                palette={palette}
                surahName={surah.name_ar}
                juzLabel={`${t('part', language)} ${toArabicDigits(juzNumber)}`}
                pageNumber={displayPageIndex + 1}
                onBodyLayout={setBodyHeight}
              >
                <SurahHeading
                  surah={surah}
                  basmala={basmala}
                  palette={palette}
                  language={language}
                  onLayout={setHeadingHeight}
                />
                <Text style={[styles.measureHint, { color: palette.muted }]}>
                  {t('preparingPages', language)}
                </Text>
              </MushafPage>
            ) : (
              shownRanges.map((range, offset) => {
                const pageNumber = displayPageIndex + offset + 1;
                const pageAyahs = surah.ayahs.slice(range.start, range.end);
                const firstAyah = pageAyahs[0];
                const pageJuz = firstAyah
                  ? findJuzNumber(juzStarts, surah.id, firstAyah.ayah_number)
                  : juzNumber;
                const startsSurah = firstAyah?.ayah_number === 1;
                return (
                  <MushafPage
                    key={pageNumber}
                    palette={palette}
                    surahName={surah.name_ar}
                    juzLabel={`${t('part', language)} ${toArabicDigits(pageJuz)}`}
                    pageNumber={pageNumber}
                    onBodyLayout={setBodyHeight}
                  >
                    {startsSurah ? (
                      <SurahHeading
                        surah={surah}
                        basmala={basmala}
                        palette={palette}
                        language={language}
                        onLayout={setHeadingHeight}
                      />
                    ) : null}
                    {renderAyahs(pageAyahs)}
                  </MushafPage>
                );
              })
            )}
          </View>
          {contentWidth > 0 && !measurementsReady ? (
            <View
              key={measurementKey}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.measurements, { width: contentWidth }]}
            >
              {surah.ayahs.map((ayah, index) => (
                <Text
                  key={ayah.ayah_number}
                  onLayout={(event) =>
                    measureAyah(index, event.nativeEvent.layout.height)
                  }
                  style={[
                    styles.measurementText,
                    { fontSize, lineHeight, width: contentWidth },
                  ]}
                >
                  {ayah.text_ar} ﴿{toArabicDigits(ayah.ayah_number)}﴾
                </Text>
              ))}
            </View>
          ) : null}
        </View>
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
  onLayout?: (height: number) => void;
}

function SurahHeading({
  surah,
  basmala,
  palette,
  language,
  onLayout,
}: SurahHeadingProps) {
  return (
    <View onLayout={(event) => onLayout?.(event.nativeEvent.layout.height)} style={styles.surahHeading}>
      <View
        style={[
          styles.surahSeal,
          { borderColor: palette.gold, backgroundColor: palette.soft },
        ]}
      >
        <Text style={[styles.surahHeadingName, { color: palette.oliveStrong }]}>
          {surah.name_ar}
        </Text>
        <Text style={[styles.surahHeadingMeta, { color: palette.muted }]}>
          {toArabicDigits(surah.ayah_count)} {t('ayahs', language)}
        </Text>
      </View>
      {basmala ? (
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
    gap: spacing.xs,
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
  pageControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pageControl: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  toolbarMeta: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  pageDisclaimer: {
    minHeight: 20,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.interface,
    fontSize: 10,
    textAlign: 'center',
  },
  readerArea: {
    flex: 1,
    width: '100%',
    maxWidth: 1220,
    minHeight: 280,
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: 'relative',
  },
  spread: {
    flex: 1,
    gap: spacing.md,
  },
  spreadWide: {
    flexDirection: 'row',
  },
  measurements: {
    position: 'absolute',
    top: 0,
    left: -10000,
    opacity: 0,
  },
  measurementText: {
    color: 'transparent',
    fontFamily: fonts.quran,
    textAlign: 'right',
  },
  measureHint: {
    flex: 1,
    paddingTop: spacing.md,
    fontFamily: fonts.interface,
    fontSize: 13,
    textAlign: 'center',
  },
  surahHeading: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  surahSeal: {
    minWidth: 145,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  surahHeadingName: {
    fontFamily: fonts.quran,
    fontSize: 22,
  },
  surahHeadingMeta: {
    marginTop: 1,
    fontFamily: fonts.interface,
    fontSize: 11,
  },
  basmala: {
    fontFamily: fonts.quran,
    fontSize: 23,
    textAlign: 'center',
  },
  ayahList: {
    gap: 2,
  },
  ayahPressable: {
    paddingHorizontal: 2,
    paddingVertical: 1,
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
