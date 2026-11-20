import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t, type Language } from '../i18n';
import { fonts, radii, spacing, type Palette } from '../theme';
import { toArabicDigits } from '../utils/arabic';
import type { SurahSummary } from '../data/quran-repository';

interface SurahCardProps {
  surah: SurahSummary;
  palette: Palette;
  language: Language;
  onPress: () => void;
}

export function SurahCard({
  surah,
  palette,
  language,
  onPress,
}: SurahCardProps) {
  const isRTL = language === 'ar';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('openSurah', language)} ${surah.name_ar}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          opacity: pressed ? 0.86 : 1,
          direction: isRTL ? 'rtl' : 'ltr',
        },
      ]}
    >
      <View style={[styles.numberSeal, { borderColor: palette.gold }]}>
        <View style={[styles.numberInner, { backgroundColor: palette.soft }]}>
          <Text style={[styles.number, { color: palette.oliveStrong }]}>
            {toArabicDigits(surah.id)}
          </Text>
        </View>
      </View>

      <View style={styles.copy}>
        <Text
          numberOfLines={1}
          style={[styles.arabicName, { color: palette.text }]}
        >
          {surah.name_ar}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.latinName, { color: palette.muted }]}
        >
          {language === 'ar' ? surah.transliteration : surah.name_en}
        </Text>
        <Text style={[styles.meta, { color: palette.olive }]}>
          {toArabicDigits(surah.ayah_count)} {t('ayahs', language)}
          {'  ·  '}
          {t(surah.revelation === 'meccan' ? 'meccan' : 'medinan', language)}
        </Text>
      </View>

      <MaterialCommunityIcons
        name={isRTL ? 'chevron-left' : 'chevron-right'}
        size={21}
        color={palette.muted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  numberSeal: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 13,
    transform: [{ rotate: '45deg' }],
  },
  numberInner: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  number: {
    fontFamily: fonts.medium,
    fontSize: 13,
    transform: [{ rotate: '-45deg' }],
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  arabicName: {
    fontFamily: fonts.quran,
    fontSize: 19,
    textAlign: 'auto',
  },
  latinName: {
    marginTop: 1,
    fontFamily: fonts.interface,
    fontSize: 11,
    textAlign: 'auto',
  },
  meta: {
    marginTop: 3,
    fontFamily: fonts.medium,
    fontSize: 10,
    textAlign: 'start',
  },
});
