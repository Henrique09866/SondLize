import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarCrop } from '../core/entities';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
} from '../constants/theme';

interface AvatarCropModalProps {
  visible: boolean;
  uri: string | null;
  initialCrop?: AvatarCrop | null;
  onClose: () => void;
  onConfirm: (crop: AvatarCrop) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const BASE = Math.min(Dimensions.get('window').width - SPACING.screenPadding * 2, 320);

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

const maxOffset = (scale: number) => (BASE * (scale - 1)) / 2;

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  visible,
  uri,
  initialCrop,
  onClose,
  onConfirm,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  const scaleV = useRef(new Animated.Value(1)).current;
  const txV = useRef(new Animated.Value(0)).current;
  const tyV = useRef(new Animated.Value(0)).current;

  const current = useRef<AvatarCrop>({ scale: 1, tx: 0, ty: 0 });
  const anchor = useRef({
    scale: 1,
    tx: 0,
    ty: 0,
    dist: 0,
    midX: 0,
    midY: 0,
    lastX: 0,
    lastY: 0,
    multi: false,
  });

  // ── Reset ao abrir / trocar imagem ──
  useEffect(() => {
    if (visible) {
      const start: AvatarCrop = initialCrop ?? { scale: 1, tx: 0, ty: 0 };
      current.current = { ...start };
      scaleV.setValue(start.scale);
      txV.setValue(start.tx * BASE);
      tyV.setValue(start.ty * BASE);

      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, tension: 60, friction: 14, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: Dimensions.get('window').height, duration: 200, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, uri]);

  const setValues = (s: number, tx: number, ty: number) => {
    const ns = clamp(s, MIN_SCALE, MAX_SCALE);
    const m = maxOffset(ns);
    const ntx = clamp(tx, -m, m);
    const nty = clamp(ty, -m, m);
    current.current = { scale: ns, tx: ntx / BASE, ty: nty / BASE };
    scaleV.setValue(ns);
    txV.setValue(ntx);
    tyV.setValue(nty);
  };

  const anchorMulti = (touches: { pageX: number; pageY: number }[]) => {
    const c = current.current;
    const t0 = touches[0];
    const t1 = touches[1];
    anchor.current = {
      scale: c.scale,
      tx: c.tx * BASE,
      ty: c.ty * BASE,
      dist: Math.hypot(t0.pageX - t1.pageX, t0.pageY - t1.pageY),
      midX: (t0.pageX + t1.pageX) / 2,
      midY: (t0.pageY + t1.pageY) / 2,
      lastX: 0,
      lastY: 0,
      multi: true,
    };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        g.dx !== 0 || g.dy !== 0 || g.numberActiveTouches > 1,
      onPanResponderGrant: (e) => {
        const touches = e.nativeEvent.touches;
        if (touches.length >= 2) {
          anchorMulti(touches);
        } else {
          const t = touches[0];
          anchor.current = {
            scale: current.current.scale,
            tx: current.current.tx * BASE,
            ty: current.current.ty * BASE,
            dist: 0,
            midX: 0,
            midY: 0,
            lastX: t.pageX,
            lastY: t.pageY,
            multi: false,
          };
        }
      },
      onPanResponderMove: (e) => {
        const touches = e.nativeEvent.touches;

        if (touches.length >= 2) {
          if (!anchor.current.multi) anchorMulti(touches);
          const a = anchor.current;

          const t0 = touches[0];
          const t1 = touches[1];
          const dist = Math.hypot(t0.pageX - t1.pageX, t0.pageY - t1.pageY);
          const midX = (t0.pageX + t1.pageX) / 2;
          const midY = (t0.pageY + t1.pageY) / 2;

          const s = clamp(a.scale * (dist / (a.dist || 1)), MIN_SCALE, MAX_SCALE);
          const m = maxOffset(s);
          const tx = clamp(a.tx + (midX - a.midX), -m, m);
          const ty = clamp(a.ty + (midY - a.midY), -m, m);
          setValues(s, tx, ty);
        } else {
          const a = anchor.current;
          const t = touches[0];
          const x = t.pageX;
          const y = t.pageY;

          if (a.multi) {
            // 2 dedos → 1 dedo: re-ancora para não "pular"
            anchor.current = { ...a, multi: false, lastX: x, lastY: y };
            return;
          }

          const dx = x - a.lastX;
          const dy = y - a.lastY;
          anchor.current = { ...a, lastX: x, lastY: y };

          const c = current.current;
          const m = maxOffset(c.scale);
          setValues(c.scale, c.tx * BASE + dx, c.ty * BASE + dy);
        }
      },
    }),
  ).current;

  const handleConfirm = () => {
    onConfirm(current.current);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: COLORS.black, opacity: backdrop },
          ]}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + SPACING.lg, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          <Text style={styles.title}>Ajustar foto</Text>
          <Text style={styles.subtitle}>
            Arraste para reposicionar e use dois dedos para dar zoom
          </Text>

          <View style={styles.cropArea}>
            <View style={styles.cropCircle} {...panResponder.panHandlers}>
              {uri ? (
                <Animated.Image
                  source={{ uri }}
                  resizeMode="cover"
                  style={[
                    styles.cropImage,
                    {
                      width: BASE,
                      height: BASE,
                      transform: [
                        { scale: scaleV },
                        { translateX: txV },
                        { translateY: tyV },
                      ],
                    },
                  ]}
                />
              ) : null}
            </View>
          </View>

          <View style={styles.zoomRow}>
            <Text style={styles.zoomHint}>—</Text>
            <TouchableOpacity
              onPress={() => {
                const c = current.current;
                setValues(c.scale + 0.25, c.tx * BASE, c.ty * BASE);
              }}
              style={styles.zoomButton}
            >
              <Text style={styles.zoomButtonText}>＋</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const c = current.current;
                setValues(c.scale - 0.25, c.tx * BASE, c.ty * BASE);
              }}
              style={styles.zoomButton}
            >
              <Text style={styles.zoomButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.zoomHint}>＋</Text>
          </View>

          <View style={styles.buttonsRow}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.button, styles.buttonGhost]}
            >
              <Text style={styles.buttonGhostText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.button, styles.buttonPrimary]}
            >
              <Text style={styles.buttonPrimaryText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bg.elevated,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    paddingHorizontal: SPACING.screenPadding,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border.strong,
  },
  title: {
    ...TYPOGRAPHY.h3,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },

  cropArea: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  cropCircle: {
    width: BASE,
    height: BASE,
    borderRadius: BASE / 2,
    overflow: 'hidden',
    backgroundColor: COLORS.bg.input,
  },
  cropImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },

  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bg.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
  },
  zoomHint: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
  },

  buttonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGhost: {
    backgroundColor: COLORS.bg.highlight,
  },
  buttonPrimary: {
    backgroundColor: COLORS.accent.primary,
  },
  buttonGhostText: {
    ...TYPOGRAPHY.title,
    color: COLORS.text.secondary,
  },
  buttonPrimaryText: {
    ...TYPOGRAPHY.title,
    color: COLORS.text.onAccent,
    fontWeight: '700',
  },
});
