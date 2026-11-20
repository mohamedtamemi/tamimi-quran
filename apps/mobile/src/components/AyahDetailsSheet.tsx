import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { APP_CONFIG } from '../config';
import {
  createQuranRepository,
  type Bookmark,
  type BookmarkColor,
  type CommentaryEntry,
} from '../data/quran-repository';
import { t } from '../i18n';
import { useAppStore } from '../store/app-store';
import {
  bookmarkColors,
  fonts,
  radii,
  spacing,
  themes,
  type Palette,
} from '../theme';
import { toArabicDigits } from '../utils/arabic';

type DetailTab = 'tafsir' | 'irab' | 'bookmark';

interface AyahDetailsSheetProps {
  visible: boolean;
  surahId: number;
  ayahNumber: number;
  ayahText: string;
  repository: ReturnType<typeof createQuranRepository>;
  onClose: () => void;
}

interface CommentaryState {
  key: string;
  entry: CommentaryEntry | null;
  failed: boolean;
}

const colorLabels: Record<BookmarkColor, 'colorOlive' | 'colorGold' | 'colorBlue' | 'colorRose'> = {
  olive: 'colorOlive',
  gold: 'colorGold',
  blue: 'colorBlue',
  rose: 'colorRose',
};

export function AyahDetailsSheet({
  visible,
  surahId,
  ayahNumber,
  ayahText,
  repository,
  onClose,
}: AyahDetailsSheetProps) {
  const language = useAppStore((state) => state.language);
  const theme = useAppStore((state) => state.theme);
  const palette = themes[theme];
  const [activeTab, setActiveTab] = useState<DetailTab>('tafsir');
  const [sourceId, setSourceId] = useState<
    (typeof APP_CONFIG.tafsirSources)[number]['id']
  >(
    APP_CONFIG.tafsirSources[0].id,
  );
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState<BookmarkColor>('olive');
  const [bookmarkState, setBookmarkState] = useState<{
    key: string;
    failed: boolean;
  }>({ key: '', failed: false });
  const [tafsirState, setTafsirState] = useState<CommentaryState>({
    key: '',
    entry: null,
    failed: false,
  });
  const [irabState, setIrabState] = useState<CommentaryState>({
    key: '',
    entry: null,
    failed: false,
  });
  const [feedback, setFeedback] = useState('');
  const isRTL = language === 'ar';
  const bookmarkKey = `${surahId}:${ayahNumber}`;
  const tafsirKey = `${bookmarkKey}:${sourceId}`;

  useEffect(() => {
    if (!visible) return;
    let active = true;
    repository
      .getBookmark(surahId, ayahNumber)
      .then((item) => {
        if (!active) return;
        setBookmark(item);
        setNote(item?.note ?? '');
        setCategory(item?.category ?? '');
        setColor(item?.color ?? 'olive');
        setBookmarkState({ key: bookmarkKey, failed: false });
      })
      .catch(() => {
        if (active) setBookmarkState({ key: bookmarkKey, failed: true });
      });

    return () => {
      active = false;
    };
  }, [bookmarkKey, ayahNumber, repository, surahId, visible]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    repository
      .getTafsir(surahId, ayahNumber, sourceId)
      .then((entry) => {
        if (active) setTafsirState({ key: tafsirKey, entry, failed: false });
      })
      .catch(() => {
        if (active) setTafsirState({ key: tafsirKey, entry: null, failed: true });
      });

    return () => {
      active = false;
    };
  }, [ayahNumber, repository, sourceId, surahId, tafsirKey, visible]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    repository
      .getIrab(surahId, ayahNumber)
      .then((entry) => {
        if (active) setIrabState({ key: bookmarkKey, entry, failed: false });
      })
      .catch(() => {
        if (active) setIrabState({ key: bookmarkKey, entry: null, failed: true });
      });

    return () => {
      active = false;
    };
  }, [ayahNumber, bookmarkKey, repository, surahId, visible]);

  const saveBookmark = async () => {
    try {
      await repository.saveBookmark({
        surah_id: surahId,
        ayah_number: ayahNumber,
        note: note.trim(),
        category: category.trim(),
        color,
      });
      setBookmark(await repository.getBookmark(surahId, ayahNumber));
      setBookmarkState({ key: bookmarkKey, failed: false });
      setFeedback(t('saved', language));
    } catch {
      setFeedback(t('bookmarkSaveError', language));
    }
  };

  const removeBookmark = async () => {
    try {
      await repository.removeBookmark(surahId, ayahNumber);
      setBookmark(null);
      setNote('');
      setCategory('');
      setColor('olive');
      setFeedback(t('deleted', language));
    } catch {
      setFeedback(t('bookmarkSaveError', language));
    }
  };

  const detailTabs: DetailTab[] = ['tafsir', 'irab', 'bookmark'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <View style={[styles.header, { direction: isRTL ? 'rtl' : 'ltr' }]}>
            <Text style={[styles.title, { color: palette.oliveStrong }]}>
              {t('ayah', language)} {toArabicDigits(ayahNumber)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('close', language)}
              onPress={onClose}
              hitSlop={8}
              style={styles.closeButton}
            >
              <MaterialCommunityIcons
                name="close"
                size={23}
                color={palette.muted}
              />
            </Pressable>
          </View>

          <Text style={[styles.ayahText, { color: palette.text }]}>
            {ayahText}
          </Text>

          <View style={[styles.tabs, { direction: isRTL ? 'rtl' : 'ltr' }]}>
            {detailTabs.map((tab) => (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === tab }}
                onPress={() => {
                  setActiveTab(tab);
                  setFeedback('');
                }}
                style={[
                  styles.tab,
                  {
                    backgroundColor:
                      activeTab === tab ? palette.surface : palette.soft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === tab ? palette.oliveStrong : palette.muted },
                  ]}
                >
                  {t(tab, language)}
                </Text>
              </Pressable>
            ))}
          </View>

          {activeTab === 'tafsir' ? (
            <View style={styles.panel}>
              <Text style={[styles.sectionLabel, { color: palette.muted }]}>
                {t('tafsirSource', language)}
              </Text>
              <View style={[styles.sourceOptions, { direction: isRTL ? 'rtl' : 'ltr' }]}>
                {APP_CONFIG.tafsirSources.map((source) => (
                  <Pressable
                    key={source.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: sourceId === source.id }}
                    onPress={() => setSourceId(source.id)}
                    style={[
                      styles.sourceOption,
                      {
                        borderColor:
                          sourceId === source.id ? palette.olive : palette.border,
                        backgroundColor:
                          sourceId === source.id ? palette.soft : palette.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sourceText,
                        {
                          color:
                            sourceId === source.id
                              ? palette.oliveStrong
                              : palette.text,
                        },
                      ]}
                    >
                      {source.name[language]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {tafsirState.key !== tafsirKey ? (
                <Message palette={palette} text={t('loading', language)} />
              ) : tafsirState.failed ? (
                <Message palette={palette} text={t('loadError', language)} />
              ) : tafsirState.entry ? (
                <CommentaryContent
                  entry={tafsirState.entry}
                  palette={palette}
                  language={language}
                />
              ) : (
                <Message palette={palette} text={t('tafsirUnavailable', language)} />
              )}
            </View>
          ) : activeTab === 'irab' ? (
            <View style={styles.panel}>
              {irabState.key !== bookmarkKey ? (
                <Message palette={palette} text={t('loading', language)} />
              ) : irabState.failed ? (
                <Message palette={palette} text={t('loadError', language)} />
              ) : irabState.entry ? (
                <CommentaryContent
                  entry={irabState.entry}
                  palette={palette}
                  language={language}
                />
              ) : (
                <Message palette={palette} text={t('irabUnavailable', language)} />
              )}
            </View>
          ) : (
            <ScrollView
              style={styles.panel}
              contentContainerStyle={styles.bookmarkForm}
              keyboardShouldPersistTaps="handled"
            >
              {bookmarkState.key !== bookmarkKey ? (
                <Message palette={palette} text={t('loading', language)} />
              ) : bookmarkState.failed ? (
                <Message palette={palette} text={t('loadError', language)} />
              ) : (
                <>
                  <TextInput
                    accessibilityLabel={t('bookmarkNote', language)}
                    value={note}
                    onChangeText={setNote}
                    placeholder={t('bookmarkNoteHint', language)}
                    placeholderTextColor={palette.muted}
                    maxLength={2000}
                    multiline
                    textAlignVertical="top"
                    style={[
                      styles.textInput,
                      {
                        color: palette.text,
                        backgroundColor: palette.background,
                        borderColor: palette.border,
                        textAlign: isRTL ? 'right' : 'left',
                      },
                    ]}
                  />
                  <TextInput
                    accessibilityLabel={t('bookmarkCategory', language)}
                    value={category}
                    onChangeText={setCategory}
                    placeholder={t('bookmarkCategoryHint', language)}
                    placeholderTextColor={palette.muted}
                    maxLength={80}
                    style={[
                      styles.textInput,
                      styles.categoryInput,
                      {
                        color: palette.text,
                        backgroundColor: palette.background,
                        borderColor: palette.border,
                        textAlign: isRTL ? 'right' : 'left',
                      },
                    ]}
                  />
                  <Text style={[styles.sectionLabel, { color: palette.muted }]}>
                    {t('bookmark', language)}
                  </Text>
                  <View style={[styles.colorOptions, { direction: isRTL ? 'rtl' : 'ltr' }]}>
                    {(Object.keys(bookmarkColors) as BookmarkColor[]).map((value) => (
                      <Pressable
                        key={value}
                        accessibilityRole="radio"
                        accessibilityLabel={t(colorLabels[value], language)}
                        accessibilityState={{ selected: color === value }}
                        onPress={() => setColor(value)}
                        style={[
                          styles.colorOption,
                          {
                            borderColor:
                              color === value ? palette.text : palette.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: bookmarkColors[value] },
                          ]}
                        />
                      </Pressable>
                    ))}
                  </View>
                  {feedback ? (
                    <Text style={[styles.feedback, { color: palette.oliveStrong }]}>
                      {feedback}
                    </Text>
                  ) : null}
                  <View style={[styles.formActions, { direction: isRTL ? 'rtl' : 'ltr' }]}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void saveBookmark()}
                      style={[styles.primaryButton, { backgroundColor: palette.olive }]}
                    >
                      <Text style={styles.primaryButtonText}>
                        {t('saveBookmark', language)}
                      </Text>
                    </Pressable>
                    {bookmark ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void removeBookmark()}
                        style={[
                          styles.secondaryButton,
                          { borderColor: palette.border },
                        ]}
                      >
                        <Text style={[styles.secondaryButtonText, { color: palette.text }]}>
                          {t('removeBookmark', language)}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Message({ palette, text }: { palette: Palette; text: string }) {
  return (
    <Text style={[styles.message, { color: palette.muted, textAlign: 'auto' }]}>
      {text}
    </Text>
  );
}

function CommentaryContent({
  entry,
  palette,
  language,
}: {
  entry: CommentaryEntry;
  palette: Palette;
  language: 'ar' | 'en';
}) {
  return (
    <ScrollView style={styles.commentary}>
      <Text style={[styles.commentaryText, { color: palette.text }]}>
        {entry.text}
      </Text>
      <Text style={[styles.citationLabel, { color: palette.oliveStrong }]}>
        {t('sourceLicense', language)}
      </Text>
      <Text style={[styles.citation, { color: palette.muted }]}>
        {entry.source_name} · {entry.license}
      </Text>
      <Text selectable style={[styles.citation, { color: palette.muted }]}>
        {entry.source_url}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000066',
  },
  sheet: {
    height: '78%',
    maxHeight: 760,
    minHeight: 430,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  header: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  closeButton: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ayahText: {
    maxHeight: 120,
    paddingVertical: spacing.sm,
    fontFamily: fonts.quran,
    fontSize: 22,
    lineHeight: 38,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  tabText: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  panel: {
    flex: 1,
    marginTop: spacing.sm,
  },
  sourceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  sourceOption: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.pill,
  },
  sourceText: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  sectionLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    textAlign: 'auto',
  },
  commentary: {
    flex: 1,
  },
  commentaryText: {
    fontFamily: fonts.interface,
    fontSize: 15,
    lineHeight: 25,
    textAlign: 'auto',
  },
  citationLabel: {
    marginTop: spacing.lg,
    fontFamily: fonts.bold,
    fontSize: 12,
    textAlign: 'auto',
  },
  citation: {
    marginTop: spacing.xs,
    fontFamily: fonts.interface,
    fontSize: 11,
    textAlign: 'auto',
  },
  message: {
    padding: spacing.md,
    fontFamily: fonts.interface,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  bookmarkForm: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  textInput: {
    minHeight: 46,
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.sm,
    fontFamily: fonts.interface,
    fontSize: 14,
  },
  categoryInput: {
    minHeight: 42,
  },
  colorOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  colorOption: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: radii.pill,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
  },
  feedback: {
    fontFamily: fonts.medium,
    fontSize: 12,
    textAlign: 'auto',
  },
  formActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  primaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radii.sm,
  },
  secondaryButtonText: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
});
