import { pool } from "../config/database";
import * as bcrypt from "bcrypt";

async function createAdmin() {
  try {
    const email = "admin@eduversal.com";
    const password = "admin123";
    const fullName = "Admin";

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert admin user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, consent_accepted_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, email, full_name, role`,
      [email, hashedPassword, fullName, "admin"]
    );

    console.log("✅ Admin user created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email:    admin@eduversal.com");
    console.log("🔑 Password: admin123");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("User details:", result.rows[0]);

    process.exit(0);
  } catch (error: any) {
    if (error.code === "23505") {
      console.error("❌ Admin user already exists!");
    } else {
      console.error("❌ Error creating admin user:", error);
    }
    process.exit(1);
  }
}

createAdmin();
