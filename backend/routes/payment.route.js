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

// Public
router.post("/initiate", initiatePayment);
router.post("/callback/:gateway", verifyPayment);
router.get("/transaction/:id", getTransaction);

// Auth
router.get("/", protect, getAllPayments);
router.delete("/transaction/:id", protect, deleteTransaction);
router.post("/refund", protect, refundPayment);

// Dev helpers (blocked in production by controller)
router.get("/health/razorpay", razorpayHealth);
router.post("/debug/razorpay-signature", razorpayDebugSignature);

export default router;
