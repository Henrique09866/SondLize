import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { parseLrc } from '../services/lyricsParser';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

interface LyricsViewProps {
  lyrics: string;
  position: number; // in seconds
}

export const LyricsView: React.FC<LyricsViewProps> = ({ lyrics, position }) => {
  const parsedLyrics = useMemo(() => parseLrc(lyrics), [lyrics]);
  const flatListRef = useRef<FlatList>(null);
  
  // Find current active line index
  let activeIndex = -1;
  for (let i = 0; i < parsedLyrics.length; i++) {
    if (position >= parsedLyrics[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  useEffect(() => {
    if (activeIndex >= 0 && flatListRef.current) {
      // Scroll to active index, centered
      flatListRef.current.scrollToIndex({
        index: activeIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [activeIndex]);

  if (parsedLyrics.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Sem letras disponíveis</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={parsedLyrics}
        keyExtractor={(item, index) => `${item.time}-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
            }
          }, 100);
        }}
        renderItem={({ item, index }) => {
          const isActive = index === activeIndex;
          return (
            <Text
              style={[
                styles.lyricLine,
                isActive && styles.activeLyricLine,
              ]}
            >
              {item.text}
            </Text>
          );
        }}
      />
    </View>
  );
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },
  listContent: {
    paddingVertical: SCREEN_HEIGHT * 0.2, // Padding to allow scrolling the first/last lines to center
    paddingHorizontal: SPACING.lg,
  },
  lyricLine: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginVertical: SPACING.md,
    opacity: 0.6,
  },
  activeLyricLine: {
    color: COLORS.accent.primary,
    fontWeight: 'bold',
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
});
