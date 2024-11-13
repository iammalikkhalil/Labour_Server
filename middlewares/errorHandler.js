// middlewares/errorHandler.js

// Custom error handler middleware
export const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // Log the error stack for debugging

  // Set a default status code and message
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Respond with JSON
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }), // Include stack in development mode
  });
};
