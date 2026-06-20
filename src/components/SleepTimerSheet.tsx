import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, PanResponder } from 'react-native';
import { usePlayerStore } from '../store/usePlayerStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, hexToRgba } from '../constants/theme';

interface SleepTimerSheetProps {
  visible: boolean;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const TIMERS = [
  { label: 'Desativar', value: null },
  { label: '15 minutos', value: 15 },
  { label: '30 minutos', value: 30 },
  { label: '45 minutos', value: 45 },
  { label: '60 minutos', value: 60 },
];

export const SleepTimerSheet: React.FC<SleepTimerSheetProps> = ({ visible, onClose }) => {
  const setSleepTimer = usePlayerStore(s => s.setSleepTimer);
  const sleepTimerEnd = usePlayerStore(s => s.sleepTimerEnd);

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

  const handleSelect = (val: number | null) => {
    setSleepTimer(val);
    onClose();
  };

  const getTimeLeftText = () => {
    if (!sleepTimerEnd) return 'Desativado';
    const mins = Math.ceil((sleepTimerEnd - Date.now()) / 60000);
    if (mins <= 0) return 'Parando agora...';
    return `Restam ${mins} min`;
  };

  if (!visible && fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) as unknown as number === 0) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} pointerEvents={visible ? 'auto' : 'none'}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Timer (Sleep)</Text>
          <Text style={styles.subtitle}>{getTimeLeftText()}</Text>
        </View>

        <View style={styles.optionsContainer}>
          {TIMERS.map((timer) => (
            <TouchableOpacity
              key={timer.label}
              style={styles.option}
              onPress={() => handleSelect(timer.value)}
            >
              <Text style={styles.optionText}>{timer.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

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
    ...SHADOWS.md,
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
    ...TYPOGRAPHY.body,
    color: COLORS.accent.primary,
    marginTop: SPACING.xs,
  },
  optionsContainer: {
    gap: SPACING.sm,
  },
  option: {
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.bg.highlight,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  optionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
  },
});
