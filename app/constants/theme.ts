/**
 * App color palette for Beyond Classroom.
 * Import `Colors` anywhere you need a color — never hardcode hex values.
 */

import { Platform } from "react-native";

// ─── Brand palette ───────────────────────────────────────────────────────────
export const Brand = {
  primary: "#4F46E5", // indigo – main CTA colour
  primaryLight: "#818CF8", // lighter indigo for highlights
  secondary: "#06B6D4", // cyan – accent
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
} as const;

// ─── Semantic colours (light / dark) ─────────────────────────────────────────
const tintColorLight = Brand.primary;
const tintColorDark =
  Brand.primaryLight;

export const Colors = {
  light: {
    text: "#11181C",
    textSecondary: "#687076",
    background: "#FFFFFF",
    surface: "#F3F4F6",
    border: "#E5E7EB",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    background: "#0F172A",
    surface: "#1E293B",
    border: "#334155",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};

// ─── Category colour system ───────────────────────────────────────────────────
export const CategoryAccent: Record<string, string> = {
  Math: "#7C3AED",
  Science: "#10B981",
  Debate: "#F59E0B",
  Arts: "#EC4899",
  Language: "#3B82F6",
  Technology: "#8B5CF6",
  Sports: "#F97316",
};

export const CategoryBg: Record<string, string> = {
  Math: "#F5F3FF",
  Science: "#ECFDF5",
  Debate: "#FFFBEB",
  Arts: "#FDF2F8",
  Language: "#EFF6FF",
  Technology: "#FAF5FF",
  Sports: "#FFF7ED",
};

export const CategoryEmoji: Record<string, string> = {
  Math: "📐",
  Science: "🔬",
  Debate: "🎤",
  Arts: "🎨",
  Language: "📚",
  Technology: "🤖",
  Sports: "⚽",
};

// ─── Grade level colours ──────────────────────────────────────────────────────
export const GradeBg: Record<string, string> = {
  SD: "#DBEAFE",
  SMP: "#D1FAE5",
  SMA: "#FEF3C7",
};

export const GradeText: Record<string, string> = {
  SD: "#1D4ED8",
  SMP: "#047857",
  SMA: "#B45309",
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif:
      "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
