// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/user.model.js";
import ApiError from "../utils/apiError.js";

/**
 * Protect — requires a valid Bearer token.
 * Attaches req.user (sans password).
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    token = auth.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(401, "Not authorized, no token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) throw new ApiError(401, "User not found");

    req.user = user;
    next();
  } catch (err) {
    throw new ApiError(401, "Not authorized, invalid token");
  }
});

/**
 * admin — require admin role
 * (also exported as isAdmin for backward-compat)
 */
export const admin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    throw new ApiError(403, "Admin access only");
  }
  next();
};

// Backward compatibility alias
export const isAdmin = admin;

/**
 * roleCheck — allow any of the given roles
 */
export const roleCheck = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, "You are not allowed to access this resource");
    }
    next();
  };
};

export default { protect, admin, isAdmin, roleCheck };
