// backend/app.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cron from "node-cron";

import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import reportRoutes from "./routes/report.route.js";
import userRoutes from "./routes/user.routes.js";
import paymentRoutes from "./routes/payment.route.js";
import webhookRoutes from "./routes/webhook.route.js";
import authRoutes from "./routes/auth.routes.js";
import projectRoutes from "./routes/project.routes.js";
import { failStaleTransactions } from "./jobs/failStaleTransactions.js";

const app = express();

app.use(morgan("dev"));

const FRONTEND = process.env.FRONTEND_URL || process.env.FRONTEND_BASE || "http://localhost:5173";

const allowedOriginsStatic = new Set([
  FRONTEND,
  "http://localhost:5173",
  "http://localhost:5174",
  "https://test.payu.in",
  "https://secure.payu.in",
  "https://info.payu.in",
  "https://api.razorpay.com",
  "https://checkout.razorpay.com",
  "https://www.paypal.com",
  "https://api-m.sandbox.paypal.com",
  "https://api-m.paypal.com",
  "https://www.cashfree.com",
  "https://sandbox.cashfree.com",
]);

const isAllowedDynamic = (origin) => {
  if (!origin) return true; // same-origin / curl
  if (allowedOriginsStatic.has(origin)) return true;
  if (origin.includes(".ngrok")) return true;
  if (origin.includes(".ngrok-free.dev") || origin.includes(".ngrok-free.app")) return true;
  if (origin.includes(".payu.in")) return true;
  if (origin.includes(".razorpay.com")) return true;
  if (origin.includes(".paypal.com")) return true;
  if (origin.includes("cashfree")) return true;
  return false;
};

const corsMiddleware = cors({
  origin(origin, callback) {
    if (isAllowedDynamic(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "ngrok-skip-browser-warning",
  ],
});

app.use(corsMiddleware);

// ✅ Preflight handler without using the "*" path (Express v5 safe)
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Raw body only for webhooks (signature verification)
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/webhooks")) {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      req.rawBody = data;
      next();
    });
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => res.send("API is running."));

// Background job
cron.schedule("*/5 * * * *", failStaleTransactions);

// Routes
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

export default app;
