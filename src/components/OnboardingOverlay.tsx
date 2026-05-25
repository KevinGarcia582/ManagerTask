import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useEffect, useRef } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useOnboarding } from "@/src/hooks/useOnboarding";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const TAB_COUNT = 6;
const TAB_WIDTH = SCREEN_WIDTH / TAB_COUNT;

export function OnboardingOverlay() {
  const { isActive, currentStep, totalSteps, stepInfo, nextStep, prevStep, skip, dismiss } = useOnboarding();
  const scrollRef = useRef<ScrollView>(null);

  const owlBounce = useSharedValue(0);
  const owlTilt = useSharedValue(0);
  const owlTalk = useSharedValue(0);
  const tooltipOpacity = useSharedValue(0);
  const tooltipScale = useSharedValue(0.8);

  useEffect(() => {
    owlBounce.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 900 }),
        withTiming(0, { duration: 900 }),
      ),
      -1,
      true,
    );

    const tiltInterval = setInterval(() => {
      owlTilt.value = withSequence(
        withSpring(4, { duration: 300 }),
        withSpring(-4, { duration: 300 }),
        withSpring(0, { duration: 200 }),
      );
    }, 3500);

    return () => {
      clearInterval(tiltInterval);
      owlBounce.value = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    owlTalk.value = withSequence(
      withSpring(1.08, { duration: 250 }),
      withSpring(1, { duration: 250 }),
    );
  }, [currentStep, owlTalk]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentStep]);

  useEffect(() => {
    tooltipOpacity.value = withTiming(isActive ? 1 : 0, { duration: 400 });
    tooltipScale.value = withSpring(isActive ? 1 : 0.8, { damping: 15 });
  }, [isActive, tooltipOpacity, tooltipScale]);

  const owlStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: owlBounce.value },
      { rotate: `${owlTilt.value}deg` },
      { scale: owlTalk.value },
    ],
  }));

  const tooltipStyle = useAnimatedStyle(() => ({
    opacity: tooltipOpacity.value,
    transform: [{ scale: tooltipScale.value }],
  }));

  if (!isActive || !stepInfo) return null;

  const arrowLeft = TAB_WIDTH * currentStep + TAB_WIDTH / 2 - 10;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={skip} />

      <View style={styles.container} pointerEvents="box-none">
        {/* Owl peeking from above the speech bubble */}
        <View style={styles.owlArea}>
          <Animated.View style={[styles.owlWrap, owlStyle]}>
            <Text style={styles.owlCap}>🎓</Text>
            <View style={styles.owlBody}>
              <Text style={styles.owlFace}>🦉</Text>
            </View>
          </Animated.View>
        </View>

        {/* Speech bubble tooltip */}
        <Animated.View style={[styles.tooltip, tooltipStyle]}>
          <ScrollView
            ref={scrollRef}
            style={styles.tooltipScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View style={styles.stepRow}>
              <Text style={styles.stepCount}>
                {currentStep + 1} de {totalSteps}
              </Text>
              <View style={styles.stepDots}>
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.stepDot,
                      i === currentStep && styles.stepDotActive,
                      i < currentStep && styles.stepDotDone,
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.titleRow}>
              <View style={styles.titleIcon}>
                <MaterialCommunityIcons name={stepInfo.icon} size={22} color="white" />
              </View>
              <Text style={styles.titleText}>{stepInfo.title}</Text>
            </View>

            <Text style={styles.subtitle}>{stepInfo.subtitle}</Text>

            <View style={styles.detailsList}>
              {(stepInfo.details ?? []).map((detail, i) => (
                <View key={i} style={styles.detailRow}>
                  <MaterialCommunityIcons name="chevron-right" size={12} color="#003B82" />
                  <Text style={styles.detailText}>{detail}</Text>
                </View>
              ))}
            </View>

            <View style={styles.scrollSpacer} />
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.buttonsRow}>
              {currentStep > 0 ? (
                <TouchableOpacity style={styles.secondaryBtn} onPress={prevStep} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="chevron-left" size={18} color="#003B82" />
                  <Text style={styles.secondaryBtnText}>Anterior</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flex: 1 }} />
              )}
              <TouchableOpacity style={styles.primaryBtn} onPress={nextStep} activeOpacity={0.7}>
                <Text style={styles.primaryBtnText}>
                  {currentStep === totalSteps - 1 ? "¡Entendido!" : "Siguiente"}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="white" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.dismissBtn} onPress={dismiss} activeOpacity={0.5}>
              <Text style={styles.dismissText}>Saltar recorrido</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={[styles.tabArrow, { left: arrowLeft }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 11, 45, 0.62)",
  },
  container: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 90,
  },

  owlArea: {
    alignItems: "center",
    zIndex: 3,
    marginBottom: -56,
  },
  owlWrap: {
    alignItems: "center",
  },
  owlCap: {
    fontSize: 24,
    marginBottom: -4,
  },
  owlBody: {
    backgroundColor: "white",
    borderRadius: 48,
    padding: 12,
    shadowColor: "#003B82",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  owlFace: {
    fontSize: 44,
  },

  tooltip: {
    backgroundColor: "white",
    borderRadius: 24,
    marginHorizontal: 16,
    width: SCREEN_WIDTH - 32,
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 2,
  },
  tooltipScroll: {
    maxHeight: SCREEN_HEIGHT * 0.34,
  },

  stepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  stepCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A0A7B5",
  },
  stepDots: {
    flexDirection: "row",
    gap: 5,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E0E0E0",
  },
  stepDotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#003B82",
  },
  stepDotDone: {
    backgroundColor: "#003B82",
    opacity: 0.4,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  titleIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#003B82",
    justifyContent: "center",
    alignItems: "center",
  },
  titleText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0B356C",
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
    paddingHorizontal: 22,
    paddingTop: 8,
  },

  detailsList: {
    paddingHorizontal: 22,
    paddingTop: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 9,
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 19,
  },
  scrollSpacer: {
    height: 8,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(0, 59, 130, 0.07)",
    gap: 4,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#003B82",
  },
  primaryBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#003B82",
    gap: 4,
    shadowColor: "#003B82",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
  },

  dismissBtn: {
    alignItems: "center",
    marginTop: 12,
  },
  dismissText: {
    fontSize: 12,
    color: "#A0A7B5",
  },

  tabArrow: {
    position: "absolute",
    bottom: 74,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 11,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "white",
  },
});
