import { Brand } from "@/constants/theme";
import { router } from "expo-router";
import React, {
    useRef,
    useState,
} from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewToken,
    useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Slide data ───────────────────────────────────────────────────────────────
// bg, button, skip are always white/Brand.primary — only titleColor changes per slide
const slides = [
  {
    id: "1",
    emoji: "🏆",
    title:
      "One Place for\nAll Competitions",
    titleColor: Brand.primary,
    description:
      "Discover every national and international competition — EMC, ISPO, OSEBI, Komodo Math, IGO, and more — all in a single app.",
  },
  {
    id: "2",
    emoji: "📋",
    title: "Register &\nPay Instantly",
    titleColor: "#7C3AED",
    description:
      "Fill your form, choose your payment method, and get your confirmation — done in under 2 minutes.",
  },
  {
    id: "3",
    emoji: "🎓",
    title:
      "Track Results &\nGrow Further",
    titleColor: "#0369A1",
    description:
      "Get your e-certificate, see your score, and discover the next competition that fits your level and interest.",
  },
] as const;

type Slide = (typeof slides)[number];

// ─── Single slide ─────────────────────────────────────────────────────────────
function OnboardingSlide({
  item,
  width,
}: {
  item: Slide;
  width: number;
}) {
  return (
    <View
      style={[styles.slide, { width }]}
    >
      <View
        style={styles.emojiContainer}
      >
        <Text style={styles.emoji}>
          {item.emoji}
        </Text>
      </View>
      <Text
        style={[
          styles.title,
          { color: item.titleColor },
        ]}
      >
        {item.title}
      </Text>
      <Text style={styles.description}>
        {item.description}
      </Text>
    </View>
  );
}

// ─── Dot indicator ────────────────────────────────────────────────────────────
function Dots({
  current,
}: {
  current: number;
}) {
  return (
    <View style={styles.dotsRow}>
      {slides.map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current
              ? {
                  width: 24,
                  backgroundColor:
                    Brand.primary,
                }
              : {
                  backgroundColor:
                    "#CBD5E1",
                },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const { width } =
    useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] =
    useState(0);
  const flatListRef =
    useRef<FlatList<Slide>>(null);

  const goToAuth = () =>
    router.navigate(
      "/(auth)/login" as any,
    );

  const handleViewableItemsChanged =
    useRef(
      ({
        viewableItems,
      }: {
        viewableItems: ViewToken[];
      }) => {
        if (viewableItems.length > 0) {
          setActiveIndex(
            viewableItems[0].index ?? 0,
          );
        }
      },
    ).current;

  const handleNext = () => {
    if (
      activeIndex <
      slides.length - 1
    ) {
      flatListRef.current?.scrollToIndex(
        {
          index: activeIndex + 1,
          animated: true,
        },
      );
    } else {
      goToAuth();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {/* Skip button */}
      <TouchableOpacity
        style={styles.skipBtn}
        onPress={goToAuth}
        hitSlop={12}
      >
        <Text style={styles.skipText}>
          Skip
        </Text>
      </TouchableOpacity>

      {/* Slides — flex:1 fills all remaining space */}
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OnboardingSlide
            item={item}
            width={width}
          />
        )}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={
          false
        }
        onViewableItemsChanged={
          handleViewableItemsChanged
        }
        viewabilityConfig={{
          viewAreaCoveragePercentThreshold: 50,
        }}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        style={styles.list}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <Dots current={activeIndex} />
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text
            style={styles.nextBtnText}
          >
            {activeIndex ===
            slides.length - 1
              ? "Get Started"
              : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  skipBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
    color: Brand.primary,
  },
  list: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    backgroundColor: "#fff",
  },
  emojiContainer: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 5,
  },
  emoji: {
    fontSize: 62,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 36,
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: "center",
    gap: 20,
    backgroundColor: "#fff",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    width: 8,
  },
  nextBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: Brand.primary,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
