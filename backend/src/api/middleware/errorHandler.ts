import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("[Express API Error]:", err);

  const isDev = process.env.NODE_ENV === "development";

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: "Validation Error",
        code: "VALIDATION_ERROR",
        details: err.errors,
        stack: isDev ? err.stack : undefined,
      },
    });
    return;
  }

  if (err.message && err.message.includes("not found")) {
    res.status(404).json({
      error: {
        message: err.message,
        code: "RESOURCE_NOT_FOUND",
        stack: isDev ? err.stack : undefined,
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      message: err.message || "An unexpected database server failure occurred",
      code: "INTERNAL_SERVER_ERROR",
      stack: isDev ? err.stack : undefined,
    },
  });
}
