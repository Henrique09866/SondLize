import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { SongListItem } from '../components/SongListItem';
import { EmptyState } from '../components/EmptyState';
import { useLibraryStore, usePlayerStore } from '../store';
import { Track } from '../core/entities';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SIZES,
} from '../constants/theme';

// ─── Screen ───────────────────────────────────────────────────

const normalize = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const SEARCH_FIELDS: ((t: Track) => string)[] = [
  (t) => t.title ?? '',
  (t) => t.artist ?? '',
];

export const LibraryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const tracks       = useLibraryStore((s) => s.tracks);
  const importMusic  = useLibraryStore((s) => s.importMusic);
  const deleteTrack  = useLibraryStore((s) => s.deleteTrack);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying    = usePlayerStore((s) => s.isPlaying);
  const playQueue    = usePlayerStore((s) => s.playQueue);
  const pause        = usePlayerStore((s) => s.pause);

  const [query,   setQuery]   = useState('');
  const [loading, setLoading] = useState(false);

  // ── Filter ──
  const filtered = useMemo(() => {
    if (!query.trim()) return tracks;

    const q = normalize(query.trim());
    return tracks.filter((t) =>
      SEARCH_FIELDS.some((field) => normalize(field(t)).includes(q)),
    );
  }, [tracks, query]);

  // ── Import ──
  const handleImport = useCallback(async () => {
    setLoading(true);
    try {
      await importMusic();
    } finally {
      setLoading(false);
    }
  }, [importMusic]);

  // ── Play a track (set full filtered list as queue) ──
  const handlePlay = useCallback(
    (track: Track, index: number) => {
      playQueue(filtered, index);
      navigation.navigate('PlayerScene');
    },
    [filtered, playQueue, navigation],
  );

  // ── Delete a track ──
  const handleDelete = useCallback(
    (track: Track) => {
      Alert.alert(
        'Excluir música',
        `Deseja excluir "${track.title}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              // Pause if this track is currently playing
              if (currentTrack?.id === track.id) {
                pause();
              }
              await deleteTrack(track.id);
            },
          },
        ],
      );
    },
    [currentTrack, pause, deleteTrack],
  );

  // ── Render item ──
  const renderItem = useCallback(
    ({ item, index }: { item: Track; index: number }) => (
      <SongListItem
        id={item.id}
        title={item.title}
        artist={item.artist}
        duration={Math.floor(item.duration / 1000)}
        artwork={item.artwork}
        isPlaying={currentTrack?.id === item.id && isPlaying}
        isLoading={false}
        onPress={() => handlePlay(item, index)}
        onLongPress={() => {/* TODO: context menu */}}
        onDelete={() => handleDelete(item)}
      />
    ),
    [currentTrack, isPlaying, handlePlay, handleDelete],
  );

  const keyExtractor = useCallback((item: Track) => item.id, []);

  const ListHeader = (
    <View>
      {/* ── Page title ── */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text style={styles.pageTitle}>Sua Biblioteca</Text>
        <TouchableOpacity
          onPress={handleImport}
          disabled={loading}
          style={styles.importButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.importButtonText}>
            {loading ? 'Importando…' : '+ Adicionar'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar músicas ou artistas"
            placeholderTextColor={COLORS.text.tertiary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg.base} />

      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            icon="🎵"
            title={query ? 'Nenhum resultado' : 'Biblioteca vazia'}
            subtitle={
              query
                ? 'Tente outro nome ou artista'
                : 'Toque em "+ Adicionar" para importar suas músicas'
            }
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
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
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: SPACING.lg,
  },
  pageTitle: {
    ...TYPOGRAPHY.h1,
  },
  importButton: {
    backgroundColor: COLORS.accent.muted,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.chip,
  },
  importButtonText: {
    ...TYPOGRAPHY.label,
    color: COLORS.accent.primary,
    fontWeight: '600',
  },

  // ── Search ──
  searchRow: {
    paddingHorizontal: SPACING.screenPadding,
    marginBottom: SPACING.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg.input,
    borderRadius: RADIUS.input,
    paddingHorizontal: SPACING.md,
    height: 44,
    gap: SPACING.sm,
  },
  searchIcon: {
    fontSize: 18,
    color: COLORS.text.tertiary,
    lineHeight: 22,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    padding: 0,
  },
});
