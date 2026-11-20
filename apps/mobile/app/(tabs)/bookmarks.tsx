import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import {
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

import { BrandHeader } from '../../src/components/BrandHeader';
import {
  createQuranRepository,
  type BookmarkWithSurah,
} from '../../src/data/quran-repository';
import { t } from '../../src/i18n';
import { useAppStore } from '../../src/store/app-store';
import {
  bookmarkColors,
  fonts,
  radii,
  spacing,
  themes,
} from '../../src/theme';
import { toArabicDigits } from '../../src/utils/arabic';

type TransferMode = 'import' | 'export';

export default function BookmarksScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const repository = useMemo(() => createQuranRepository(db), [db]);
  const language = useAppStore((state) => state.language);
  const theme = useAppStore((state) => state.theme);
  const palette = themes[theme];
  const [bookmarks, setBookmarks] = useState<BookmarkWithSurah[]>([]);
  const [transferMode, setTransferMode] = useState<TransferMode | null>(null);
  const [transferText, setTransferText] = useState('');
  const [transferError, setTransferError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState(false);
  const [completedLoad, setCompletedLoad] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      repository
        .listBookmarks()
        .then((items) => {
          if (!active) return;
          setBookmarks(items);
          setError(false);
          setCompletedLoad(true);
        })
        .catch(() => {
          if (active) {
            setError(true);
            setCompletedLoad(true);
          }
        });

      return () => {
        active = false;
      };
    }, [repository]),
  );

  const openReader = (surahId: number, ayahNumber: number) => {
    router.push({
      pathname: '/reader/[surahId]',
      params: { surahId: String(surahId), ayah: String(ayahNumber) },
    });
  };

  const removeBookmark = async (item: BookmarkWithSurah) => {
    try {
      await repository.removeBookmark(item.surah_id, item.ayah_number);
      setBookmarks((current) =>
        current.filter(
          (bookmark) =>
            bookmark.surah_id !== item.surah_id ||
            bookmark.ayah_number !== item.ayah_number,
        ),
      );
      setFeedback(t('deleted', language));
    } catch {
      setError(true);
    }
  };

  const openTransfer = async (mode: TransferMode) => {
    setTransferError('');
    setFeedback('');
    if (mode === 'export') {
      try {
        setTransferText(await repository.exportBookmarks());
      } catch {
        setTransferError(t('loadError', language));
        return;
      }
    } else {
      setTransferText('');
    }
    setTransferMode(mode);
  };

  const copyExport = async () => {
    if (
      Platform.OS !== 'web' ||
      typeof navigator === 'undefined' ||
      !navigator.clipboard
    ) {
      setFeedback(t('exportCopyUnavailable', language));
      return;
    }

    try {
      await navigator.clipboard.writeText(transferText);
      setFeedback(t('exportCopied', language));
    } catch {
      setFeedback(t('exportCopyUnavailable', language));
    }
  };

  const importBookmarks = async () => {
    try {
      const count = await repository.importBookmarks(transferText);
      setBookmarks(await repository.listBookmarks());
      setTransferMode(null);
      setFeedback(`${t('importSuccess', language)} · ${toArabicDigits(count)}`);
      setTransferError('');
    } catch {
      setTransferError(t('invalidBookmarkExport', language));
    }
  };

  const isRTL = language === 'ar';

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: palette.background }]}
    >
      <BrandHeader
        palette={palette}
        language={language}
        title={t('bookmarks', language)}
        subtitle={t('bookmark', language)}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.transferActions, { direction: isRTL ? 'rtl' : 'ltr' }]}>
          <ActionButton
            palette={palette}
            icon="export-variant"
            label={t('exportBookmarks', language)}
            onPress={() => void openTransfer('export')}
          />
          <ActionButton
            palette={palette}
            icon="import"
            label={t('importBookmarks', language)}
            onPress={() => void openTransfer('import')}
          />
        </View>

        {feedback ? (
          <Text style={[styles.feedback, { color: palette.oliveStrong }]}>
            {feedback}
          </Text>
        ) : null}
        {error ? (
          <Text style={[styles.feedback, { color: palette.oliveStrong }]}>
            {t('loadError', language)}
          </Text>
        ) : !completedLoad ? (
          <Text style={[styles.feedback, { color: palette.muted }]}>
            {t('loading', language)}
          </Text>
        ) : bookmarks.length === 0 ? (
          <Text style={[styles.feedback, { color: palette.muted }]}>
            {t('noBookmarks', language)}
          </Text>
        ) : (
          <View style={styles.bookmarkList}>
            {bookmarks.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.bookmarkCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    direction: isRTL ? 'rtl' : 'ltr',
                  },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.surah_name_ar}، ${t('ayah', language)} ${toArabicDigits(item.ayah_number)}`}
                  onPress={() => openReader(item.surah_id, item.ayah_number)}
                  style={styles.bookmarkContent}
                >
                  <View
                    style={[
                      styles.bookmarkHeading,
                      { direction: isRTL ? 'rtl' : 'ltr' },
                    ]}
                  >
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: bookmarkColors[item.color] },
                      ]}
                    />
                    <Text style={[styles.surahName, { color: palette.oliveStrong }]}>
                      {language === 'ar' ? item.surah_name_ar : item.surah_name_en}
                    </Text>
                    <Text style={[styles.reference, { color: palette.muted }]}>
                      {toArabicDigits(item.surah_id)}:{toArabicDigits(item.ayah_number)}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={3}
                    style={[styles.ayahText, { color: palette.text }]}
                  >
                    {item.text_ar}
                  </Text>
                  {item.note ? (
                    <Text style={[styles.note, { color: palette.muted }]}>
                      {item.note}
                    </Text>
                  ) : null}
                  {item.category ? (
                    <Text style={[styles.category, { color: palette.olive }]}>
                      {item.category}
                    </Text>
                  ) : null}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('removeBookmark', language)}
                  onPress={() => void removeBookmark(item)}
                  hitSlop={8}
                  style={styles.removeButton}
                >
                  <MaterialCommunityIcons
                    name="bookmark-remove-outline"
                    size={21}
                    color={palette.muted}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={transferMode !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setTransferMode(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.transferSheet,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <View style={[styles.modalHeader, { direction: isRTL ? 'rtl' : 'ltr' }]}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>
                {t('bookmarkTransfer', language)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('close', language)}
                onPress={() => setTransferMode(null)}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={23}
                  color={palette.muted}
                />
              </Pressable>
            </View>
            <Text style={[styles.transferHint, { color: palette.muted }]}>
              {transferMode === 'export'
                ? t('exportHint', language)
                : t('importHint', language)}
            </Text>
            <TextInput
              accessibilityLabel={t('bookmarkTransfer', language)}
              multiline
              value={transferText}
              onChangeText={setTransferText}
              editable={transferMode === 'import'}
              selectTextOnFocus
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={transferMode === 'import' ? '{ ... }' : undefined}
              placeholderTextColor={palette.muted}
              textAlignVertical="top"
              style={[
                styles.transferInput,
                {
                  color: palette.text,
                  backgroundColor: palette.background,
                  borderColor: palette.border,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
            />
            {transferError ? (
              <Text style={[styles.transferError, { color: palette.oliveStrong }]}>
                {transferError}
              </Text>
            ) : null}
            {transferMode === 'export' ? (
              Platform.OS === 'web' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void copyExport()}
                  style={[styles.primaryButton, { backgroundColor: palette.olive }]}
                >
                  <Text style={styles.primaryButtonText}>
                    {t('copyExport', language)}
                  </Text>
                </Pressable>
              ) : null
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => void importBookmarks()}
                style={[styles.primaryButton, { backgroundColor: palette.olive }]}
              >
                <Text style={styles.primaryButtonText}>
                  {t('importBookmarks', language)}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

interface ActionButtonProps {
  palette: (typeof themes)[keyof typeof themes];
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}

function ActionButton({ palette, icon, label, onPress }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={19} color={palette.olive} />
      <Text style={[styles.actionLabel, { color: palette.oliveStrong }]}>
        {label}
      </Text>
    </Pressable>
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
  transferActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  actionLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  bookmarkList: {
    gap: spacing.sm,
  },
  bookmarkCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  bookmarkContent: {
    flex: 1,
    gap: spacing.xs,
  },
  bookmarkHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  colorDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  surahName: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  reference: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  ayahText: {
    fontFamily: fonts.quran,
    fontSize: 21,
    lineHeight: 37,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  note: {
    fontFamily: fonts.interface,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'auto',
  },
  category: {
    alignSelf: 'flex-start',
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  removeButton: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedback: {
    padding: spacing.md,
    fontFamily: fonts.interface,
    fontSize: 14,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000066',
  },
  transferSheet: {
    maxHeight: '85%',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  modalHeader: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  transferHint: {
    fontFamily: fonts.interface,
    fontSize: 12,
    textAlign: 'auto',
  },
  transferInput: {
    minHeight: 220,
    maxHeight: 420,
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.sm,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  transferError: {
    fontFamily: fonts.interface,
    fontSize: 12,
  },
  primaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 14,
  },
});
