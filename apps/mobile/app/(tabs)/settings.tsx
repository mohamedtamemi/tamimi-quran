import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '../../src/components/BrandHeader';
import { APP_CONFIG } from '../../src/config';
import { t } from '../../src/i18n';
import { useAppStore } from '../../src/store/app-store';
import { fonts, radii, spacing, themes, type ThemeMode } from '../../src/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useAppStore((state) => state.theme);
  const language = useAppStore((state) => state.language);
  const fontSize = useAppStore((state) => state.fontSize);
  const setTheme = useAppStore((state) => state.setTheme);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setFontSize = useAppStore((state) => state.setFontSize);
  const palette = themes[theme];
  const [isThemeMenuOpen, setThemeMenuOpen] = useState(false);

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'paper', label: t('paperTheme', language) },
    { value: 'light', label: t('lightTheme', language) },
    { value: 'dark', label: t('darkTheme', language) },
  ];

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: palette.background }]}
    >
      <BrandHeader
        palette={palette}
        language={language}
        title={t('settings', language)}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <SettingSection
          palette={palette}
          title={t('appearance', language)}
          icon="palette-outline"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isThemeMenuOpen }}
            onPress={() => setThemeMenuOpen((open) => !open)}
            style={[styles.settingRow, { borderBottomColor: palette.border }]}
          >
            <Text style={[styles.settingLabel, { color: palette.text }]}>
              {t('appearance', language)}
            </Text>
            <View style={styles.selectedValue}>
              <Text style={[styles.valueText, { color: palette.olive }]}>
                {themeOptions.find((option) => option.value === theme)?.label}
              </Text>
              <MaterialCommunityIcons
                name={isThemeMenuOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={palette.muted}
              />
            </View>
          </Pressable>
          {isThemeMenuOpen ? (
            <View style={styles.options}>
              {themeOptions.map((option) => (
                <OptionButton
                  key={option.value}
                  palette={palette}
                  label={option.label}
                  selected={theme === option.value}
                  onPress={() => {
                    setTheme(option.value);
                    setThemeMenuOpen(false);
                  }}
                />
              ))}
            </View>
          ) : null}
        </SettingSection>

        <SettingSection
          palette={palette}
          title={t('language', language)}
          icon="translate"
        >
          <View style={styles.options}>
            <OptionButton
              palette={palette}
              label={t('arabic', language)}
              selected={language === 'ar'}
              onPress={() => setLanguage('ar')}
            />
            <OptionButton
              palette={palette}
              label={t('english', language)}
              selected={language === 'en'}
              onPress={() => setLanguage('en')}
            />
          </View>
        </SettingSection>

        <SettingSection
          palette={palette}
          title={t('quranFontSize', language)}
          icon="format-size"
        >
          <View style={styles.fontSizeRow}>
            <Text style={[styles.settingLabel, { color: palette.text }]}>
              {t('quranFontSize', language)}
            </Text>
            <View style={styles.fontControls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('reduceFont', language)}
                accessibilityState={{ disabled: fontSize <= 18 }}
                disabled={fontSize <= 18}
                onPress={() => setFontSize(Math.max(18, fontSize - 2))}
                style={[
                  styles.fontButton,
                  { backgroundColor: palette.soft, opacity: fontSize <= 18 ? 0.45 : 1 },
                ]}
              >
                <MaterialCommunityIcons name="minus" size={20} color={palette.olive} />
              </Pressable>
              <Text
                accessibilityLabel={`${fontSize}`}
                style={[styles.fontSizeText, { color: palette.oliveStrong }]}
              >
                {fontSize}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('increaseFont', language)}
                accessibilityState={{ disabled: fontSize >= 34 }}
                disabled={fontSize >= 34}
                onPress={() => setFontSize(Math.min(34, fontSize + 2))}
                style={[
                  styles.fontButton,
                  { backgroundColor: palette.soft, opacity: fontSize >= 34 ? 0.45 : 1 },
                ]}
              >
                <MaterialCommunityIcons name="plus" size={20} color={palette.olive} />
              </Pressable>
            </View>
          </View>
        </SettingSection>

        <SettingSection
          palette={palette}
          title={t('aboutApp', language)}
          icon="information-outline"
        >
          <Text style={[styles.attribution, { color: palette.muted }]}>
            {APP_CONFIG.quranCorpus.attribution[language]}
          </Text>
          <Text style={[styles.sourceLink, { color: palette.olive }]}>
            {APP_CONFIG.quranCorpus.sourceUrl}
          </Text>
          <Text style={[styles.sourceLink, { color: palette.olive }]}>
            {APP_CONFIG.quranCorpus.licenseUrl}
          </Text>
          <Text style={[styles.attribution, { color: palette.muted }]}>
            {t('audioRightsNotice', language)}
          </Text>
        </SettingSection>

        <View
          style={[
            styles.phaseNote,
            { backgroundColor: palette.soft, direction: language === 'ar' ? 'rtl' : 'ltr' },
          ]}
        >
          <MaterialCommunityIcons
            name="information-outline"
            size={18}
            color={palette.olive}
          />
          <Text style={[styles.phaseText, { color: palette.oliveStrong }]}>
            {t('aboutPhaseThree', language)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface SettingSectionProps {
  palette: (typeof themes)[keyof typeof themes];
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  children: ReactNode;
}

function SettingSection({
  palette,
  title,
  icon,
  children,
}: SettingSectionProps) {
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: palette.soft }]}>
          <MaterialCommunityIcons name={icon} size={19} color={palette.olive} />
        </View>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

interface OptionButtonProps {
  palette: (typeof themes)[keyof typeof themes];
  label: string;
  selected: boolean;
  onPress: () => void;
}

function OptionButton({
  palette,
  label,
  selected,
  onPress,
}: OptionButtonProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.option,
        {
          borderColor: selected ? palette.olive : palette.border,
          backgroundColor: selected ? palette.soft : palette.surface,
        },
      ]}
    >
      <Text style={[styles.optionText, { color: selected ? palette.oliveStrong : palette.text }]}>
        {label}
      </Text>
      {selected ? (
        <MaterialCommunityIcons name="check-circle" size={18} color={palette.olive} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  section: {
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  settingRow: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  settingLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'auto',
  },
  selectedValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  options: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  option: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.sm,
  },
  optionText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  fontSizeRow: {
    minHeight: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#00000012',
  },
  fontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fontButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  fontSizeText: {
    minWidth: 28,
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'center',
  },
  attribution: {
    fontFamily: fonts.interface,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'auto',
  },
  sourceLink: {
    fontFamily: fonts.interface,
    fontSize: 11,
    textAlign: 'auto',
  },
  phaseNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  phaseText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    textAlign: 'auto',
  },
});
