import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  hexToRgba,
  contrastText,
} from '../constants/theme';

// ─── Types ───────────────────────────────────────────────────

export interface FolderCardProps {
  name: string;
  color: string;           // hex from COLORS.folders palette
  trackCount: number;
  artworks?: (string | null)[]; // up to 4 cover URIs for collage
  onPress: () => void;
  onLongPress?: () => void;
}

// ─── Artwork collage (2×2 grid inside card) ──────────────────

const ArtworkCollage: React.FC<{
  artworks: (string | null)[];
  color: string;
}> = ({ artworks, color }) => {
  const filled = [...artworks, null, null, null, null].slice(0, 4);
  const hasAny = artworks.some(Boolean);

  if (!hasAny) {
    return (
      <View style={[styles.collageSingle, { backgroundColor: hexToRgba(color, 0.3) }]}>
        <Text style={[styles.collageIcon, { color }]}>♪</Text>
      </View>
    );
  }

  if (artworks.filter(Boolean).length === 1) {
    return filled[0] ? (
      <Image source={{ uri: filled[0]! }} style={styles.collageSingle} />
    ) : (
      <View style={[styles.collageSingle, { backgroundColor: hexToRgba(color, 0.3) }]} />
    );
  }

  return (
    <View style={styles.collageGrid}>
      {filled.map((uri, i) =>
        uri ? (
          <Image key={i} source={{ uri }} style={styles.collageCell} />
        ) : (
          <View
            key={i}
            style={[styles.collageCell, { backgroundColor: hexToRgba(color, 0.2) }]}
          />
        )
      )}
    </View>
  );
};

// ─── Main Component ──────────────────────────────────────────

export const FolderCard: React.FC<FolderCardProps> = ({
  name,
  color,
  trackCount,
  artworks = [],
  onPress,
  onLongPress,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const textColor = contrastText(color);

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.95,
      tension: 80,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 80,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.card}
      >
        {/* Color accent strip at top */}
        <View style={[styles.colorStrip, { backgroundColor: color }]} />

        {/* Artwork collage */}
        <View style={styles.collageContainer}>
          <ArtworkCollage artworks={artworks} color={color} />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.countRow}>
            <View style={[styles.countBadge, { backgroundColor: hexToRgba(color, 0.18) }]}>
              <Text style={[styles.countText, { color }]}>
                {trackCount} {trackCount === 1 ? 'música' : 'músicas'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const COLLAGE_SIZE = 130;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.bg.surface,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    ...SHADOWS.md,
  },

  // ── Color strip ──
  colorStrip: {
    height: 3,
    width: '100%',
  },

  // ── Collage ──
  collageContainer: {
    width: '100%',
    height: COLLAGE_SIZE,
    backgroundColor: COLORS.bg.highlight,
    overflow: 'hidden',
  },
  collageSingle: {
    width: '100%',
    height: COLLAGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collageIcon: {
    fontSize: 48,
    opacity: 0.7,
  },
  collageGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  collageCell: {
    width: '50%',
    height: COLLAGE_SIZE / 2,
  },

  // ── Footer ──
  footer: {
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  name: {
    ...TYPOGRAPHY.titleLarge,
    color: COLORS.text.primary,
  },
  countRow: {
    flexDirection: 'row',
  },
  countBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.chip,
  },
  countText: {
    ...TYPOGRAPHY.label,
    fontWeight: '600',
  },
});
