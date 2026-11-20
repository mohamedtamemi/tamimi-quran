import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { fonts, radii, spacing, type Palette } from '../theme';

interface MushafPageProps {
  palette: Palette;
  surahName: string;
  juzLabel: string;
  children: ReactNode;
}

export function MushafPage({
  palette,
  surahName,
  juzLabel,
  children,
}: MushafPageProps) {
  return (
    <View
      style={[
        styles.page,
        { backgroundColor: palette.paper, borderColor: palette.gold },
      ]}
    >
      <View
        style={[
          styles.innerFrame,
          { borderColor: palette.border, backgroundColor: palette.paper },
        ]}
      >
        <View style={[styles.corner, styles.topStart, { backgroundColor: palette.gold }]} />
        <View style={[styles.corner, styles.topEnd, { backgroundColor: palette.gold }]} />
        <View style={[styles.corner, styles.bottomStart, { backgroundColor: palette.gold }]} />
        <View style={[styles.corner, styles.bottomEnd, { backgroundColor: palette.gold }]} />

        <View
          style={[
            styles.meta,
            {
              borderBottomColor: palette.border,
              direction: 'rtl',
            },
          ]}
        >
          <Text style={[styles.metaText, { color: palette.oliveStrong }]}>
            {surahName}
          </Text>
          <Text style={[styles.metaText, { color: palette.oliveStrong }]}>
            {juzLabel}
          </Text>
        </View>

        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: 360,
    padding: 8,
    borderWidth: 1,
    borderRadius: radii.sm,
    shadowColor: '#4C452F',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  innerFrame: {
    flex: 1,
    minHeight: 340,
    position: 'relative',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 6,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metaText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  corner: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  topStart: {
    top: 5,
    left: 5,
  },
  topEnd: {
    top: 5,
    right: 5,
  },
  bottomStart: {
    bottom: 5,
    left: 5,
  },
  bottomEnd: {
    bottom: 5,
    right: 5,
  },
});
