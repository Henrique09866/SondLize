import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
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

// ─── Sort options ─────────────────────────────────────────────

type SortKey = 'recent' | 'title' | 'artist';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recentes' },
  { key: 'title',  label: 'Título'   },
  { key: 'artist', label: 'Artista'  },
];

// ─── Screen ───────────────────────────────────────────────────

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
  const [sort,    setSort]    = useState<SortKey>('recent');
  const [loading, setLoading] = useState(false);

  // ── Filter + sort ──
  const filtered = useMemo(() => {
    let list = [...tracks];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.artist ?? '').toLowerCase().includes(q),
      );
    }

    if (sort === 'title')  list.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'artist') list.sort((a, b) => (a.artist ?? '').localeCompare(b.artist ?? ''));
    // 'recent' keeps insertion order (newest first from store)

    return list;
  }, [tracks, query, sort]);

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

      {/* ── Sort chips ── */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => setSort(opt.key)}
            style={[styles.chip, sort === opt.key && styles.chipActive]}
          >
            <Text style={[styles.chipText, sort === opt.key && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Track count */}
        <Text style={styles.trackCount}>
          {filtered.length} {filtered.length === 1 ? 'música' : 'músicas'}
        </Text>
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

  // ── Sort chips ──
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.screenPadding,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.bg.highlight,
  },
  chipActive: {
    backgroundColor: COLORS.accent.muted,
  },
  chipText: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
  },
  chipTextActive: {
    color: COLORS.accent.primary,
    fontWeight: '600',
  },
  trackCount: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
    marginLeft: 'auto',
  },
});
