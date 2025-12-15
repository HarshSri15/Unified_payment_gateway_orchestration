// backend/routes/webhook.route.js
import express from "express";
import webhookController from "../controllers/webhook.controller.js";

const router = express.Router();

// Provider webhooks (raw body set in app.js)
router.post("/payu", webhookController.payu);
router.post("/cashfree", webhookController.cashfree);

export default router;
