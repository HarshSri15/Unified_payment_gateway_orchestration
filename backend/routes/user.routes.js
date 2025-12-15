// backend/routes/user.routes.js
import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  getAllUsers,
  getSingleUser,
  updateUserRole,
  toggleUserStatus,
  generateUserApiKey,
  adminRegenerateApiKey,
} from "../controllers/user.controller.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public auth
router.post("/register", registerUser);
router.post("/login", loginUser);

// Me
router.get("/profile", protect, getUserProfile);
router.patch("/profile", protect, updateUserProfile);
router.post("/change-password", protect, changePassword);
router.post("/generate-api-key", protect, generateUserApiKey);

// Admin
router.get("/", protect, admin, getAllUsers);
router.get("/:id", protect, admin, getSingleUser);
router.patch("/:id/role", protect, admin, updateUserRole);
router.patch("/:id/toggle", protect, admin, toggleUserStatus);
router.post("/:id/regenerate-api-key", protect, admin, adminRegenerateApiKey);

export default router;
