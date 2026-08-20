import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Alert,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { SongListItem } from '../components/SongListItem';
import { EmptyState } from '../components/EmptyState';
import { useFoldersStore, useLibraryStore, usePlayerStore } from '../store';
import { Track } from '../core/entities';
import { saveFolderArtwork, deleteFolderArtwork } from '../utils/folderArtwork';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SIZES,
  hexToRgba,
  darken,
  contrastText,
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

  const { folderId } = route.params;

  const folders      = useFoldersStore((s) => s.folders);
  const updateFolder = useFoldersStore((s) => s.updateFolder);
  const tracks       = useLibraryStore((s) => s.tracks);
  const reorderFolderTracks = useLibraryStore((s) => s.reorderFolderTracks);
  const markTrackPlayed = useLibraryStore((s) => s.markTrackPlayed);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying    = usePlayerStore((s) => s.isPlaying);
  const playQueue    = usePlayerStore((s) => s.playQueue);
  const playQueueShuffled = usePlayerStore((s) => s.playQueueShuffled);

  const folder = useMemo(
    () => folders.find((f) => f.id === folderId),
    [folders, folderId],
  );

  const folderTracks = useMemo(
    () =>
      tracks
        .filter((t) => t.folderId === folderId)
        .sort((a, b) => (a.folderSortOrder ?? a.createdAt) - (b.folderSortOrder ?? b.createdAt)),
    [tracks, folderId],
  );

  const folderColor = folder?.color ?? COLORS.accent.primary;
  const playButtonTextColor = contrastText(folderColor);
  const scrollY     = React.useRef(new Animated.Value(0)).current;
  const [isReordering, setIsReordering] = React.useState(false);

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
    markTrackPlayed(folderTracks[0].id);
    playQueue(folderTracks, 0);
    navigation.navigate('PlayerScene');
  }, [folderTracks, markTrackPlayed, playQueue, navigation]);

  const handlePlayShuffled = useCallback(() => {
    if (!folderTracks.length) return;
    markTrackPlayed(folderTracks[0].id);
    playQueueShuffled(folderTracks);
    navigation.navigate('PlayerScene');
  }, [folderTracks, markTrackPlayed, playQueueShuffled, navigation]);

  const handlePlayTrack = useCallback(
    (track: Track, index: number) => {
      if (isReordering) return;
      markTrackPlayed(track.id);
      playQueue(folderTracks, index);
      navigation.navigate('PlayerScene');
    },
    [folderTracks, isReordering, markTrackPlayed, playQueue, navigation],
  );

  // ── Folder photo (pick / replace / remove) ──
  const pickPhoto = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permissão negada',
          'Permita o acesso às fotos nas configurações para escolher uma imagem.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;

      const savedUri = await saveFolderArtwork(result.assets[0].uri);
      await updateFolder(folderId, { artwork: savedUri });
    } catch (e) {
      console.warn('Failed to pick folder photo:', e);
    }
  }, [folderId, updateFolder]);

  const handleRemovePhoto = useCallback(async () => {
    const current = folder?.artwork;
    if (!current) return;
    await deleteFolderArtwork(current);
    await updateFolder(folderId, { artwork: undefined });
  }, [folder?.artwork, folderId, updateFolder]);

  const handleFolderPhoto = useCallback(() => {
    const hasArtwork = !!folder?.artwork;
    const buttons: any[] = [];
    if (hasArtwork) {
      buttons.push({ text: 'Trocar foto', onPress: () => { pickPhoto(); } });
      buttons.push({ text: 'Remover foto', onPress: () => { handleRemovePhoto(); } });
    } else {
      buttons.push({ text: 'Escolher foto', onPress: () => { pickPhoto(); } });
    }
    buttons.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert(
      'Foto da pasta',
      hasArtwork ? 'O que deseja fazer com a foto?' : 'Escolha uma imagem para esta pasta.',
      buttons,
    );
  }, [folder?.artwork, pickPhoto, handleRemovePhoto]);

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
        onLongPress={() => setIsReordering(true)}
        rightAction={
          isReordering ? (
            <View style={styles.trackReorderActions}>
              <TouchableOpacity
                onPress={() => reorderFolderTracks(folderId, index, index - 1)}
                disabled={index === 0}
                style={[styles.trackReorderButton, index === 0 && styles.trackReorderButtonDisabled]}
              >
                <Ionicons
                  name="chevron-up"
                  size={18}
                  color={index === 0 ? COLORS.text.disabled : COLORS.text.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => reorderFolderTracks(folderId, index, index + 1)}
                disabled={index === folderTracks.length - 1}
                style={[
                  styles.trackReorderButton,
                  index === folderTracks.length - 1 && styles.trackReorderButtonDisabled,
                ]}
              >
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={index === folderTracks.length - 1 ? COLORS.text.disabled : COLORS.text.primary}
                />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    ),
    [currentTrack, folderId, folderTracks.length, handlePlayTrack, isPlaying, isReordering, reorderFolderTracks],
  );

  const keyExtractor = useCallback((item: Track) => item.id, []);

  const ListHeader = (
    <View>
      {/* ── Color / photo hero banner ── */}
      <Animated.View
        style={[
          styles.heroBanner,
          { transform: [{ translateY: headerTranslate }] },
        ]}
      >
        {folder?.artwork ? (
          <ImageBackground
            source={{ uri: folder.artwork }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          >
            <View style={styles.heroArtworkOverlay} />
          </ImageBackground>
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: darken(folderColor, 0.45) },
            ]}
          />
        )}

        {/* Folder icon circle */}
        <View
          style={[
            styles.folderIconCircle,
            {
              backgroundColor: folder?.artwork
                ? 'rgba(0,0,0,0.4)'
                : hexToRgba(folderColor, 0.25),
            },
          ]}
        >
          <Text
            style={[
              styles.folderIconText,
              { color: folder?.artwork ? COLORS.text.primary : folderColor },
            ]}
          >
            {folder?.name.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>

        {/* Folder name */}
        <Text style={styles.folderName}>{folder?.name ?? ''}</Text>

        {/* Track count */}
        <Text style={styles.trackCount}>
          {folderTracks.length} {folderTracks.length === 1 ? 'música' : 'músicas'}
        </Text>

        {/* Play buttons: normal / shuffle */}
        <View style={styles.playButtonsRow}>
          <TouchableOpacity
            onPress={handlePlayAll}
            disabled={folderTracks.length === 0}
            style={[
              styles.playButton,
              { backgroundColor: folderColor },
              folderTracks.length === 0 && styles.playButtonDisabled,
            ]}
          >
            <Ionicons
              name="play"
              size={18}
              color={playButtonTextColor}
              style={styles.playButtonIcon}
            />
            <Text style={[styles.playAllText, { color: playButtonTextColor }]}>Tocar tudo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePlayShuffled}
            disabled={folderTracks.length === 0}
            style={[
              styles.shuffleButton,
              folderTracks.length === 0 && styles.playButtonDisabled,
            ]}
          >
            <Ionicons
              name="shuffle"
              size={18}
              color={COLORS.text.primary}
              style={styles.playButtonIcon}
            />
            <Text style={styles.shuffleText}>Aleatório</Text>
          </TouchableOpacity>
        </View>

        {/* Photo picker button */}
        <TouchableOpacity
          onPress={handleFolderPhoto}
          style={styles.photoButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={folder?.artwork ? 'camera' : 'camera-outline'}
            size={18}
            color={COLORS.text.primary}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Section label ── */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>MÚSICAS</Text>
        {isReordering ? (
          <TouchableOpacity onPress={() => setIsReordering(false)} style={styles.doneReorderButton}>
            <Text style={styles.doneReorderText}>Concluir</Text>
          </TouchableOpacity>
        ) : null}
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
        <Ionicons name="chevron-back" size={30} color={COLORS.text.primary} />
      </TouchableOpacity>

      <Animated.FlatList
        data={folderTracks}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            icon="musical-notes-outline"
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

  // ── Hero banner ──
  heroBanner: {
    paddingTop: SPACING['3xl'],
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.screenPadding,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  heroArtworkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
  playButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.button,
  },
  playButtonDisabled: {
    opacity: 0.45,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.button,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  playButtonIcon: {
    marginRight: 2,
  },
  playAllText: {
    ...TYPOGRAPHY.title,
    color: COLORS.text.inverse,
    fontWeight: '700',
  },
  shuffleText: {
    ...TYPOGRAPHY.title,
    color: COLORS.text.primary,
    fontWeight: '700',
  },

  // ── Photo button ──
  photoButton: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Section label ──
  sectionRow: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    ...TYPOGRAPHY.overline,
  },
  doneReorderButton: {
    backgroundColor: COLORS.accent.muted,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.chip,
  },
  doneReorderText: {
    ...TYPOGRAPHY.label,
    color: COLORS.accent.primary,
    fontWeight: '700',
  },
  trackReorderActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  trackReorderButton: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackReorderButtonDisabled: {
    opacity: 0.45,
  },
});
