import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { SongListItem } from '../components/SongListItem';
import { EmptyState } from '../components/EmptyState';
import { useFoldersStore } from '../store';
import { useLibraryStore } from '../store';
import { usePlayerStore } from '../store';
import { Track } from '../core/entities';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SIZES,
  hexToRgba,
  folderTint,
} from '../constants/theme';

// ─── Navigation types ─────────────────────────────────────────

type RouteParams = {
  FolderDetails: {
    folderId: string;
    folderName: string;
  };
};

// ─── Screen ───────────────────────────────────────────────────

export const FolderDetailsScreen: React.FC = () => {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route      = useRoute<RouteProp<RouteParams, 'FolderDetails'>>();

  const { folderId, folderName } = route.params;

  const folders      = useFoldersStore((s) => s.folders);
  const tracks       = useLibraryStore((s) => s.tracks);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying    = usePlayerStore((s) => s.isPlaying);
  const playQueue    = usePlayerStore((s) => s.playQueue);

  const folder = useMemo(
    () => folders.find((f) => f.id === folderId),
    [folders, folderId],
  );

  const folderTracks = useMemo(
    () => tracks.filter((t) => t.folderId === folderId),
    [tracks, folderId],
  );

  const folderColor = folder?.color ?? COLORS.accent.primary;
  const scrollY     = React.useRef(new Animated.Value(0)).current;

  // ── Header parallax ──
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  // ── Play all ──
  const handlePlayAll = useCallback(() => {
    if (!folderTracks.length) return;
    playQueue(folderTracks, 0);
    navigation.navigate('PlayerScene');
  }, [folderTracks, playQueue, navigation]);

  const handlePlayTrack = useCallback(
    (_track: Track, index: number) => {
      playQueue(folderTracks, index);
      navigation.navigate('PlayerScene');
    },
    [folderTracks, playQueue, navigation],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Track; index: number }) => (
      <SongListItem
        id={item.id}
        title={item.title}
        artist={item.artist}
        duration={Math.floor(item.duration / 1000)}
        artwork={item.artwork}
        isPlaying={currentTrack?.id === item.id && isPlaying}
        index={index}
        showIndex
        onPress={() => handlePlayTrack(item, index)}
      />
    ),
    [currentTrack, isPlaying, handlePlayTrack],
  );

  const keyExtractor = useCallback((item: Track) => item.id, []);

  const ListHeader = (
    <View>
      {/* ── Color hero banner ── */}
      <Animated.View
        style={[
          styles.heroBanner,
          {
            backgroundColor: folderTint(folderColor),
            transform: [{ translateY: headerTranslate }],
          },
        ]}
      >
        {/* Color accent line */}
        <View style={[styles.heroAccent, { backgroundColor: folderColor }]} />

        {/* Folder icon circle */}
        <View style={[styles.folderIconCircle, { backgroundColor: hexToRgba(folderColor, 0.2) }]}>
          <Text style={[styles.folderIconText, { color: folderColor }]}>
            {folder?.name.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>

        {/* Folder name */}
        <Text style={styles.folderName}>{folder?.name ?? ''}</Text>

        {/* Track count */}
        <Text style={styles.trackCount}>
          {folderTracks.length} {folderTracks.length === 1 ? 'música' : 'músicas'}
        </Text>

        {/* Play all button */}
        {folderTracks.length > 0 && (
          <TouchableOpacity
            onPress={handlePlayAll}
            style={[styles.playAllButton, { backgroundColor: folderColor }]}
          >
            <Text style={styles.playAllText}>▶  Tocar tudo</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* ── Section label ── */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>MÚSICAS</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg.base} />

      {/* ── Sticky navbar (fades in on scroll) ── */}
      <Animated.View
        style={[
          styles.navbar,
          { paddingTop: insets.top, opacity: headerOpacity },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.navbarTitle} numberOfLines={1}>
          {folder?.name ?? ''}
        </Text>
      </Animated.View>

      {/* ── Back button (always visible) ── */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.backButton, { top: insets.top + SPACING.sm }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>

      <Animated.FlatList
        data={folderTracks}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            icon="🎵"
            title="Pasta vazia"
            subtitle="Mova músicas da sua biblioteca para cá"
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
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
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

  // ── Navbar (fades in) ──
  navbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.screenPadding,
    backgroundColor: COLORS.bg.base,
    alignItems: 'center',
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.subtle,
  },
  navbarTitle: {
    ...TYPOGRAPHY.title,
  },

  // ── Back button ──
  backButton: {
    position: 'absolute',
    left: SPACING.screenPadding,
    zIndex: 20,
    width: SIZES.touchTarget,
    height: SIZES.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 32,
    color: COLORS.text.primary,
    lineHeight: 36,
    fontWeight: '300',
  },

  // ── Hero banner ──
  heroBanner: {
    paddingTop: SPACING['3xl'],
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.screenPadding,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  heroAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  folderIconCircle: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  folderIconText: {
    fontSize: 36,
    fontWeight: '700',
  },
  folderName: {
    ...TYPOGRAPHY.h2,
    textAlign: 'center',
  },
  trackCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  playAllButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.button,
  },
  playAllText: {
    ...TYPOGRAPHY.title,
    color: COLORS.text.inverse,
    fontWeight: '700',
  },

  // ── Section label ──
  sectionRow: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  sectionLabel: {
    ...TYPOGRAPHY.overline,
  },
});
