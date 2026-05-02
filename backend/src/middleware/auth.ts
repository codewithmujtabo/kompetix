import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.service";
import { pool } from "../config/database";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing or invalid authorization header" });
    return;
  }

  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  req.userId = payload.sub;

  // Fetch user role for authorization
  try {
    const result = await pool.query("SELECT role FROM users WHERE id = $1", [payload.sub]);
    if (result.rows.length > 0) {
      req.userRole = result.rows[0].role;
    }
  } catch (err) {
    console.error("Error fetching user role:", err);
  }

  next();
}
