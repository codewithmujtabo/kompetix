import { Request, Response, NextFunction } from "express";

/**
 * Middleware to ensure the user is a school admin
 */
export function schoolAdminOnly(req: Request, res: Response, next: NextFunction): void {
  if (req.userRole !== 'school_admin') {
    res.status(403).json({ message: "Access denied. School admin role required." });
    return;
  }
  next();
}

/**
 * Middleware to ensure the user is either a teacher or school admin
 */
export function teacherOrSchoolAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.userRole || !['teacher', 'school_admin'].includes(req.userRole)) {
    res.status(403).json({ message: "Access denied. Teacher or school admin role required." });
    return;
  }
  next();
}
