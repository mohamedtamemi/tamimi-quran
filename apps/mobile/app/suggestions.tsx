import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '../src/components/BrandHeader';
import { APP_CONFIG } from '../src/config';
import { t } from '../src/i18n';
import { useAppStore } from '../src/store/app-store';
import { fonts, radii, spacing, themes } from '../src/theme';

export default function SuggestionsScreen() {
  const router = useRouter();
  const language = useAppStore((state) => state.language);
  const theme = useAppStore((state) => state.theme);
  const palette = themes[theme];
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');

  const openGitHub = async (url: string) => {
    setError('');
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      setError(t('suggestionError', language));
    }
  };

  const openDraft = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t('suggestionNeedsTitle', language));
      return;
    }

    const parameters = new URLSearchParams({
      title: trimmedTitle,
      body: details.trim(),
    });
    void openGitHub(`${APP_CONFIG.featureFeedback.newIssueUrl}?${parameters.toString()}`);
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: palette.background }]}
    >
      <BrandHeader
        palette={palette}
        language={language}
        title={t('featureSuggestions', language)}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.notice,
            { backgroundColor: palette.soft, direction: language === 'ar' ? 'rtl' : 'ltr' },
          ]}
        >
          <MaterialCommunityIcons
            name="information-outline"
            size={20}
            color={palette.olive}
          />
          <Text style={[styles.body, { color: palette.oliveStrong }]}>
            {t('suggestionsIntro', language)}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              direction: language === 'ar' ? 'rtl' : 'ltr',
            },
          ]}
        >
          <Text style={[styles.label, { color: palette.text }]}>
            {t('suggestionTitle', language)}
          </Text>
          <TextInput
            accessibilityLabel={t('suggestionTitle', language)}
            value={title}
            onChangeText={setTitle}
            placeholder={t('suggestionTitleHint', language)}
            placeholderTextColor={palette.muted}
            maxLength={120}
            style={[
              styles.input,
              {
                color: palette.text,
                borderColor: palette.border,
                backgroundColor: palette.paper,
                textAlign: language === 'ar' ? 'right' : 'left',
              },
            ]}
          />
          <Text style={[styles.label, { color: palette.text }]}>
            {t('suggestionDetails', language)}
          </Text>
          <TextInput
            accessibilityLabel={t('suggestionDetails', language)}
            value={details}
            onChangeText={setDetails}
            placeholder={t('suggestionDetailsHint', language)}
            placeholderTextColor={palette.muted}
            multiline
            maxLength={1500}
            textAlignVertical="top"
            style={[
              styles.detailsInput,
              {
                color: palette.text,
                borderColor: palette.border,
                backgroundColor: palette.paper,
                textAlign: language === 'ar' ? 'right' : 'left',
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            onPress={openDraft}
            style={[styles.primaryButton, { backgroundColor: palette.olive }]}
          >
            <MaterialCommunityIcons
              name="open-in-new"
              size={19}
              color={palette.surface}
            />
            <Text style={[styles.primaryLabel, { color: palette.surface }]}>
              {t('openSuggestionDraft', language)}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void openGitHub(APP_CONFIG.featureFeedback.issueListUrl)}
            style={[
              styles.secondaryButton,
              { borderColor: palette.border, backgroundColor: palette.paper },
            ]}
          >
            <MaterialCommunityIcons
              name="thumb-up-outline"
              size={19}
              color={palette.olive}
            />
            <Text style={[styles.secondaryLabel, { color: palette.oliveStrong }]}>
              {t('browseSuggestions', language)}
            </Text>
          </Pressable>
          <Text style={[styles.note, { color: palette.muted }]}>
            {t('githubSignInNote', language)}
          </Text>
          {error ? (
            <Text accessibilityRole="alert" style={[styles.error, { color: palette.oliveStrong }]}>
              {error}
            </Text>
          ) : null}
        </View>
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
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
  },
  body: {
    flex: 1,
    fontFamily: fonts.interface,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'auto',
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.interface,
    fontSize: 15,
  },
  detailsInput: {
    minHeight: 150,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    fontFamily: fonts.interface,
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    borderRadius: radii.md,
  },
  primaryLabel: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  secondaryButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  secondaryLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  note: {
    fontFamily: fonts.interface,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'auto',
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
});
