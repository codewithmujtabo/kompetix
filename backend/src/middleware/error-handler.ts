import { Request, Response, NextFunction } from "express";

interface HttpError extends Error {
  statusCode?: number;
  status?: number;     // body-parser sets this
  expose?: boolean;    // body-parser sets this for client-safe errors
  type?: string;       // body-parser sets this (e.g. 'entity.parse.failed')
}

export function errorHandler(err: HttpError, req: Request, res: Response, _next: NextFunction): void {
  const status = err.statusCode ?? err.status ?? 500;

  // Log 5xx as errors, 4xx as warnings — keeps the noise floor sane.
  const logFn = status >= 500 ? console.error : console.warn;
  logFn(
    `[${status}] ${req.method} ${req.originalUrl}`,
    err.type ? `(${err.type})` : "",
    err.message,
    status >= 500 ? err.stack : ""
  );

  // Don't leak internal error messages on 5xx to clients.
  const message =
    status >= 500
      ? "Internal server error"
      : err.expose === false
      ? "Request failed"
      : err.message || "Request failed";

  res.status(status).json({
    message,
    ...(err.type ? { type: err.type } : {}),
  });
}
