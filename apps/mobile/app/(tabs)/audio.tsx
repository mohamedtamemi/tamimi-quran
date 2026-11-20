import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRecitation } from '../../src/audio/RecitationProvider';
import { createRecitationFileName } from '../../src/audio/file-name';
import {
  createOnlineTrack,
  ONLINE_RECITERS,
} from '../../src/audio/online-recitation';
import { BrandHeader } from '../../src/components/BrandHeader';
import {
  createQuranRepository,
  type SurahSummary,
} from '../../src/data/quran-repository';
import {
  createRecitationRepository,
  type RecitationTrack,
} from '../../src/data/recitation-repository';
import { t } from '../../src/i18n';
import { useAppStore } from '../../src/store/app-store';
import { fonts, radii, spacing, themes } from '../../src/theme';
import { toArabicDigits } from '../../src/utils/arabic';

const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'aac', 'wav', 'ogg']);
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function AudioScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const quranRepository = useMemo(() => createQuranRepository(db), [db]);
  const audioRepository = useMemo(() => createRecitationRepository(db), [db]);
  const language = useAppStore((state) => state.language);
  const theme = useAppStore((state) => state.theme);
  const palette = themes[theme];
  const {
    activeTrack,
    status,
    repeatMode,
    segmentStart,
    segmentEnd,
    speed,
    error: playerError,
    playTrack,
    togglePlayback,
    seekBy,
    setRepeatMode,
    setSegmentStart,
    setSegmentEnd,
    setSpeed,
    clearActiveTrack,
    clearError,
  } = useRecitation();

  const [tracks, setTracks] = useState<RecitationTrack[]>([]);
  const [surahs, setSurahs] = useState<SurahSummary[]>([]);
  const [selectedSurahId, setSelectedSurahId] = useState(1);
  const [selectedOnlineReciterId, setSelectedOnlineReciterId] = useState(1);
  const [reciterName, setReciterName] = useState('');
  const [surahPickerOpen, setSurahPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState('');
  const [feedback, setFeedback] = useState('');

  const selectedSurah = surahs.find((surah) => surah.id === selectedSurahId);
  const selectedOnlineReciter = ONLINE_RECITERS.find(
    (reciter) => reciter.id === selectedOnlineReciterId,
  );
  const isRTL = language === 'ar';

  const loadLibrary = useCallback(async () => {
    try {
      const [savedTracks, availableSurahs] = await Promise.all([
        audioRepository.listTracks(),
        quranRepository.listSurahs(),
      ]);
      setTracks(savedTracks);
      setSurahs(availableSurahs);
      setLoadError(false);
      if (!availableSurahs.some((surah) => surah.id === selectedSurahId)) {
        setSelectedSurahId(availableSurahs[0]?.id ?? 1);
      }
    } catch {
      setLoadError(true);
    }
  }, [audioRepository, quranRepository, selectedSurahId]);

  useFocusEffect(
    useCallback(() => {
      void loadLibrary();
    }, [loadLibrary]),
  );

  const importAudio = async () => {
    setActionError('');
    setFeedback('');
    if (Platform.OS === 'web') {
      setActionError(t('audioWebUnavailable', language));
      return;
    }
    if (!selectedSurah || reciterName.trim().length === 0) {
      setActionError(t('audioImportError', language));
      return;
    }

    setBusy(true);
    let importedFile: File | null = null;
    let saved = false;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      const extension = asset.name.split('.').pop()?.toLowerCase() ?? '';
      if (!AUDIO_EXTENSIONS.has(extension)) {
        setActionError(t('unsupportedAudioFile', language));
        return;
      }

      const recitationsDirectory = new Directory(Paths.document, 'recitations');
      recitationsDirectory.create({ idempotent: true, intermediates: true });
      importedFile = new File(
        recitationsDirectory,
        createRecitationFileName(
          selectedSurah.id,
          reciterName,
          extension,
        ),
      );
      await new File(asset.uri).copy(importedFile);

      const previousTrack = await audioRepository.getTrack(
        selectedSurah.id,
        reciterName.trim(),
      );
      const importedUri = importedFile.uri;
      const importedSize = asset.size ?? importedFile.size;
      await audioRepository.saveTrack(
        selectedSurah.id,
        reciterName.trim(),
        importedUri,
        importedSize,
      );
      importedFile = null;
      saved = true;

      let cleanupWarning = false;
      if (previousTrack && previousTrack.file_uri !== importedUri) {
        if (activeTrack?.id === previousTrack.id) clearActiveTrack();
        const previousFile = new File(previousTrack.file_uri);
        try {
          if (previousFile.exists) previousFile.delete();
        } catch {
          cleanupWarning = true;
        }
      }
      setTracks(await audioRepository.listTracks());
      setFeedback(
        t(cleanupWarning ? 'audioCleanupWarning' : 'audioImportSuccess', language),
      );
    } catch {
      if (importedFile?.exists) {
        try {
          importedFile.delete();
        } catch {
          setActionError(t('audioCleanupError', language));
          return;
        }
      }
      setActionError(t(saved ? 'audioLoadError' : 'audioImportError', language));
    } finally {
      setBusy(false);
    }
  };

  const deleteTrack = async (track: RecitationTrack) => {
    setActionError('');
    setFeedback('');
    try {
      if (activeTrack?.id === track.id) clearActiveTrack();
      const file = new File(track.file_uri);
      if (file.exists) file.delete();
      await audioRepository.removeTrack(track.id);
      setTracks((current) => current.filter((item) => item.id !== track.id));
    } catch {
      setActionError(t('audioDeleteError', language));
    }
  };

  const playPause = async () => {
    if (activeTrack) {
      clearError();
      togglePlayback();
      return;
    }
    setActionError(t('noActiveAudio', language));
  };

  const nextRepeatMode = () => {
    const nextMode =
      repeatMode === 'off'
        ? 'track'
        : repeatMode === 'track'
          ? 'segment'
          : 'off';
    setRepeatMode(nextMode);
  };

  const formatTime = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${toArabicDigits(minutes)}:${toArabicDigits(
      remainder.toString().padStart(2, '0'),
    )}`;
  };

  const repeatLabel =
    repeatMode === 'track'
      ? t('repeatTrack', language)
      : repeatMode === 'segment'
        ? t('repeatSegment', language)
        : t('repeatOff', language);

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: palette.background }]}
    >
      <BrandHeader
        palette={palette}
        language={language}
        title={t('audioLibrary', language)}
        subtitle={t('audioSubtitle', language)}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.notice,
            { backgroundColor: palette.soft, direction: isRTL ? 'rtl' : 'ltr' },
          ]}
        >
          <MaterialCommunityIcons
            name="shield-check-outline"
            color={palette.olive}
            size={20}
          />
          <Text style={[styles.noticeText, { color: palette.oliveStrong }]}>
            {t('audioRightsNotice', language)}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              direction: isRTL ? 'rtl' : 'ltr',
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {t('importAudio', language)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('chooseSurah', language)}
            onPress={() => setSurahPickerOpen(true)}
            style={[
              styles.selector,
              { borderColor: palette.border, backgroundColor: palette.paper },
            ]}
          >
            <Text style={[styles.selectorText, { color: palette.text }]}>
              {selectedSurah
                ? `${toArabicDigits(selectedSurah.id)} · ${
                    language === 'ar'
                      ? selectedSurah.name_ar
                      : selectedSurah.name_en
                  }`
                : t('chooseSurah', language)}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color={palette.muted}
            />
          </Pressable>
          <TextInput
            accessibilityLabel={t('reciterName', language)}
            value={reciterName}
            onChangeText={setReciterName}
            placeholder={t('reciterNameHint', language)}
            placeholderTextColor={palette.muted}
            style={[
              styles.input,
              {
                color: palette.text,
                borderColor: palette.border,
                backgroundColor: palette.paper,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy || Platform.OS === 'web' }}
            disabled={busy || Platform.OS === 'web'}
            onPress={() => void importAudio()}
            style={[
              styles.primaryButton,
              { backgroundColor: palette.olive, opacity: busy || Platform.OS === 'web' ? 0.55 : 1 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={palette.surface} />
            ) : (
              <MaterialCommunityIcons
                name="file-music-outline"
                color={palette.surface}
                size={20}
              />
            )}
            <Text style={[styles.primaryButtonText, { color: palette.surface }]}>
              {t('chooseAudioFile', language)}
            </Text>
          </Pressable>
          {Platform.OS === 'web' ? (
            <Text style={[styles.hint, { color: palette.muted }]}>
              {t('audioWebUnavailable', language)}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              direction: isRTL ? 'rtl' : 'ltr',
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {t('onlineReciters', language)}
          </Text>
          <Text style={[styles.hint, { color: palette.muted }]}>
            {t('onlineRecitationNotice', language)}
          </Text>
          <View style={styles.reciterList}>
            {ONLINE_RECITERS.map((reciter) => {
              const selected = reciter.id === selectedOnlineReciterId;
              return (
                <Pressable
                  key={reciter.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedOnlineReciterId(reciter.id)}
                  style={[
                    styles.reciterOption,
                    {
                      backgroundColor: selected ? palette.soft : palette.paper,
                      borderColor: selected ? palette.olive : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.reciterName,
                      { color: selected ? palette.oliveStrong : palette.text },
                    ]}
                  >
                    {language === 'ar' ? reciter.nameAr : reciter.nameEn}
                  </Text>
                  {selected ? (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={palette.olive}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !selectedSurah || !selectedOnlineReciter }}
            disabled={!selectedSurah || !selectedOnlineReciter}
            onPress={() => {
              if (!selectedSurah || !selectedOnlineReciter) return;
              clearError();
              void playTrack(createOnlineTrack(selectedOnlineReciter, selectedSurah));
            }}
            style={[
              styles.primaryButton,
              {
                backgroundColor: palette.olive,
                opacity: !selectedSurah || !selectedOnlineReciter ? 0.55 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="play-circle-outline"
              color={palette.surface}
              size={20}
            />
            <Text style={[styles.primaryButtonText, { color: palette.surface }]}>
              {t('streamSelectedRecitation', language)}
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              direction: isRTL ? 'rtl' : 'ltr',
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {t('audio', language)}
          </Text>
          {activeTrack ? (
            <>
              <Text style={[styles.trackTitle, { color: palette.text }]}>
                {activeTrack.surah_name_ar}
              </Text>
              <Text style={[styles.hint, { color: palette.muted }]}>
                {activeTrack.reciter_name}
              </Text>
              <View
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: Math.floor(status.duration),
                  now: Math.floor(status.currentTime),
                }}
                style={[styles.progressTrack, { backgroundColor: palette.soft }]}
              >
                <View
                  style={[
                    styles.progressValue,
                    {
                      backgroundColor: palette.olive,
                      width: `${
                        status.duration > 0
                          ? Math.min(100, (status.currentTime / status.duration) * 100)
                          : 0
                      }%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.timeRow}>
                <Text style={[styles.timeText, { color: palette.muted }]}>
                  {formatTime(status.currentTime)}
                </Text>
                <Text style={[styles.timeText, { color: palette.muted }]}>
                  {formatTime(status.duration)}
                </Text>
              </View>
              <View style={styles.controls}>
                <ControlButton
                  palette={palette}
                  label="-10"
                  icon="rewind-10"
                  onPress={() => seekBy(-10)}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    status.playing ? t('pause', language) : t('play', language)
                  }
                  onPress={() => void playPause()}
                  style={[styles.playButton, { backgroundColor: palette.olive }]}
                >
                  <MaterialCommunityIcons
                    name={status.playing ? 'pause' : 'play'}
                    size={28}
                    color={palette.surface}
                  />
                </Pressable>
                <ControlButton
                  palette={palette}
                  label="+10"
                  icon="fast-forward-10"
                  onPress={() => seekBy(10)}
                />
              </View>
              <View style={styles.optionsRow}>
                <OptionButton
                  palette={palette}
                  icon="repeat"
                  label={repeatLabel}
                  onPress={nextRepeatMode}
                />
                <OptionButton
                  palette={palette}
                  icon="speedometer"
                  label={`${t('playbackSpeed', language)} · ${speed}×`}
                  onPress={() => {
                    const index = SPEEDS.indexOf(speed);
                    setSpeed(SPEEDS[(index + 1) % SPEEDS.length]);
                  }}
                />
              </View>
              {repeatMode === 'segment' ? (
                <View style={styles.segmentRow}>
                  <TextInput
                    accessibilityLabel={t('segmentStart', language)}
                    keyboardType="decimal-pad"
                    value={segmentStart}
                    onChangeText={setSegmentStart}
                    placeholder={t('segmentStart', language)}
                    placeholderTextColor={palette.muted}
                    style={[
                      styles.segmentInput,
                      {
                        color: palette.text,
                        borderColor: palette.border,
                        textAlign: isRTL ? 'right' : 'left',
                      },
                    ]}
                  />
                  <TextInput
                    accessibilityLabel={t('segmentEnd', language)}
                    keyboardType="decimal-pad"
                    value={segmentEnd}
                    onChangeText={setSegmentEnd}
                    placeholder={t('segmentEnd', language)}
                    placeholderTextColor={palette.muted}
                    style={[
                      styles.segmentInput,
                      {
                        color: palette.text,
                        borderColor: palette.border,
                        textAlign: isRTL ? 'right' : 'left',
                      },
                    ]}
                  />
                </View>
              ) : null}
            </>
          ) : (
            <Text style={[styles.hint, { color: palette.muted }]}>
              {t('noActiveAudio', language)}
            </Text>
          )}
          {playerError ? (
            <Text style={[styles.error, { color: palette.oliveStrong }]}>
              {playerError}
            </Text>
          ) : null}
        </View>

        <View style={styles.libraryHeading}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {t('audioLibrary', language)}
          </Text>
          {loadError ? (
            <Text style={[styles.error, { color: palette.oliveStrong }]}>
              {t('audioLoadError', language)}
            </Text>
          ) : tracks.length === 0 ? (
            <Text style={[styles.hint, { color: palette.muted }]}>
              {t('audioEmpty', language)}
            </Text>
          ) : (
            <View style={styles.trackList}>
              {tracks.map((track) => (
                <View
                  key={track.id}
                  style={[
                    styles.trackCard,
                    {
                      backgroundColor: palette.surface,
                      borderColor:
                        activeTrack?.id === track.id ? palette.olive : palette.border,
                      direction: isRTL ? 'rtl' : 'ltr',
                    },
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('play', language)} · ${track.surah_name_ar} · ${track.reciter_name}`}
                    onPress={() => void playTrack(track)}
                    style={styles.trackInfo}
                  >
                    <MaterialCommunityIcons
                      name="music-note"
                      color={palette.olive}
                      size={20}
                    />
                    <View style={styles.trackText}>
                      <Text style={[styles.trackTitle, { color: palette.text }]}>
                        {track.surah_name_ar}
                      </Text>
                      <Text style={[styles.hint, { color: palette.muted }]}>
                        {track.reciter_name} · {formatBytes(track.file_size, language)}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('removeAudio', language)}
                    onPress={() => void deleteTrack(track)}
                    style={styles.deleteButton}
                  >
                    <MaterialCommunityIcons
                      name="delete-outline"
                      color={palette.muted}
                      size={21}
                    />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          {actionError ? (
            <Text style={[styles.error, { color: palette.oliveStrong }]}>
              {actionError}
            </Text>
          ) : feedback ? (
            <Text style={[styles.feedback, { color: palette.oliveStrong }]}>
              {feedback}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={surahPickerOpen}
        onRequestClose={() => setSurahPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modal,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                {t('chooseSurah', language)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('close', language)}
                onPress={() => setSurahPickerOpen(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons
                  name="close"
                  color={palette.muted}
                  size={22}
                />
              </Pressable>
            </View>
            <ScrollView>
              {surahs.map((surah) => (
                <Pressable
                  key={surah.id}
                  accessibilityRole="button"
                  onPress={() => {
                    setSelectedSurahId(surah.id);
                    setSurahPickerOpen(false);
                  }}
                  style={[
                    styles.surahOption,
                    {
                      borderBottomColor: palette.border,
                      direction: isRTL ? 'rtl' : 'ltr',
                    },
                  ]}
                >
                  <Text style={[styles.surahOptionText, { color: palette.text }]}>
                    {toArabicDigits(surah.id)} ·{' '}
                    {language === 'ar' ? surah.name_ar : surah.name_en}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ControlButton({
  palette,
  label,
  icon,
  onPress,
}: {
  palette: (typeof themes)[keyof typeof themes];
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.controlButton, { backgroundColor: palette.soft }]}
    >
      <MaterialCommunityIcons name={icon} color={palette.olive} size={22} />
    </Pressable>
  );
}

function OptionButton({
  palette,
  icon,
  label,
  onPress,
}: {
  palette: (typeof themes)[keyof typeof themes];
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.optionButton,
        { backgroundColor: palette.soft, borderColor: palette.border },
      ]}
    >
      <MaterialCommunityIcons name={icon} color={palette.olive} size={18} />
      <Text style={[styles.optionText, { color: palette.oliveStrong }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatBytes(bytes: number, language: 'ar' | 'en') {
  const megabytes = bytes / (1024 * 1024);
  const formatted = megabytes < 10 ? megabytes.toFixed(1) : Math.round(megabytes);
  const value = language === 'ar' ? toArabicDigits(formatted) : formatted;
  return `${value} MB`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.interface,
    fontSize: 14,
    lineHeight: 22,
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  selector: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorText: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.interface,
    fontSize: 15,
  },
  reciterList: {
    gap: spacing.xs,
  },
  reciterOption: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.sm,
  },
  reciterName: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'auto',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  trackTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  hint: {
    fontFamily: fonts.interface,
    fontSize: 14,
    lineHeight: 20,
  },
  progressTrack: {
    height: 6,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  progressValue: {
    height: '100%',
    borderRadius: radii.pill,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 58,
    height: 58,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    minHeight: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  optionText: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segmentInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    fontFamily: fonts.interface,
  },
  libraryHeading: {
    gap: spacing.sm,
  },
  trackList: {
    gap: spacing.sm,
  },
  trackCard: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trackInfo: {
    flex: 1,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trackText: {
    flex: 1,
    gap: 2,
  },
  deleteButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  feedback: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  modal: {
    height: '75%',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  modalHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahOption: {
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  surahOptionText: {
    fontFamily: fonts.interface,
    fontSize: 15,
  },
});
