import { pool } from "../config/database";
import * as bcrypt from "bcrypt";

async function createTeacher() {
  try {
    // Получаем параметры из командной строки или используем значения по умолчанию
    const email = process.argv[2] || "teacher@example.com";
    const password = process.argv[3] || "school123";
    const fullName = process.argv[4] || "Sri Wahyuni, S.Pd";
    const subject = process.argv[5] || "Matematika";
    const department = process.argv[6] || "MIPA";
    
    // Получаем ID школы
    const schoolResult = await pool.query(
      "SELECT id, name FROM schools LIMIT 1"
    );
    
    if (schoolResult.rows.length === 0) {
      console.error("❌ No school found. Please create a school first.");
      console.error("   Run: npm run db:create-school-admin");
      process.exit(1);
    }
    
    const schoolId = schoolResult.rows[0].id;
    const schoolName = schoolResult.rows[0].name;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Start transaction
    await pool.query('BEGIN');
    
    // Insert into users table
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role, school_id, consent_accepted_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (email) DO UPDATE 
         SET role = 'teacher', school_id = EXCLUDED.school_id, full_name = EXCLUDED.full_name
       RETURNING id, email, full_name, role, school_id`,
      [email, hashedPassword, fullName, "08123456780", "teacher", schoolId]
    );
    
    const userId = userResult.rows[0].id;
    
    // Insert into teachers table
    await pool.query(
      `INSERT INTO teachers (id, school, subject, department, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [userId, schoolName, subject, department]
    );
    
    await pool.query('COMMIT');
    
    console.log("\n✅ Teacher created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("👨‍🏫 Teacher Details:");
    console.log(`   Email:     ${email}`);
    console.log(`   Password:  ${password}`);
    console.log(`   Name:      ${fullName}`);
    console.log(`   Subject:   ${subject}`);
    console.log(`   Department: ${department}`);
    console.log(`   School:    ${schoolName}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("💡 Login at: http://localhost:3000/school-login");
    
    process.exit(0);
  } catch (error: any) {
    await pool.query('ROLLBACK');
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createTeacher();