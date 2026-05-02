/**
 * Recommendations Service
 * Sprint 4, Track B (T5), Track C (T9), Track D (T13)
 *
 * Provides personalized competition recommendations and interest matching
 */

import { pool } from "../config/database";

/**
 * Parse user interests from comma/semicolon-separated string
 */
function parseInterests(interestsText: string | null): string[] {
  if (!interestsText) return [];
  return interestsText
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * T5 - Get personalized competition recommendations for a user
 * Algorithm:
 * 1. Match user interests with competition categories (+3 points)
 * 2. Match grade level (+2 points)
 * 3. Boost if user registered for similar category before (+1 point)
 * 4. Boost if deadline approaching (within 7 days) (+1 point)
 * 5. Filter out already registered competitions
 * 6. Filter out closed registrations
 */
export async function getRecommendations(
  userId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    // Get user profile
    const userResult = await pool.query(
      `SELECT u.id, s.grade, s.interests, u.city
       FROM users u
       LEFT JOIN students s ON s.id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return [];
    }

    const user = userResult.rows[0];
    const userInterests = parseInterests(user.interests);
    const userGrade = user.grade;

    // Get user's past registrations for category scoring
    const pastRegsResult = await pool.query(
      `SELECT DISTINCT c.category
       FROM registrations r
       JOIN competitions c ON c.id = r.comp_id
       WHERE r.user_id = $1`,
      [userId]
    );
    const pastCategories = pastRegsResult.rows.map((r) => r.category);

    // Get competitions user hasn't registered for, with open registration
    const compsResult = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM registrations WHERE comp_id = c.id) as reg_count
       FROM competitions c
       WHERE c.id NOT IN (
         SELECT comp_id FROM registrations WHERE user_id = $1
       )
       AND c.reg_close_date > NOW()
       ORDER BY c.created_at DESC`,
      [userId]
    );

    if (compsResult.rows.length === 0) {
      return [];
    }

    // Score each competition
    const scored = compsResult.rows.map((comp) => {
      let score = 0;

      // Category match (+3)
      if (userInterests.includes(comp.category)) {
        score += 3;
      }

      // Grade match (+2)
      if (userGrade && comp.grade_level?.includes(userGrade)) {
        score += 2;
      }

      // Past category match (+1)
      if (pastCategories.includes(comp.category)) {
        score += 1;
      }

      // Deadline approaching (within 7 days) (+1)
      if (comp.reg_close_date) {
        const daysUntilClose = Math.ceil(
          (new Date(comp.reg_close_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        );
        if (daysUntilClose <= 7) {
          score += 1;
        }
      }

      // Popularity boost (low registration count) (+1)
      if (comp.quota && comp.reg_count < comp.quota * 0.5) {
        score += 1;
      }

      return { ...comp, score };
    });

    // Sort by score descending, then by deadline ascending
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.reg_close_date && b.reg_close_date) {
        return (
          new Date(a.reg_close_date).getTime() -
          new Date(b.reg_close_date).getTime()
        );
      }
      return 0;
    });

    // Return top N recommendations
    return scored.slice(0, limit);
  } catch (error: any) {
    console.error("Get recommendations error:", error.message);
    return [];
  }
}

/**
 * T9 - Get similar competitions based on a reference competition
 * Used for post-registration nudges
 */
export async function getSimilarCompetitions(
  compId: string,
  userId: string,
  limit: number = 3
): Promise<any[]> {
  try {
    // Get source competition details
    const compResult = await pool.query(
      `SELECT category, grade_level FROM competitions WHERE id = $1`,
      [compId]
    );

    if (compResult.rows.length === 0) {
      return [];
    }

    const sourceComp = compResult.rows[0];

    // Find similar competitions (same category or overlapping grade)
    const similarResult = await pool.query(
      `SELECT c.*
       FROM competitions c
       WHERE c.id != $1
       AND c.id NOT IN (
         SELECT comp_id FROM registrations WHERE user_id = $2
       )
       AND c.reg_close_date > NOW()
       AND (
         c.category = $3
         OR c.grade_level LIKE '%' || $4 || '%'
       )
       ORDER BY
         CASE WHEN c.category = $3 THEN 1 ELSE 2 END,
         c.reg_close_date ASC
       LIMIT $5`,
      [compId, userId, sourceComp.category, sourceComp.grade_level || "", limit]
    );

    return similarResult.rows;
  } catch (error: any) {
    console.error("Get similar competitions error:", error.message);
    return [];
  }
}

/**
 * T13 - Get users interested in a specific competition
 * Used for new competition alerts
 */
export async function getUsersInterestedIn(compId: string): Promise<string[]> {
  try {
    // Get competition details
    const compResult = await pool.query(
      `SELECT category, grade_level FROM competitions WHERE id = $1`,
      [compId]
    );

    if (compResult.rows.length === 0) {
      return [];
    }

    const comp = compResult.rows[0];
    const category = comp.category;
    const gradeLevels = comp.grade_level?.split(",").map((g: string) => g.trim()) || [];

    // Find users with matching interests and grade
    // Include users with push tokens only (can receive notifications)
    const usersResult = await pool.query(
      `SELECT DISTINCT u.id
       FROM users u
       LEFT JOIN students s ON s.id = u.id
       WHERE u.push_token IS NOT NULL
       AND u.role = 'student'
       AND (
         s.interests LIKE '%' || $1 || '%'
         OR s.interests IS NULL
       )
       ${gradeLevels.length > 0 ? "AND (" + gradeLevels.map((_: string, i: number) => `s.grade = $${i + 2}`).join(" OR ") + ")" : ""}`,
      [category, ...gradeLevels]
    );

    return usersResult.rows.map((r) => r.id);
  } catch (error: any) {
    console.error("Get interested users error:", error.message);
    return [];
  }
}
