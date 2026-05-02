import * as Sentry from "@sentry/node";
import express from "express";
import cors from "cors";
import path from "path";
import { env } from "./config/env";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  environment: process.env.NODE_ENV || "development",
  enabled: !!process.env.SENTRY_DSN,
});
import { errorHandler } from "./middleware/error-handler";
import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/users.routes";
import registrationsRoutes from "./routes/registrations.routes";
import documentsRoutes from "./routes/documents.routes";
import competitionsRoutes from "./routes/competitions.routes";
import paymentsRoutes from "./routes/payments.routes";
import notificationsRoutes from "./routes/notifications.routes";
import parentsRoutes from "./routes/parents.routes";
import bulkRegistrationRoutes from "./routes/bulk-registration.routes";
import schoolsRoutes from "./routes/schools.routes";
import teachersRoutes from "./routes/teachers.routes";
import adminRoutes from "./routes/admin.routes";
import regionsRoutes from "./routes/regions.routes";
import favoritesRoutes from "./routes/favorites.routes";
import { initializeCronJobs } from "./services/cron.service";

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded files — /uploads/<userId>/<filename>
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/registrations", registrationsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/competitions", competitionsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/parents", parentsRoutes);
app.use("/api/bulk-registration", bulkRegistrationRoutes);
app.use("/api/schools", schoolsRoutes);
app.use("/api/teachers", teachersRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/regions", regionsRoutes);
app.use("/api/favorites", favoritesRoutes);

// Sentry error handler must come before our own error handler
Sentry.setupExpressErrorHandler(app);

// Error handler
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Beyond Classroom API running on port ${env.PORT}`);

  // Initialize Sprint 4 cron jobs
  initializeCronJobs();
});

export default app;
