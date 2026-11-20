import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { fonts, radii, spacing, type Palette } from '../theme';
import { toArabicDigits } from '../utils/arabic';

interface MushafPageProps {
  palette: Palette;
  surahName: string;
  juzLabel: string;
  pageNumber: number;
  onBodyLayout?: (height: number) => void;
  children: ReactNode;
}

export function MushafPage({
  palette,
  surahName,
  juzLabel,
  pageNumber,
  onBodyLayout,
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
        <Corner palette={palette} style={styles.topStart} />
        <Corner palette={palette} style={styles.topEnd} />
        <Corner palette={palette} style={styles.bottomStart} />
        <Corner palette={palette} style={styles.bottomEnd} />

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

        <Ornament palette={palette} />
        <View
          onLayout={(event) => onBodyLayout?.(event.nativeEvent.layout.height)}
          style={styles.body}
        >
          {children}
        </View>
        <Ornament palette={palette} />

        <View style={styles.footer}>
          <View style={[styles.footerLine, { backgroundColor: palette.border }]} />
          <View
            style={[
              styles.pageNumber,
              { borderColor: palette.gold, backgroundColor: palette.paper },
            ]}
          >
            <Text style={[styles.pageNumberText, { color: palette.oliveStrong }]}>
              {toArabicDigits(pageNumber)}
            </Text>
          </View>
          <View style={[styles.footerLine, { backgroundColor: palette.border }]} />
        </View>
      </View>
    </View>
  );
}

function Corner({
  palette,
  style,
}: {
  palette: Palette;
  style: StyleProp<ViewStyle>;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.corner,
        style,
        { borderColor: palette.gold, backgroundColor: palette.paper },
      ]}
    >
      <View style={[styles.cornerDot, { backgroundColor: palette.olive }]} />
    </View>
  );
}

function Ornament({ palette }: { palette: Palette }) {
  return (
    <View accessibilityElementsHidden style={styles.ornament}>
      <View style={[styles.ornamentLine, { backgroundColor: palette.border }]} />
      <View style={styles.ornamentCenter}>
        <View style={[styles.ornamentDiamond, { backgroundColor: palette.gold }]} />
        <View style={[styles.ornamentDot, { backgroundColor: palette.olive }]} />
        <View style={[styles.ornamentDiamond, { backgroundColor: palette.gold }]} />
      </View>
      <View style={[styles.ornamentLine, { backgroundColor: palette.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: 0,
    padding: 7,
    borderWidth: 2,
    borderRadius: radii.sm,
    shadowColor: '#4C452F',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  innerFrame: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderRadius: 6,
  },
  meta: {
    minHeight: 29,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metaText: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  body: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  ornament: {
    height: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  ornamentLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  ornamentCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ornamentDiamond: {
    width: 5,
    height: 5,
    transform: [{ rotate: '45deg' }],
  },
  ornamentDot: {
    width: 3,
    height: 3,
    borderRadius: radii.pill,
  },
  footer: {
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  footerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  pageNumber: {
    minWidth: 32,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
  },
  pageNumberText: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  corner: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    zIndex: 1,
  },
  cornerDot: {
    width: 3,
    height: 3,
    borderRadius: radii.pill,
  },
  topStart: {
    top: 8,
    left: 3,
  },
  topEnd: {
    top: 8,
    right: 3,
  },
  bottomStart: {
    bottom: 8,
    left: 3,
  },
  bottomEnd: {
    bottom: 8,
    right: 3,
  },
});
