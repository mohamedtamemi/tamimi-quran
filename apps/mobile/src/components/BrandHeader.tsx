import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Language } from '../i18n';
import { fonts, radii, spacing, type Palette } from '../theme';

interface BrandHeaderProps {
  palette: Palette;
  language: Language;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onSettings?: () => void;
}

export function BrandHeader({
  palette,
  language,
  title,
  subtitle,
  onBack,
  onSettings,
}: BrandHeaderProps) {
  const isRTL = language === 'ar';

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: palette.surface,
          borderBottomColor: palette.border,
          direction: isRTL ? 'rtl' : 'ltr',
        },
      ]}
    >
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isRTL ? 'رجوع' : 'Back'}
          onPress={onBack}
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: pressed ? palette.soft : 'transparent' },
          ]}
        >
          <MaterialCommunityIcons
            name={isRTL ? 'arrow-right' : 'arrow-left'}
            size={22}
            color={palette.olive}
          />
        </Pressable>
      ) : (
        <View style={[styles.brandMark, { backgroundColor: palette.soft }]}>
          <MaterialCommunityIcons
            name="book-open-page-variant"
            size={22}
            color={palette.olive}
          />
        </View>
      )}

      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {onSettings ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isRTL ? 'الإعدادات' : 'Settings'}
          onPress={onSettings}
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: pressed ? palette.soft : 'transparent' },
          ]}
        >
          <MaterialCommunityIcons
            name="cog-outline"
            size={22}
            color={palette.olive}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandMark: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'auto',
  },
  subtitle: {
    marginTop: 1,
    fontFamily: fonts.interface,
    fontSize: 12,
    textAlign: 'auto',
  },
});
