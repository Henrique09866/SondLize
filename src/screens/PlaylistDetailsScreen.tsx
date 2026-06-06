import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  Animated,
  Pressable,
  StyleSheet,
  StatusBar,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { usePlaylistsStore } from '../store';
import { useLibraryStore } from '../store';
import { usePlayerStore } from '../store';
import { SongListItem } from '../components/SongListItem';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { Track } from '../core/entities';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  SIZES,
} from '../constants/theme';

type RouteParams = {
  PlaylistDetails: { playlistId: string; playlistName: string };
};

const AddTracksModal: React.FC<{
  visible:    boolean;
  onClose:    () => void;
  playlistId: string;
}> = ({ visible, onClose, playlistId }) => {
  const insets   = useSafeAreaInsets();
  const tracks   = useLibraryStore((s) => s.tracks);
  const addTrack = usePlaylistsStore((s) => s.addTrackToPlaylist);
  const isIn     = usePlaylistsStore((s) => s.isTrackInPlaylist);
  const [query, setQuery] = useState('');

  const translateY = useRef(new Animated.Value(600)).current;
  const backdrop   = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      setQuery('');
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0,   tension: 55, friction: 14, useNativeDriver: true }),
        Animated.timing(backdrop,   { toValue: 1,   duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 600, duration: 220, useNativeDriver: true }),
        Animated.timing(backdrop,   { toValue: 0,   duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const filtered = useMemo(() => {
    if (!query.trim()) return tracks;
    const q = query.toLowerCase();
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.artist ?? '').toLowerCase().includes(q),
    );
  }, [tracks, query]);

  const renderTrack = useCallback(
    ({ item }: { item: Track }) => {
      const added = isIn(playlistId, item.id);
      return (
        <View style={addStyles.row}>
          {item.artwork ? (
            <Image source={{ uri: item.artwork }} style={addStyles.cover} />
          ) : (
            <View style={[addStyles.cover, addStyles.coverFallback]}>
              <Text style={addStyles.coverInit}>{item.title.charAt(0)}</Text>
            </View>
          )}
          <View style={addStyles.info}>
            <Text style={addStyles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={addStyles.artist} numberOfLines={1}>{item.artist ?? 'Desconhecido'}</Text>
          </View>
          <TouchableOpacity
            onPress={() => !added && addTrack(playlistId, item.id)}
            style={[addStyles.addBtn, added && addStyles.addedBtn]}
            disabled={added}
          >
            <Text style={[addStyles.addBtnText, added && addStyles.addedBtnText]}>
              {added ? '✓ Adicionada' : '+ Adicionar'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    },
    [playlistId, isIn, addTrack],
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.black, opacity: backdrop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.65] }) }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[addStyles.sheet, { paddingBottom: insets.bottom + SPACING.lg, transform: [{ translateY }] }]}>
          <View style={addStyles.handleRow}>
            <View style={addStyles.handle} />
          </View>

          <Text style={addStyles.sheetTitle}>Adicionar músicas</Text>

          <View style={addStyles.searchBox}>
            <Text style={addStyles.searchIcon}>⌕</Text>
            <TextInput
              style={addStyles.searchInput}
              placeholder="Buscar músicas"
              placeholderTextColor={COLORS.text.tertiary}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(t) => t.id}
            renderItem={renderTrack}
            showsVerticalScrollIndicator={false}
            style={addStyles.list}
            keyboardShouldPersistTaps="handled"
          />

          <PrimaryButton label="Fechar" onPress={onClose} variant="ghost" size="md" fullWidth style={{ marginTop: SPACING.sm }} />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const addStyles = StyleSheet.create({
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.bg.overlay,
    borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet,
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.sm,
    maxHeight: '85%',
    ...SHADOWS.float,
  },
  handleRow:   { alignItems: 'center', paddingBottom: SPACING.xs },
  handle:      { width: SIZES.sheet.handleWidth, height: SIZES.sheet.handleHeight, borderRadius: 2, backgroundColor: COLORS.border.strong },
  sheetTitle:  { ...TYPOGRAPHY.h3, marginBottom: SPACING.sm },
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg.input, borderRadius: RADIUS.input, paddingHorizontal: SPACING.md, height: 44, gap: SPACING.sm, marginBottom: SPACING.sm },
  searchIcon:  { fontSize: 18, color: COLORS.text.tertiary, lineHeight: 22 },
  searchInput: { flex: 1, ...TYPOGRAPHY.body, color: COLORS.text.primary, padding: 0 },
  list:        { flexGrow: 0, maxHeight: 380 },
  row:         { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, gap: SPACING.md },
  cover:       { width: 44, height: 44, borderRadius: RADIUS.coverSmall, overflow: 'hidden', flexShrink: 0 },
  coverFallback: { backgroundColor: COLORS.bg.highlight, alignItems: 'center', justifyContent: 'center' },
  coverInit:   { ...TYPOGRAPHY.title, color: COLORS.text.tertiary },
  info:        { flex: 1, gap: 2 },
  title:       { ...TYPOGRAPHY.title },
  artist:      { ...TYPOGRAPHY.caption, color: COLORS.text.secondary },
  addBtn:      { backgroundColor: COLORS.accent.muted, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.chip },
  addedBtn:    { backgroundColor: COLORS.bg.highlight },
  addBtnText:  { ...TYPOGRAPHY.label, color: COLORS.accent.primary, fontWeight: '600' },
  addedBtnText: { color: COLORS.text.tertiary },
});

const RenameModal: React.FC<{
  visible:      boolean;
  currentName:  string;
  onClose:      () => void;
  onRename:     (name: string) => void;
}> = ({ visible, currentName, onClose, onRename }) => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(currentName);
  const translateY = useRef(new Animated.Value(300)).current;
  const backdrop   = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      setName(currentName);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, tension: 60, friction: 14, useNativeDriver: true }),
        Animated.timing(backdrop,   { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 300, duration: 200, useNativeDriver: true }),
        Animated.timing(backdrop,   { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.black, opacity: backdrop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }) }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[renameStyles.sheet, { paddingBottom: insets.bottom + SPACING.lg, transform: [{ translateY }] }]}>
          <View style={renameStyles.handleRow}>
            <View style={renameStyles.handle} />
          </View>
          <Text style={renameStyles.title}>Renomear playlist</Text>
          <TextInput
            style={renameStyles.input}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => { onRename(name); onClose(); }}
            placeholderTextColor={COLORS.text.tertiary}
          />
          <View style={renameStyles.actions}>
            <PrimaryButton label="Cancelar" onPress={onClose} variant="ghost" size="md" fullWidth />
            <PrimaryButton label="Salvar" onPress={() => { onRename(name); onClose(); }} variant="primary" size="md" fullWidth />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const renameStyles = StyleSheet.create({
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.bg.overlay,
    borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet,
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
    ...SHADOWS.float,
  },
  handleRow: { alignItems: 'center', paddingBottom: SPACING.xs },
  handle:    { width: SIZES.sheet.handleWidth, height: SIZES.sheet.handleHeight, borderRadius: 2, backgroundColor: COLORS.border.strong },
  title:     { ...TYPOGRAPHY.h3 },
  input:     { backgroundColor: COLORS.bg.input, borderRadius: RADIUS.input, paddingHorizontal: SPACING.md, height: 48, ...TYPOGRAPHY.body, color: COLORS.text.primary, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border.default },
  actions:   { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
});

export const PlaylistDetailsScreen: React.FC = () => {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route      = useRoute<RouteProp<RouteParams, 'PlaylistDetails'>>();

  const { playlistId } = route.params;

  const playlists       = usePlaylistsStore((s) => s.playlists);
  const removeTrack     = usePlaylistsStore((s) => s.removeTrackFromPlaylist);
  const renamePlaylist  = usePlaylistsStore((s) => s.renamePlaylist);
  const deletePlaylist  = usePlaylistsStore((s) => s.deletePlaylist);
  const allTracks       = useLibraryStore((s) => s.tracks);
  const currentTrack    = usePlayerStore((s) => s.currentTrack);
  const isPlaying       = usePlayerStore((s) => s.isPlaying);
  const playQueue       = usePlayerStore((s) => s.playQueue);

  const [showAdd,    setShowAdd]    = useState(false);
  const [showRename, setShowRename] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const playlist = useMemo(
    () => playlists.find((p) => p.id === playlistId),
    [playlists, playlistId],
  );

  const playlistTracks = useMemo(
    () =>
      (playlist?.trackIds ?? [])
        .map((id) => allTracks.find((t) => t.id === id))
        .filter((t): t is Track => !!t),
    [playlist, allTracks],
  );

  const handlePlayAll = useCallback(() => {
    if (!playlistTracks.length) return;
    playQueue(playlistTracks, 0);
    navigation.navigate('PlayerScene');
  }, [playlistTracks, playQueue, navigation]);

  const handleDelete = useCallback(() => {
    deletePlaylist(playlistId);
    navigation.goBack();
  }, [playlistId, deletePlaylist, navigation]);

  const navbarOpacity = scrollY.interpolate({ inputRange: [0, 70], outputRange: [0, 1], extrapolate: 'clamp' });
  const heroTranslate = scrollY.interpolate({ inputRange: [0, 100], outputRange: [0, -20], extrapolate: 'clamp' });
  const firstCover    = playlistTracks[0]?.artwork ?? null;

  const keyExtractor = useCallback((item: Track) => item.id, []);

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
        onPress={() => { playQueue(playlistTracks, index); navigation.navigate('PlayerScene'); }}
        rightAction={
          <TouchableOpacity
            onPress={() => removeTrack(playlistId, item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={detailStyles.removeIcon}>✕</Text>
          </TouchableOpacity>
        }
      />
    ),
    [currentTrack, isPlaying, playlistTracks, playlistId, playQueue, removeTrack, navigation],
  );

  if (!playlist) return null;

  const ListHeader = (
    <View>
      <Animated.View style={[detailStyles.hero, { transform: [{ translateY: heroTranslate }] }]}>
        <View style={detailStyles.heroCover}>
          {firstCover ? (
            <Image source={{ uri: firstCover }} style={detailStyles.heroCoverImage} />
          ) : (
            <View style={[detailStyles.heroCover, detailStyles.heroCoverFallback]}>
              <Text style={detailStyles.heroCoverIcon}>♫</Text>
            </View>
          )}
        </View>

        <Text style={detailStyles.heroName}>{playlist.name}</Text>
        <Text style={detailStyles.heroCount}>
          {playlistTracks.length} {playlistTracks.length === 1 ? 'música' : 'músicas'}
        </Text>

        <View style={detailStyles.heroActions}>
          {playlistTracks.length > 0 && (
            <TouchableOpacity onPress={handlePlayAll} style={detailStyles.playAllBtn}>
              <Text style={detailStyles.playAllText}>▶  Tocar tudo</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowAdd(true)} style={detailStyles.secondaryBtn}>
            <Text style={detailStyles.secondaryBtnText}>+ Músicas</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View style={detailStyles.optionsRow}>
        <TouchableOpacity onPress={() => setShowRename(true)} style={detailStyles.optionBtn}>
          <Text style={detailStyles.optionBtnText}>Renomear</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={detailStyles.optionBtn}>
          <Text style={[detailStyles.optionBtnText, { color: COLORS.semantic.error }]}>Excluir</Text>
        </TouchableOpacity>
      </View>

      <View style={detailStyles.sectionRow}>
        <Text style={detailStyles.sectionLabel}>MÚSICAS</Text>
      </View>
    </View>
  );

  return (
    <View style={detailStyles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg.base} />

      <Animated.View style={[detailStyles.navbar, { paddingTop: insets.top, opacity: navbarOpacity }]} pointerEvents="none">
        <Text style={detailStyles.navbarTitle} numberOfLines={1}>{playlist.name}</Text>
      </Animated.View>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[detailStyles.backButton, { top: insets.top + SPACING.sm }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={detailStyles.backIcon}>‹</Text>
      </TouchableOpacity>

      <Animated.FlatList
        data={playlistTracks}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            icon="🎶"
            title="Playlist vazia"
            subtitle='Toque em "+ Músicas" para adicionar'
          />
        }
        contentContainerStyle={[
          detailStyles.list,
          { paddingBottom: insets.bottom + SPACING.tabBarHeight + SIZES.miniPlayerHeight + SPACING.lg },
        ]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />

      <AddTracksModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        playlistId={playlistId}
      />
      <RenameModal
        visible={showRename}
        currentName={playlist.name}
        onClose={() => setShowRename(false)}
        onRename={(name) => renamePlaylist(playlistId, name)}
      />
    </View>
  );
};

const HERO_COVER = 140;

const detailStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg.base },
  list:   { flexGrow: 1 },

  navbar: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: SPACING.md, paddingHorizontal: SPACING.screenPadding, backgroundColor: COLORS.bg.base, alignItems: 'center', zIndex: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border.subtle },
  navbarTitle: { ...TYPOGRAPHY.title },

  backButton: { position: 'absolute', left: SPACING.screenPadding, zIndex: 20, width: SIZES.touchTarget, height: SIZES.touchTarget, alignItems: 'center', justifyContent: 'center' },
  backIcon:   { fontSize: 32, color: COLORS.text.primary, lineHeight: 36, fontWeight: '300' },

  hero: { alignItems: 'center', paddingTop: SPACING['3xl'], paddingBottom: SPACING.xl, paddingHorizontal: SPACING.screenPadding, gap: SPACING.sm },
  heroCover: { width: HERO_COVER, height: HERO_COVER, borderRadius: RADIUS.coverMedium, overflow: 'hidden', ...SHADOWS.md },
  heroCoverImage: { width: '100%', height: '100%' },
  heroCoverFallback: { backgroundColor: COLORS.bg.highlight, alignItems: 'center', justifyContent: 'center' },
  heroCoverIcon: { fontSize: 56, color: COLORS.text.tertiary },
  heroName:   { ...TYPOGRAPHY.h2, textAlign: 'center', marginTop: SPACING.sm },
  heroCount:  { ...TYPOGRAPHY.caption, color: COLORS.text.secondary },
  heroActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },

  playAllBtn:  { backgroundColor: COLORS.accent.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.button },
  playAllText: { ...TYPOGRAPHY.title, color: COLORS.text.inverse, fontWeight: '700' },
  secondaryBtn: { backgroundColor: COLORS.accent.muted, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.button },
  secondaryBtnText: { ...TYPOGRAPHY.title, color: COLORS.accent.primary, fontWeight: '600' },

  optionsRow: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xl, paddingHorizontal: SPACING.screenPadding, paddingBottom: SPACING.md },
  optionBtn:  { paddingVertical: SPACING.sm },
  optionBtnText: { ...TYPOGRAPHY.label, color: COLORS.text.secondary, fontWeight: '500' },

  sectionRow:   { paddingHorizontal: SPACING.screenPadding, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  sectionLabel: { ...TYPOGRAPHY.overline },

  removeIcon: { fontSize: 14, color: COLORS.text.tertiary },
});
