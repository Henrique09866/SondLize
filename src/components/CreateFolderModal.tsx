import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SIZES } from '../constants/theme';
import { FOLDER_COLORS } from '../constants/folderColors';
import { PrimaryButton } from './PrimaryButton';

interface CreateFolderModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  visible,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, selectedColor);
    setName('');
    setSelectedColor(FOLDER_COLORS[0]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.heading}>Nova pasta</Text>

          <TextInput
            style={styles.input}
            placeholder="Nome da pasta…"
            placeholderTextColor={COLORS.text.tertiary}
            value={name}
            onChangeText={setName}
            autoFocus
            maxLength={40}
            returnKeyType="done"
          />

          <Text style={styles.label}>Cor</Text>
          <FlatList
            data={FOLDER_COLORS}
            keyExtractor={(c) => c}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.colorList}
            renderItem={({ item }) => (
              <View style={styles.colorItem}>
                <TouchableOpacity
                  style={[
                    styles.colorDot,
                    { backgroundColor: item },
                    selectedColor === item && styles.colorDotSelected,
                  ]}
                  onPress={() => setSelectedColor(item)}
                />
              </View>
            )}
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <View style={styles.createBtn}>
              <PrimaryButton
                label="Criar"
                onPress={handleCreate}
                disabled={!name.trim()}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: COLORS.bg.overlay,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    padding: SPACING.lg,
    paddingBottom: SPACING['2xl'],
  },
  handle: {
    width: SIZES.sheet.handleWidth,
    height: SIZES.sheet.handleHeight,
    borderRadius: 2,
    backgroundColor: COLORS.border.strong,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  heading: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.lg,
  },
  input: {
    backgroundColor: COLORS.bg.input,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    borderRadius: RADIUS.input,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border.default,
    marginBottom: SPACING.lg,
  },
  label: {
    ...TYPOGRAPHY.overline,
    marginBottom: SPACING.sm,
  },
  colorList: {
    paddingVertical: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  colorItem: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: COLORS.text.primary,
    transform: [{ scale: 1.15 }],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  cancelText: {
    ...TYPOGRAPHY.title,
    color: COLORS.text.secondary,
  },
  createBtn: {
    flex: 2,
  },
});
