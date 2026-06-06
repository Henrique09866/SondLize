import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { FolderCard } from '../components/FolderCard';
import { EmptyState } from '../components/EmptyState';
import { CreateFolderModal } from '../components/CreateFolderModal';
import { useFoldersStore, useLibraryStore } from '../store';
import { Folder } from '../core/entities';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SIZES,
} from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP   = SPACING.md;
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.screenPadding * 2 - CARD_GAP) / 2;

// ─── Screen ───────────────────────────────────────────────────

export const FoldersScreen: React.FC = () => {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const folders      = useFoldersStore((s) => s.folders);
  const createFolder = useFoldersStore((s) => s.createFolder);
  const tracks       = useLibraryStore((s) => s.tracks);

  const [showCreate, setShowCreate] = useState(false);

  // ── Get up to 4 artwork URIs for a folder ──
  const getFolderArtworks = useCallback(
    (folder: Folder): (string | null)[] => {
      const folderTracks = tracks
        .filter((t) => t.folderId === folder.id)
        .slice(0, 4);
      return folderTracks.map((t) => t.artwork ?? null);
    },
    [tracks],
  );

  const handleCreate = useCallback(
    (name: string, color: string) => {
      createFolder(name, color);
      setShowCreate(false);
    },
    [createFolder],
  );

  const renderItem = useCallback(
    ({ item }: { item: Folder }) => {
      const count    = tracks.filter((t) => t.folderId === item.id).length;
      const artworks = getFolderArtworks(item);

      return (
        <View style={{ width: CARD_WIDTH }}>
          <FolderCard
            name={item.name}
            color={item.color}
            trackCount={count}
            artworks={artworks}
            onPress={() =>
              navigation.navigate('FolderDetails', { folderId: item.id, folderName: item.name })
            }
          />
        </View>
      );
    },
    [tracks, getFolderArtworks, navigation],
  );

  const keyExtractor = useCallback((item: Folder) => item.id, []);

  const ListHeader = (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
      <Text style={styles.pageTitle}>Pastas</Text>

      <TouchableOpacity
        onPress={() => setShowCreate(true)}
        style={styles.createButton}
      >
        <Text style={styles.createButtonText}>+ Nova pasta</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg.base} />

      <FlatList
        data={folders}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            icon="📁"
            title="Nenhuma pasta ainda"
            subtitle='Toque em "+ Nova pasta" para organizar suas músicas'
          />
        }
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom:
              insets.bottom +
              SPACING.tabBarHeight +
              SIZES.miniPlayerHeight +
              SPACING.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
      />

      <CreateFolderModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg.base,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: SPACING.screenPadding,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: SPACING.lg,
  },
  pageTitle: {
    ...TYPOGRAPHY.h1,
  },
  createButton: {
    backgroundColor: COLORS.accent.muted,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.chip,
  },
  createButtonText: {
    ...TYPOGRAPHY.label,
    color: COLORS.accent.primary,
    fontWeight: '600',
  },

  // ── Grid ──
  row: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
});
