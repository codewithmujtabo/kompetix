import {
  Brand,
  CategoryAccent,
  CategoryBg,
  CategoryEmoji,
  GradeBg,
  GradeText,
} from "@/constants/theme";
import { useUser } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as competitionsService from "@/services/competitions.service";
import * as favoritesService from "@/services/favorites.service";
import * as parentsService from "@/services/parents.service";
import { Analytics } from "@/services/analytics";

// Grade level filters - now using ranges to match numeric grades
const GRADE_FILTERS = [
  { label: "SD", grades: ["1", "2", "3", "4", "5", "6"] },
  { label: "SMP", grades: ["7", "8", "9"] },
  { label: "SMA", grades: ["10", "11", "12"] },
] as const;

function formatPrice(fee: number) {
  return fee === 0 ? "FREE" : `Rp ${fee.toLocaleString("id-ID")}`;
}

function formatDeadline(date: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDeadlineStatus(
  date: string | null
): { label: string; color: string; bg: string } | null {
  if (!date) return null;
  const days = Math.ceil(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (days < 0) return null;
  if (days <= 3)
    return { label: `‼ ${days} days left`, color: "#fff", bg: "#EF4444" };
  if (days <= 7)
    return {
      label: `⚡ ${days} days left`,
      color: "#92400E",
      bg: "#FEF3C7",
    };
  if (days <= 14)
    return { label: `${days} days left`, color: "#713F12", bg: "#FDE68A" };
  return null;
}

function formatStatusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Skeleton card shown while loading */
function SkeletonCard() {
  return (
    <View style={[styles.card, styles.skeleton]}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={styles.skeletonCircle} />
        <View style={{ flex: 1 }}>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: "55%", marginTop: 8 }]} />
          <View style={[styles.skeletonLine, { width: "35%", marginTop: 8 }]} />
        </View>
      </View>
    </View>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, registrations } = useUser();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());

  const displayName =
    (user as any)?.fullName?.split(" ")[0] ??
    (user as any)?.name?.split(" ")[0] ??
    "there";

  const userRole = (user as any)?.role ?? "";
  const isParent = userRole === "parent";

  // Redirect non-student/parent roles away from this screen
  useEffect(() => {
    if (userRole === "teacher") router.replace("/(tabs)/teacher-dashboard");
    else if (userRole === "admin") router.replace("/(tabs)/web-portal-redirect");
  }, [userRole]);

  const {
    data: allCompetitions = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["competitions"],
    queryFn: () => competitionsService.list(),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const {
    data: linkedChildren = [],
    isLoading: isLoadingChildren,
    isError: isChildrenError,
    refetch: refetchChildren,
  } = useQuery({
    queryKey: ["myChildren", (user as any)?.id],
    queryFn: () => parentsService.getMyChildren("active"),
    enabled: isParent,
    staleTime: 60 * 1000,
  });

  // Sprint 4, Track B (T7) - Fetch personalized recommendations
  const {
    data: recommendations = [],
    isLoading: isLoadingRecommendations,
  } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => competitionsService.getRecommended(10),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: !isParent && registrations.length > 0, // Only fetch if user has registrations
  });

  // Load favorited competitions
  useEffect(() => {
    if (isParent) return;
    const loadFavorites = async () => {
      try {
        const favorites = await favoritesService.list();
        setFavoritedIds(new Set(favorites.map(f => f.id)));
      } catch (err) {
        console.error("Failed to load favorites:", err);
      }
    };
    loadFavorites();
  }, []);

  // Toggle favorite
  const toggleFavorite = async (compId: string, isFavorited: boolean) => {
    try {
      if (isFavorited) {
        await favoritesService.remove(compId);
        setFavoritedIds(prev => {
          const next = new Set(prev);
          next.delete(compId);
          return next;
        });
      } else {
        await favoritesService.add(compId);
        setFavoritedIds(prev => new Set(prev).add(compId));
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const categories = useMemo(() => {
    // Extract all unique categories (split multi-line categories)
    const allCats = allCompetitions.flatMap((c) =>
      c.category.split("\n").map((cat) => cat.trim()).filter(Boolean)
    );
    const cats = [...new Set(allCats)].sort();
    return cats;
  }, [allCompetitions]);

  const filtered = useMemo(() => {
    return allCompetitions.filter((c) => {
      // Check if competition has the active category (handle multi-line categories)
      if (activeCategory) {
        const compCategories = c.category
          .split("\n")
          .map((cat) => cat.trim())
          .filter(Boolean);
        if (!compCategories.includes(activeCategory)) return false;
      }

      // Grade filter - check if any of the competition's grades match the selected grade range
      if (gradeFilter) {
        const compGrades = c.gradeLevel
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean);

        const filterConfig = GRADE_FILTERS.find(f => f.label === gradeFilter);
        if (filterConfig) {
          const hasMatchingGrade = compGrades.some(grade =>
            (filterConfig.grades as readonly string[]).includes(grade)
          );
          if (!hasMatchingGrade) return false;
        }
      }

      // Search - check competition name, organizer, and category
      if (query) {
        const searchLower = query.toLowerCase();
        const nameMatch = c.name.toLowerCase().includes(searchLower);
        const organizerMatch = c.organizerName.toLowerCase().includes(searchLower);
        const categoryMatch = c.category.toLowerCase().includes(searchLower);

        if (!nameMatch && !organizerMatch && !categoryMatch) return false;
      }

      return true;
    });
  }, [allCompetitions, query, activeCategory, gradeFilter]);

  const parentSummary = useMemo(() => {
    const activeChildren = linkedChildren.filter((child) => child.linkStatus === "active");
    const allRegistrations = activeChildren.flatMap((child) =>
      child.registrations.map((registration) => ({
        ...registration,
        childName: child.fullName,
        childId: child.studentId,
        childGrade: child.grade,
        childSchool: child.school,
      }))
    );

    const attentionStatuses = new Set(["pending_review", "registered", "rejected"]);
    const needsAttention = allRegistrations.filter((registration) =>
      attentionStatuses.has(registration.status)
    );

    const joinedCompetitionIds = new Set(allRegistrations.map((registration) => registration.competitionId));
    const childGrades = new Set(
      activeChildren
        .map((child) => String(child.grade || "").trim())
        .filter(Boolean)
    );

    const suggestedCompetitions = allCompetitions
      .filter((competition) => {
        if (joinedCompetitionIds.has(competition.id)) return false;
        if (childGrades.size === 0) return false;
        return competition.gradeLevel
          .split(",")
          .map((grade) => grade.trim())
          .some((grade) => childGrades.has(grade));
      })
      .sort((a, b) => {
        const aTime = a.regCloseDate ? new Date(a.regCloseDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.regCloseDate ? new Date(b.regCloseDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      })
      .slice(0, 6);

    const upcomingDeadlines = [...allRegistrations]
      .filter((registration) => registration.regCloseDate)
      .sort(
        (a, b) =>
          new Date(a.regCloseDate).getTime() - new Date(b.regCloseDate).getTime()
      )
      .slice(0, 5);

    return {
      activeChildren,
      allRegistrations,
      needsAttention,
      suggestedCompetitions,
      upcomingDeadlines,
    };
  }, [allCompetitions, linkedChildren]);

  if (isParent) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.parentScrollContent}>
          <View style={styles.parentHero}>
            <Text style={styles.parentHeroTitle}>Parent Desk</Text>
            <Text style={styles.parentHeroSubtitle}>
              Track your children, spot applications that need action, and review competitions that fit their grade levels.
            </Text>
          </View>

          <View style={styles.parentStatRow}>
            <View style={styles.parentStatCard}>
              <Text style={styles.parentStatValue}>{parentSummary.activeChildren.length}</Text>
              <Text style={styles.parentStatLabel}>Linked Children</Text>
            </View>
            <View style={styles.parentStatCard}>
              <Text style={styles.parentStatValue}>{parentSummary.allRegistrations.length}</Text>
              <Text style={styles.parentStatLabel}>Tracked Entries</Text>
            </View>
            <View style={styles.parentStatCard}>
              <Text style={styles.parentStatValue}>{parentSummary.needsAttention.length}</Text>
              <Text style={styles.parentStatLabel}>Needs Attention</Text>
            </View>
          </View>

          <View style={styles.parentSection}>
            <View style={styles.parentSectionHeader}>
              <Text style={styles.parentSectionTitle}>Your Children</Text>
              <Pressable onPress={() => router.push("/(tabs)/children")}>
                <Text style={styles.parentSectionAction}>Manage Links</Text>
              </Pressable>
            </View>

            {isLoadingChildren ? (
              <ActivityIndicator color={Brand.primary} style={{ marginVertical: 24 }} />
            ) : isChildrenError ? (
              <View style={styles.parentEmptyCard}>
                <Text style={styles.parentEmptyTitle}>Could not load linked children</Text>
                <Pressable style={styles.parentSmallButton} onPress={() => refetchChildren()}>
                  <Text style={styles.parentSmallButtonText}>Retry</Text>
                </Pressable>
              </View>
            ) : parentSummary.activeChildren.length === 0 ? (
              <View style={styles.parentEmptyCard}>
                <Text style={styles.parentEmptyTitle}>No approved child links yet</Text>
                <Text style={styles.parentEmptyBody}>
                  Ask your child to invite you, enter the PIN in the Children tab, then wait for them to approve the connection.
                </Text>
                <Pressable
                  style={styles.parentSmallButton}
                  onPress={() => router.push("/(tabs)/children")}
                >
                  <Text style={styles.parentSmallButtonText}>Open Children Tab</Text>
                </Pressable>
              </View>
            ) : (
              parentSummary.activeChildren.map((child) => (
                <View key={child.linkId} style={styles.parentChildCard}>
                  <View style={styles.parentChildTop}>
                    <View style={styles.parentAvatar}>
                      <Text style={styles.parentAvatarText}>
                        {child.fullName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.parentChildName}>{child.fullName}</Text>
                      <Text style={styles.parentChildMeta}>
                        Grade {child.grade || "-"} • {child.school || "School not set"}
                      </Text>
                    </View>
                    <View style={styles.parentBadge}>
                      <Text style={styles.parentBadgeText}>
                        {child.registrations.length} comps
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.parentSection}>
            <View style={styles.parentSectionHeaderStack}>
              <Text style={styles.parentSectionTitle}>Needs Your Attention</Text>
              <Text style={styles.parentSectionSubtitle}>
                Reviews, pending applications, or rejected entries that may need your follow-up.
              </Text>
            </View>
            {parentSummary.needsAttention.length === 0 ? (
              <View style={styles.parentEmptyCard}>
                <Text style={styles.parentEmptyTitle}>Everything looks calm</Text>
                <Text style={styles.parentEmptyBody}>
                  No pending reviews or flagged competition applications right now.
                </Text>
              </View>
            ) : (
              parentSummary.needsAttention.map((registration) => (
                <View key={registration.registrationId} style={styles.parentTimelineCard}>
                  <View style={styles.parentTimelineTop}>
                    <View style={styles.parentTimelineCopy}>
                      <Text style={styles.parentTimelineName}>{registration.competitionName}</Text>
                      <Text style={styles.parentTimelineMeta}>
                        {registration.childName} • {registration.category} • {registration.level}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.parentStatusPill,
                        registration.status === "pending_review"
                          ? styles.parentStatusBlue
                          : registration.status === "rejected"
                          ? styles.parentStatusRed
                          : styles.parentStatusAmber,
                      ]}
                    >
                      <Text style={styles.parentStatusText}>
                        {formatStatusLabel(registration.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.parentSection}>
            <View style={styles.parentSectionHeaderStack}>
              <Text style={styles.parentSectionTitle}>Upcoming Deadlines</Text>
              <Text style={styles.parentSectionSubtitle}>
                The next registration cutoffs across the competitions your children are already tracking.
              </Text>
            </View>
            {parentSummary.upcomingDeadlines.length === 0 ? (
              <View style={styles.parentEmptyCard}>
                <Text style={styles.parentEmptyTitle}>No tracked deadlines yet</Text>
                <Text style={styles.parentEmptyBody}>
                  Once your children join competitions, their important registration dates will appear here.
                </Text>
              </View>
            ) : (
              parentSummary.upcomingDeadlines.map((registration) => (
                <View key={`${registration.registrationId}-deadline`} style={styles.parentDeadlineCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.parentDeadlineName}>{registration.competitionName}</Text>
                    <Text style={styles.parentDeadlineMeta}>{registration.childName}</Text>
                  </View>
                  <View style={styles.parentDeadlineBadge}>
                    <Text style={styles.parentDeadlineText}>
                      {formatDeadline(registration.regCloseDate)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.parentSection}>
            <View style={styles.parentSectionHeaderStack}>
              <Text style={styles.parentSectionTitle}>Suggested For Their Grades</Text>
              <Text style={styles.parentSectionSubtitle}>
                Shortlisted competitions that match the grade levels of your approved linked children.
              </Text>
            </View>
            {isLoading ? (
              <ActivityIndicator color={Brand.primary} style={{ marginVertical: 24 }} />
            ) : parentSummary.suggestedCompetitions.length === 0 ? (
              <View style={styles.parentEmptyCard}>
                <Text style={styles.parentEmptyTitle}>No tailored suggestions yet</Text>
                <Text style={styles.parentEmptyBody}>
                  Link a child account with grade information to get relevant competition suggestions here.
                </Text>
              </View>
            ) : (
              parentSummary.suggestedCompetitions.map((item) => {
                const categories = item.category
                  .split("\n")
                  .map((cat) => cat.trim())
                  .filter(Boolean);
                const firstCategory = categories[0] || "General";
                const accent = CategoryAccent[firstCategory] ?? Brand.primary;
                const catBg = CategoryBg[firstCategory] ?? "#F5F8FF";

                return (
                  <Pressable
                    key={item.id}
                    style={[styles.card, { borderLeftColor: accent }]}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/competitions/[id]",
                        params: { id: item.id },
                      })
                    }
                  >
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <View style={styles.parentSuggestionMetaRow}>
                      <Text style={styles.cardOrg}>{item.organizerName}</Text>
                      <View style={[styles.parentCategoryTag, { backgroundColor: catBg }]}>
                        <Text style={[styles.parentCategoryText, { color: accent }]}>
                          {firstCategory}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.parentSuggestionBody}>
                      Grades: {item.gradeLevel.replace(/,/g, ", ")} • Closes {formatDeadline(item.regCloseDate)}
                    </Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardPrice}>{formatPrice(item.fee)}</Text>
                      <Text style={[styles.cardAction, { color: accent }]}>Review →</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  const ListHeader = () => (
    <View>
      {/* Personalized greeting */}
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>Hello, {displayName}! 👋</Text>
        <Text style={styles.greetingSubtitle}>
          {isLoading
            ? isParent ? "Finding competitions for your children..." : "Finding competitions for you..."
            : isParent
            ? `${allCompetitions.length} competitions available for your children`
            : `${allCompetitions.length} competitions available for you`}
        </Text>
      </View>

      {/* Sprint 4, Track B (T8) - Recommended section */}
      {registrations.length > 0 && recommendations.length > 0 && (
        <View style={styles.recommendedSection}>
          <View style={styles.recommendedHeader}>
            <Text style={styles.recommendedTitle}>
              ✨ {isParent ? "Recommended for your children" : "Recommended for you"}
            </Text>
            <Text style={styles.recommendedSubtitle}>
              {isParent
                ? "Based on their interests and activities"
                : "Based on your interests and registrations"}
            </Text>
          </View>
          <FlatList
            data={recommendations}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.recommendedList}
            renderItem={({ item }) => {
              // Extract first category for display
              const categories = item.category
                .split("\n")
                .map((cat) => cat.trim())
                .filter(Boolean);
              const firstCategory = categories[0] || "General";

              const accent = CategoryAccent[firstCategory] ?? Brand.primary;
              const catBg = CategoryBg[firstCategory] ?? "#F5F8FF";
              const emoji = CategoryEmoji[firstCategory] ?? "🏆";
              const urgency = getDeadlineStatus(item.regCloseDate);

              return (
                <Pressable
                  style={[styles.recommendedCard, { borderLeftColor: accent }]}
                  onPress={() => {
                    Analytics.track("recommendation_clicked", {
                      competitionId: item.id,
                      name: item.name,
                      category: item.category,
                      score: item.score,
                    });
                    router.push({
                      pathname: "/(tabs)/competitions/[id]",
                      params: { id: item.id },
                    });
                  }}
                >
                  <Text style={styles.recommendedCardTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.recommendedCardOrg} numberOfLines={1}>
                    {item.organizerName}
                  </Text>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    backgroundColor: catBg,
                    borderRadius: 6,
                    alignSelf: "flex-start",
                    marginTop: 6,
                  }}>
                    <Text style={{
                      fontSize: 10,
                      fontWeight: "600",
                      color: accent,
                    }}>
                      {firstCategory}
                    </Text>
                  </View>
                  {urgency && (
                    <View
                      style={[
                        styles.recommendedUrgency,
                        { backgroundColor: urgency.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.recommendedUrgencyText,
                          { color: urgency.color },
                        ]}
                      >
                        {urgency.label}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.recommendedCardPrice, { marginTop: 8 }]}>
                    {item.fee === 0
                      ? "FREE"
                      : `Rp ${item.fee.toLocaleString("id-ID")}`}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      )}

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search by name, organizer, or category..."
          placeholderTextColor="#94A3B8"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable
            style={styles.searchClearBtn}
            onPress={() => setQuery("")}
          >
            <Text style={styles.searchClearText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Category chips */}
      {categories.length > 0 && (
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(c) => c}
          contentContainerStyle={styles.chips}
          renderItem={({ item: cat }) => {
            const isActive = activeCategory === cat;
            const accent = CategoryAccent[cat] ?? Brand.primary;
            const bg = CategoryBg[cat] ?? "#F1F5F9";
            return (
              <Pressable
                onPress={() =>
                  setActiveCategory((p) => (p === cat ? null : cat))
                }
                style={[
                  styles.chip,
                  isActive
                    ? { backgroundColor: accent, borderColor: accent }
                    : { backgroundColor: bg, borderColor: "transparent" },
                ]}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    { color: isActive ? "#fff" : accent },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          }}
        />
      )}

      {/* Grade filter */}
      <View style={styles.gradeRow}>
        {GRADE_FILTERS.map((filter) => {
          const isActive = gradeFilter === filter.label;
          const bgColor = isActive
            ? (filter.label === "SD" ? "#FEF3C7" : filter.label === "SMP" ? "#DBEAFE" : "#DCFCE7")
            : "#fff";
          const textColor = isActive
            ? (filter.label === "SD" ? "#92400E" : filter.label === "SMP" ? "#1E40AF" : "#166534")
            : "#64748B";
          const borderColor = isActive ? textColor : "#E2E8F0";

          return (
            <Pressable
              key={filter.label}
              onPress={() => setGradeFilter((p) => (p === filter.label ? null : filter.label))}
              style={[
                styles.gradeBtn,
                {
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.gradeText,
                  { color: textColor },
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Active filters indicator and clear button */}
      {(query || activeCategory || gradeFilter) && (
        <View style={styles.activeFiltersRow}>
          <View style={styles.activeFiltersInfo}>
            <Text style={styles.activeFiltersText}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} found
            </Text>
            {query && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>"{query}"</Text>
              </View>
            )}
            {activeCategory && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>{activeCategory}</Text>
              </View>
            )}
            {gradeFilter && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>{gradeFilter}</Text>
              </View>
            )}
          </View>
          <Pressable
            style={styles.clearFiltersBtn}
            onPress={() => {
              setQuery("");
              setActiveCategory(null);
              setGradeFilter(null);
            }}
          >
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionTitle}>
        {isLoading ? "Loading..." : activeCategory || gradeFilter || query ? "" : `All Competitions (${filtered.length})`}
      </Text>
    </View>
  );

  if (isError) {
    return (
      <View
        style={[styles.container, styles.center, { paddingTop: insets.top }]}
      >
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorText}>Failed to load competitions</Text>
        <Pressable style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={isLoading ? [] : filtered}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={ListHeader}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          isLoading ? (
            <View>
              {[1, 2, 3, 4].map((k) => (
                <View key={k}>
                  <SkeletonCard />
                  <View style={{ height: 12 }} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
              <Text style={styles.emptyText}>No competitions found</Text>
              <Text style={styles.emptySubtext}>
                Try changing filters or keywords
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          // Extract first category for display (handle multi-line categories)
          const categories = item.category
            .split("\n")
            .map((cat) => cat.trim())
            .filter(Boolean);
          const firstCategory = categories[0] || "General";
          const categoryCount = categories.length;

          const accent = CategoryAccent[firstCategory] ?? Brand.primary;
          const catBg = CategoryBg[firstCategory] ?? "#F5F8FF";
          const emoji = CategoryEmoji[firstCategory] ?? "🏆";
          const urgency = getDeadlineStatus(item.regCloseDate);
          const grades = item.gradeLevel
            .split(",")
            .map((g) => g.trim())
            .filter(Boolean);

          const isFavorited = favoritedIds.has(item.id);

          return (
            <Pressable
              style={[styles.card, { borderLeftColor: accent }]}
              onPress={() => {
                Analytics.track("competition_viewed", {
                  competitionId: item.id,
                  name: item.name,
                  category: item.category,
                });
                router.push({
                  pathname: "/(tabs)/competitions/[id]",
                  params: { id: item.id },
                });
              }}
            >
              {/* Heart icon in top-right corner */}
              <TouchableOpacity
                style={styles.heartBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  toggleFavorite(item.id, isFavorited);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.heartIcon}>
                  {isFavorited ? "❤️" : "🤍"}
                </Text>
              </TouchableOpacity>

              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <Text style={styles.cardOrg}>{item.organizerName}</Text>
                    {categoryCount > 1 ? (
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        backgroundColor: catBg,
                        borderRadius: 6,
                      }}>
                        <Text style={{
                          fontSize: 10,
                          fontWeight: "600",
                          color: accent,
                        }}>
                          {firstCategory} +{categoryCount - 1}
                        </Text>
                      </View>
                    ) : (
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        backgroundColor: catBg,
                        borderRadius: 6,
                      }}>
                        <Text style={{
                          fontSize: 10,
                          fontWeight: "600",
                          color: accent,
                        }}>
                          {firstCategory}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Grade pills */}
                  {grades.length > 0 && (
                    <View style={styles.gradePillRow}>
                      {grades.map((g) => (
                        <View
                          key={g}
                          style={[
                            styles.gradePill,
                            { backgroundColor: GradeBg[g] ?? "#F1F5F9" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.gradePillText,
                              { color: GradeText[g] ?? "#475569" },
                            ]}
                          >
                            {g}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Deadline urgency badge */}
              {urgency && (
                <View
                  style={[
                    styles.urgencyBadge,
                    { backgroundColor: urgency.bg },
                  ]}
                >
                  <Text
                    style={[styles.urgencyText, { color: urgency.color }]}
                  >
                    {urgency.label}
                  </Text>
                </View>
              )}

              {/* Deadline text (always) */}
              {!urgency && item.regCloseDate && (
                <Text style={styles.deadlineText}>
                  Tutup {formatDeadline(item.regCloseDate)}
                </Text>
              )}

              <View style={styles.cardFooter}>
                {item.fee === 0 ? (
                  <View style={styles.gratisBadge}>
                    <Text style={styles.gratisText}>GRATIS</Text>
                  </View>
                ) : (
                  <Text style={styles.cardPrice}>
                    Rp {item.fee.toLocaleString("id-ID")}
                  </Text>
                )}
                <Text style={[styles.cardAction, { color: accent }]}>
                  View Details →
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },

  // Greeting
  greeting: { paddingHorizontal: 4, marginBottom: 16, marginTop: 14 },
  greetingText: { fontSize: 26, fontWeight: "800", color: "#0F172A" },
  greetingSubtitle: { fontSize: 14, color: "#64748B", marginTop: 4 },

  // Recommended section (Sprint 4, Track B, T8)
  recommendedSection: { marginBottom: 16 },
  recommendedHeader: { paddingHorizontal: 4, marginBottom: 12 },
  recommendedTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  recommendedSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  recommendedList: { paddingBottom: 4 },
  recommendedCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 180,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recommendedCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 18,
    marginBottom: 4,
  },
  recommendedCardOrg: {
    fontSize: 11,
    color: "#64748B",
  },
  recommendedUrgency: {
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  recommendedUrgencyText: {
    fontSize: 10,
    fontWeight: "700",
  },
  recommendedCardPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },

  parentScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  parentHero: {
    backgroundColor: "#EDE9FE",
    borderRadius: 24,
    padding: 20,
    marginTop: 14,
    marginBottom: 14,
  },
  parentHeroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#312E81",
  },
  parentHeroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#4338CA",
  },
  parentStatRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  parentStatCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  parentStatValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  parentStatLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  parentSection: {
    marginBottom: 18,
  },
  parentSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  parentSectionHeaderStack: {
    marginBottom: 12,
  },
  parentSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  parentSectionSubtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748B",
  },
  parentSectionAction: {
    fontSize: 13,
    fontWeight: "700",
    color: Brand.primary,
  },
  parentEmptyCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  parentEmptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  parentEmptyBody: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
    marginTop: 6,
  },
  parentSmallButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    backgroundColor: Brand.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  parentSmallButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  parentChildCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  parentChildTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  parentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  parentAvatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  parentChildName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  parentChildMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
  },
  parentBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  parentBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
  },
  parentTimelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E6EAF2",
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  parentTimelineTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  parentTimelineCopy: {
    flex: 1,
    paddingRight: 4,
  },
  parentTimelineName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 20,
  },
  parentTimelineMeta: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  parentStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  parentStatusBlue: {
    backgroundColor: "#DBEAFE",
  },
  parentStatusRed: {
    backgroundColor: "#FEE2E2",
  },
  parentStatusAmber: {
    backgroundColor: "#FEF3C7",
  },
  parentStatusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
  },
  parentDeadlineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E6EAF2",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  parentDeadlineName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 20,
  },
  parentDeadlineMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
  },
  parentDeadlineBadge: {
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  parentDeadlineText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
  },
  parentSuggestionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  parentCategoryTag: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  parentCategoryText: {
    fontSize: 11,
    fontWeight: "700",
  },
  parentSuggestionBody: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748B",
  },

  // Search
  searchContainer: {
    position: "relative",
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingRight: 44,
    height: 46,
    borderWidth: 1,
    borderColor: "#E6EEF8",
    fontSize: 14,
    color: "#0F172A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchClearBtn: {
    position: "absolute",
    right: 12,
    top: 11,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  searchClearText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },

  // Category chips
  chips: { paddingBottom: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
  },
  chipLabel: { fontWeight: "700", fontSize: 13 },

  // Grade filter
  gradeRow: { flexDirection: "row", marginTop: 2, marginBottom: 10 },
  gradeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  gradeText: { fontWeight: "700", fontSize: 13 },

  // Active filters
  activeFiltersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  activeFiltersInfo: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    flex: 1,
    gap: 6,
  },
  activeFiltersText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  filterChip: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: Brand.primary,
  },
  clearFiltersBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // Competition card
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
  },
  heartBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  heartIcon: {
    fontSize: 18,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start" },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 21,
  },
  cardOrg: { fontSize: 12, color: "#64748B", marginTop: 3 },

  // Grade pills
  gradePillRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6, gap: 4 },
  gradePill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  gradePillText: { fontSize: 11, fontWeight: "700" },

  // Deadline urgency
  urgencyBadge: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
  },
  urgencyText: { fontSize: 12, fontWeight: "700" },
  deadlineText: { fontSize: 12, color: "#94A3B8", marginTop: 8 },

  // Card footer
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  gratisBadge: {
    backgroundColor: "#D1FAE5",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  gratisText: { color: "#065F46", fontWeight: "800", fontSize: 13 },
  cardPrice: { fontWeight: "800", color: "#0F172A", fontSize: 14 },
  cardAction: { fontWeight: "700", fontSize: 13 },

  // Skeleton
  skeleton: { opacity: 0.55 },
  skeletonCircle: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
    marginRight: 12,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: "#E2E8F0",
    borderRadius: 6,
    width: "80%",
  },

  // Error / empty
  errorEmoji: { fontSize: 48, marginBottom: 12 },
  errorText: { fontSize: 15, color: "#64748B", marginBottom: 16 },
  retryBtn: {
    backgroundColor: Brand.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: "#fff", fontWeight: "700" },
  emptyText: { fontSize: 15, color: "#475569", fontWeight: "700" },
  emptySubtext: { fontSize: 13, color: "#94A3B8", marginTop: 4 },
});
