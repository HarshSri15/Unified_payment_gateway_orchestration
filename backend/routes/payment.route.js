// backend/routes/payment.route.js
import express from "express";
import {
  initiatePayment,
  verifyPayment,
  refundPayment,
  getTransaction,
  getAllPayments,
  deleteTransaction,
  razorpayHealth,
  razorpayDebugSignature,
} from "../controllers/payment.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔐 AUTH REQUIRED
router.post("/initiate", protect, initiatePayment);

// Gateway callbacks
router.post("/callback/:gateway", verifyPayment);

// Public (invoice / success page)
router.get("/transaction/:id", getTransaction);

// Authenticated
router.get("/", protect, getAllPayments);
router.delete("/transaction/:id", protect, deleteTransaction);
router.post("/refund", protect, refundPayment);

// Dev helpers
router.get("/health/razorpay", razorpayHealth);
router.post("/debug/razorpay-signature", razorpayDebugSignature);

export default router;
