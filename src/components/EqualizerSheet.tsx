import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, PanResponder } from 'react-native';
import Slider from '@react-native-community/slider';
import { usePlayerStore } from '../store/usePlayerStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, hexToRgba } from '../constants/theme';

interface EqualizerSheetProps {
  visible: boolean;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const BANDS_LABELS = ['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'];

const PRESETS = [
  { name: 'Flat', bands: [0, 0, 0, 0, 0] },
  { name: 'Bass Boost', bands: [8, 5, 0, 0, 0] },
  { name: 'Treble', bands: [0, 0, 2, 6, 8] },
];

export const EqualizerSheet: React.FC<EqualizerSheetProps> = ({ visible, onClose }) => {
  const eqPreset = usePlayerStore(s => s.eqPreset);
  const eqBands = usePlayerStore(s => s.eqBands);
  const setEqPreset = usePlayerStore(s => s.setEqPreset);
  const setEqBand = usePlayerStore(s => s.setEqBand);

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100) {
          onClose();
        } else {
          Animated.spring(translateY, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }).start();
        }
      }
    })
  ).current;

  if (!visible && fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) as unknown as number === 0) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} pointerEvents={visible ? 'auto' : 'none'}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Equalizador</Text>
          <Text style={styles.subtitle}>UI de Teste (Não aplicável no expo-av)</Text>
        </View>

        <View style={styles.presetsRow}>
          {PRESETS.map((preset) => {
            const isActive = eqPreset === preset.name;
            return (
              <TouchableOpacity
                key={preset.name}
                style={[styles.presetButton, isActive && styles.presetButtonActive]}
                onPress={() => setEqPreset(preset.name, preset.bands)}
              >
                <Text style={[styles.presetText, isActive && styles.presetTextActive]}>
                  {preset.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.bandsContainer}>
          {eqBands.map((val, idx) => (
            <View key={idx} style={styles.bandColumn}>
              <Text style={styles.bandValue}>{(val > 0 ? '+' : '') + Math.round(val)}</Text>
              <View style={styles.sliderWrapper}>
                <Slider
                  style={styles.slider}
                  minimumValue={-12}
                  maximumValue={12}
                  value={val}
                  onValueChange={(v) => setEqBand(idx, v)}
                  minimumTrackTintColor={COLORS.accent.primary}
                  maximumTrackTintColor={COLORS.border.strong}
                  thumbTintColor={COLORS.white}
                />
              </View>
              <Text style={styles.bandLabel}>{BANDS_LABELS[idx]}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const sliderLength = 150;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: hexToRgba(COLORS.bg.base, 0.6),
  },
  sheet: {
    backgroundColor: COLORS.bg.elevated,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: SPACING['3xl'],
    ...SHADOWS.up,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border.strong,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  presetButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.xs,
    backgroundColor: COLORS.bg.highlight,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: COLORS.accent.primary,
  },
  presetText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text.secondary,
  },
  presetTextActive: {
    color: COLORS.white,
  },
  bandsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    height: 200, // accommodate rotated slider
  },
  bandColumn: {
    alignItems: 'center',
    flex: 1,
  },
  bandValue: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  sliderWrapper: {
    width: 30,
    height: sliderLength,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slider: {
    width: sliderLength,
    height: 30,
    transform: [{ rotate: '-90deg' }],
  },
  bandLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.sm,
  },
});
