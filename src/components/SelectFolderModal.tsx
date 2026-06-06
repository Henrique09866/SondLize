import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFoldersStore } from '../store';

interface SelectFolderModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (folderId: string | undefined) => void;
  currentFolderId?: string;
}

export const SelectFolderModal: React.FC<SelectFolderModalProps> = ({
  visible,
  onClose,
  onSelect,
  currentFolderId,
}) => {
  const { folders } = useFoldersStore();

  const handleSelect = (id: string | undefined) => {
    onSelect(id);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Mover para pasta</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Ionicons name="close" size={24} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={folders}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <TouchableOpacity
                style={[
                  styles.folderItem,
                  !currentFolderId && styles.folderItemSelected
                ]}
                onPress={() => handleSelect(undefined)}
              >
                <View style={[styles.folderIcon, { backgroundColor: COLORS.bg.surface }]}>
                  <Ionicons name="folder-outline" size={24} color={COLORS.text.secondary} />
                </View>
                <Text style={styles.folderName}>Nenhuma pasta (Remover)</Text>
                {!currentFolderId && (
                  <Ionicons name="checkmark" size={20} color={COLORS.accent.primary} />
                )}
              </TouchableOpacity>
            }
            renderItem={({ item }) => {
              const isSelected = item.id === currentFolderId;
              return (
                <TouchableOpacity
                  style={[
                    styles.folderItem,
                    isSelected && styles.folderItemSelected
                  ]}
                  onPress={() => handleSelect(item.id)}
                >
                  <View style={[styles.folderIcon, { backgroundColor: item.color + '22' }]}>
                    <Ionicons name="folder" size={24} color={item.color} />
                  </View>
                  <Text style={styles.folderName}>{item.name}</Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={COLORS.accent.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  content: {
    backgroundColor: COLORS.bg.overlay,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h3,
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.default,
  },
  folderItemSelected: {
    backgroundColor: COLORS.bg.surface,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    marginHorizontal: -SPACING.sm,
  },
  folderIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  folderName: {
    flex: 1,
    ...TYPOGRAPHY.title,
  },
});
