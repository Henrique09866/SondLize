import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../constants/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  style?: ViewStyle;
}

const HEIGHT: Record<string, number> = { sm: 36, md: 48, lg: 56 };
const PADDING_H: Record<string, number> = { sm: SPACING.md, md: SPACING.lg, lg: SPACING.xl };
const FONT: Record<string, any> = {
  sm: { ...TYPOGRAPHY.label, fontWeight: '700' as const },
  md: { ...TYPOGRAPHY.title, fontWeight: '700' as const },
  lg: { ...TYPOGRAPHY.h3 },
};

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  style,
}) => {
  const isGhost = variant === 'ghost';

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          height: HEIGHT[size],
          paddingHorizontal: PADDING_H[size],
          backgroundColor: isGhost ? COLORS.transparent : COLORS.accent.primary,
          ...(isGhost ? {} : SHADOWS.accentGlow),
        },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? COLORS.accent.primary : COLORS.text.onAccent} size="small" />
      ) : (
        <Text style={[
          FONT[size],
          { color: isGhost ? COLORS.accent.primary : COLORS.text.onAccent },
        ]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});
