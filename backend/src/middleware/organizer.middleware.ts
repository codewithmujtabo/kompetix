import { Request, Response, NextFunction } from "express";

export const organizerOnly = (req: Request, res: Response, next: NextFunction): void => {
  const userRole = (req as any).userRole;

  if (userRole !== "organizer" && userRole !== "admin") {
    res.status(403).json({ message: "Access denied. Organizer role required." });
    return;
  }

  next();
};
