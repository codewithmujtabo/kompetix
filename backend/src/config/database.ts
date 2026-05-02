import { Pool } from "pg";
import { env } from "./env";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});
