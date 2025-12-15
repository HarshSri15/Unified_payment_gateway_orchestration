
// backend/middleware/errorMiddleware.js

export const notFound = (req, res, next) => {
  const err = new Error(`Route not found - ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};

export const errorHandler = (err, req, res, next) => {
  // Prefer explicit statusCode set on the error (e.g., ApiError)
  const statusCode =
    typeof err.statusCode === "number"
      ? err.statusCode
      : res.statusCode && res.statusCode !== 200
      ? res.statusCode
      : 500;

  // Avoid sending a 200 for an error
  if (res.headersSent) {
    // If headers already sent, delegate to Express’ default handler
    return next(err);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    statusCode,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    // Only expose stack in non-production
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    // Small hint: some libraries put extra data on 'errors' or 'details'
    details: err.details || undefined,
    name: err.name || undefined,
  });
};
