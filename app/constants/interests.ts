/**
 * Interest Categories (Sprint 4, Track B, T4)
 * Standard categories matching competition categories for personalized recommendations
 */

export const INTEREST_CATEGORIES = [
  "Math",
  "Science",
  "Debate",
  "Arts",
  "Language",
  "Technology",
  "Sports",
] as const;

export type InterestCategory = typeof INTEREST_CATEGORIES[number];

/**
 * Parse free text interests into standard categories
 * Used for backward compatibility and interest migration
 */
export function parseInterests(interestsText: string | null): string[] {
  if (!interestsText) return [];

  const normalized = interestsText.toLowerCase();
  const matched: string[] = [];

  for (const category of INTEREST_CATEGORIES) {
    if (normalized.includes(category.toLowerCase())) {
      matched.push(category);
    }
  }

  // If no matches found, split by common delimiters and return as-is
  if (matched.length === 0) {
    return interestsText
      .split(/[,;]/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  return matched;
}
