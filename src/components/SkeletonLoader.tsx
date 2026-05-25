import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

const COLORS = {
  skeleton: "#E5E7EB",
  shimmer: "#F3F4F6",
};

export function SkeletonBlock({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: COLORS.skeleton,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function TaskCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <SkeletonBlock width={26} height={26} borderRadius={13} />
        <View style={styles.cardInfo}>
          <SkeletonBlock width="75%" height={16} borderRadius={6} />
          <SkeletonBlock width="50%" height={12} borderRadius={6} style={{ marginTop: 6 }} />
        </View>
        <SkeletonBlock width={18} height={18} borderRadius={9} />
      </View>
    </View>
  );
}

export function NoteCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <SkeletonBlock width={10} height={10} borderRadius={5} />
        <SkeletonBlock width="40%" height={16} borderRadius={6} />
        <View style={{ flex: 1 }} />
        <SkeletonBlock width={28} height={28} borderRadius={14} />
      </View>
      <View style={styles.gradeRow}>
        <SkeletonBlock width="100%" height={36} borderRadius={10} style={{ flex: 1 }} />
        <SkeletonBlock width="100%" height={36} borderRadius={10} style={{ flex: 1 }} />
        <SkeletonBlock width="100%" height={36} borderRadius={10} style={{ flex: 1 }} />
        <SkeletonBlock width="100%" height={36} borderRadius={10} style={{ flex: 1 }} />
      </View>
      <SkeletonBlock width="100%" height={6} borderRadius={3} style={{ marginTop: 10 }} />
      <SkeletonBlock width="60%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
    </View>
  );
}

export function DashboardSkeleton() {
  return (
    <View style={{ padding: 16 }}>
      <SkeletonBlock width="80%" height={14} borderRadius={6} style={{ marginBottom: 12 }} />
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.card}>
          <View style={styles.cardRow}>
            <SkeletonBlock width={8} height={8} borderRadius={4} />
            <View style={styles.cardInfo}>
              <SkeletonBlock width="60%" height={14} borderRadius={6} />
              <SkeletonBlock width="30%" height={10} borderRadius={5} style={{ marginTop: 4 }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardInfo: {
    flex: 1,
  },
  gradeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
});
