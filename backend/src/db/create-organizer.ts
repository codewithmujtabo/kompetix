import { pool } from "../config/database";
import * as bcrypt from "bcrypt";

async function createOrganizer() {
  try {
    const email = "organizer@eduversal.com";
    const password = "organizer123";
    const fullName = "Organizer Name";
    const orgName = "Eduversal Foundation";

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Start transaction
    await pool.query('BEGIN');

    // 1. Insert into users table
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, consent_accepted_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, email, full_name, role`,
      [email, hashedPassword, fullName, "organizer"]
    );

    const userId = userResult.rows[0].id;

    // 2. Insert into organizers table (linked by id)
    const organizerResult = await pool.query(
      `INSERT INTO organizers (id, org_name, bio, website, verified)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, org_name, verified`,
      [userId, orgName, "Official organizer for competitions", "", true]
    );

    // Commit transaction
    await pool.query('COMMIT');

    console.log("✅ Organizer user created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email:      organizer@eduversal.com");
    console.log("🔑 Password:   organizer123");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("User details:", userResult.rows[0]);
    console.log("Organizer details:", organizerResult.rows[0]);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("💡 You can now login at: /organizer/organizer-login");

    process.exit(0);
  } catch (error: any) {
    // Rollback on error
    await pool.query('ROLLBACK');
    
    if (error.code === "23505") {
      console.error("❌ Organizer user already exists!");
      console.error("   Email: organizer@eduversal.com already taken");
    } else {
      console.error("❌ Error creating organizer user:", error);
    }
    process.exit(1);
  }
}

createOrganizer();