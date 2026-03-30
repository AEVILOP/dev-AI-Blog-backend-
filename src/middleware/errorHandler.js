const errorHandler = (err, req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  //  Logging
  console.error(`[ERROR] ${req.method} ${req.path}`);
  console.error(err);

  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  //Mongoose Validation
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages[0] || "Validation error.",
      code: "VALIDATION_ERROR",
    });
  }

  //  Duplicate Key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}.`,
      code: "DUPLICATE_KEY",
    });
  }

  //  Invalid ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format.",
      code: "INVALID_ID",
    });
  }

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
      code: "INVALID_TOKEN",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired.",
      code: "TOKEN_EXPIRED",
    });
  }

  // Default
  const statusCode = err.status || err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "Something went wrong on our end. Please try again."
        : err.message || "Request failed.",
    code: isProd && statusCode === 500 ? "INTERNAL_SERVER_ERROR" : err.code || "SERVER_ERROR",
  });
};

module.exports = errorHandler;
