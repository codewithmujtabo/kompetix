import { Request, Response, NextFunction } from "express";

/**
 * Middleware to check if user is admin
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  const userRole = (req as any).userRole;

  if (userRole !== "admin") {
    return res.status(403).json({ message: "Access denied. Admin role required." });
  }

  next();
};

/**
 * Middleware to check if user is admin or school_admin
 */
export const adminOrSchoolAdmin = (req: Request, res: Response, next: NextFunction) => {
  const userRole = (req as any).userRole;

  if (userRole !== "admin" && userRole !== "school_admin") {
    return res.status(403).json({ message: "Access denied. Admin or School Admin role required." });
  }

  next();
};
