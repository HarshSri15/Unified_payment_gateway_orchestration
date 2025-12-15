// backend/controllers/payment.controller.js

import asyncHandler from "express-async-handler";
import ApiError from "../utils/apiError.js";
import crypto from "crypto";

import { paymentInitiateState } from "../states/paymentInitiateState.js";
import { paymentVerifyState } from "../states/paymentVerifyState.js";
import { paymentRefundState } from "../states/paymentRefundState.js";

import { logGatewayResponse } from "../utils/logGatewayResponse.js";
import Transaction from "../models/transaction.model.js";
import { generateBrandedInvoice } from "../utils/generateBrandedInvoice.js";

const getFrontendBase = () =>
  process.env.FRONTEND_BASE ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

// ------------------------------------------------------
// INITIATE PAYMENT
// ------------------------------------------------------
export const initiatePayment = asyncHandler(async (req, res) => {
  try {
    const { gateway, amount, currency, customer, meta } = req.body;

    if (!gateway || !amount || !customer?.email) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: gateway, amount or customer.email",
      });
    }

    const rawPhone = String(customer?.phone || "").trim();
    const normalizedCustomer = {
      name: customer?.name || "N/A",
      email: customer?.email || "N/A",
      phone: /^[0-9]{10,}$/.test(rawPhone) ? rawPhone : "9999999999",
    };

    const result = await paymentInitiateState({
      gateway,
      amount,
      currency,
      customer: normalizedCustomer,
      redirect: {
        successUrl:
          req.body?.redirect?.successUrl || `${getFrontendBase()}/success`,
        failureUrl:
          req.body?.redirect?.failureUrl || `${getFrontendBase()}/failure`,
        notifyUrl: req.body?.redirect?.notifyUrl,
      },
      meta: meta || {},
      userId: req.user?._id || req.body.userId,
      config: req.body.config || {},
    });

    return res.status(200).json(result);
  } catch (err) {
    const payload = {
      success: false,
      message: err.message || "Internal server error",
    };
    if (process.env.NODE_ENV !== "production") {
      payload.raw = err?.response?.data || err;
    }
    return res.status(err.statusCode || 500).json(payload);
  }
});

// ------------------------------------------------------
// VERIFY PAYMENT
//  - Razorpay: do explicit HMAC + DB update here (stable).
//  - Others: fallback to paymentVerifyState.
// ------------------------------------------------------
export const verifyPayment = asyncHandler(async (req, res) => {
  const gateway = String(req.params.gateway || "").toLowerCase();

  // Razorpay direct path (avoids hidden state logic edge-cases)
  if (gateway === "razorpay") {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      transactionId, // our Mongo _id passed from frontend
    } = { ...(req.body || {}), ...(req.query || {}) };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Missing Razorpay fields" });
    }
    if (!transactionId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing transactionId" });
    }

    const secret =
      process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_TEST_API_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: "Razorpay secret not configured",
      });
    }

    // Compute expected signature: sha256(order_id + "|" + payment_id)
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const provided = String(razorpay_signature).trim().toLowerCase();
    const expected = String(expectedSignature).trim().toLowerCase();
    const signatureOK = provided === expected;

    if (!signatureOK) {
      if (process.env.NODE_ENV !== "production") {
        console.error("RAZORPAY SIGNATURE MISMATCH", {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          providedSigPrefix: provided.slice(0, 10),
          expectedSigPrefix: expected.slice(0, 10),
        });
      }
      return res
        .status(400)
        .json({ success: false, message: "Invalid Razorpay signature" });
    }

    // Signature OK → update our transaction safely
    const txn = await Transaction.findById(transactionId);
    if (!txn) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    // idempotent update: if already paid, keep as paid
    txn.status = "paid";
    txn.gatewayPaymentId = razorpay_payment_id;
    txn.gatewayOrderId = razorpay_order_id;
    txn.verifiedAt = new Date();

    await txn.save();

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: {
        transactionId: txn._id.toString(),
        status: txn.status,
        gatewayPaymentId: txn.gatewayPaymentId,
      },
    });
  }

  // All other gateways use the existing state machine
  try {
    const raw = {
      ...(req.body || {}),
      ...(req.query || {}),
    };

    const result = await paymentVerifyState(gateway, raw, {});

    if (gateway === "cashfree") {
      if (req.body?.data) {
        return res.status(200).json({
          success: true,
          message: "Webhook processed",
          data: result.data,
        });
      }
    }

    const frontendBase = getFrontendBase();
    const successUrl = `${frontendBase}/payments/success?txnid=${encodeURIComponent(
      result.data.transactionId
    )}&status=${encodeURIComponent(result.data.status)}`;
    const failureUrl = `${frontendBase}/payments/failure?txnid=${encodeURIComponent(
      result.data.transactionId
    )}&status=${encodeURIComponent(result.data.status)}`;

    if (["paid", "completed"].includes(String(result.data.status))) {
      return res.redirect(successUrl);
    } else {
      return res.redirect(failureUrl);
    }
  } catch (err) {
    if (gateway === "cashfree" && req.body?.data) {
      return res.status(400).json({
        success: false,
        message: err?.message || "Payment verification failed",
        error:
          process.env.NODE_ENV !== "production"
            ? err?.stack || err
            : undefined,
      });
    }
    const frontendBase = getFrontendBase();
    return res.redirect(`${frontendBase}/payments/failure`);
  }
});

// ------------------------------------------------------
// REFUND PAYMENT
// ------------------------------------------------------
export const refundPayment = asyncHandler(async (req, res) => {
  const { transactionId, amount, reason, config } = req.body;
  if (!transactionId) throw new ApiError(400, "transactionId is required");

  const result = await paymentRefundState(transactionId, amount, reason, config);

  await logGatewayResponse({
    gateway: result.gateway || "unknown",
    type: "refund",
    requestPayload: { transactionId, amount, reason },
    responsePayload: result,
    statusCode: 200,
    message: `Refund processed for ${result.gateway || "unknown"}`,
  });

  return res.status(200).json({
    success: true,
    message: "Refund processed",
    data: result,
  });
});

// ------------------------------------------------------
// GET TRANSACTION (FOR SUCCESS PAGE / DASHBOARD)
// ------------------------------------------------------
export const getTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const isMongoId = id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id);

  const transaction = isMongoId
    ? await Transaction.findById(id)
    : await Transaction.findOne({ gatewayOrderId: id });

  if (!transaction) throw new ApiError(404, "Transaction not found");

  if (req.query.format === "pdf") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${transaction.transactionId}.pdf`
    );
    const pdf = generateBrandedInvoice(transaction);
    return pdf.pipe(res);
  }

  res.status(200).json({ success: true, transaction });
});

// ------------------------------------------------------
// GET ALL PAYMENTS
// ------------------------------------------------------
export const getAllPayments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user?.role !== "admin") filter.userId = req.user._id;

  const payments = await Transaction.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: payments,
  });
});

// ------------------------------------------------------
// DELETE TRANSACTION
// ------------------------------------------------------
export const deleteTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const txn = await Transaction.findById(id);
  if (!txn) throw new ApiError(404, "Transaction not found");

  await Transaction.findByIdAndDelete(id);

  return res.status(200).json({
    success: true,
    message: "Transaction deleted successfully",
  });
});

// ------------------------------------------------------
// DEV HELPERS (unchanged, useful for debugging)
// ------------------------------------------------------
export const razorpayHealth = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(403, "Not available in production");
  }
  const keyId =
    process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_TEST_API_KEY || "";
  const using = {
    KEY_ID: !!process.env.RAZORPAY_KEY_ID,
    KEY_SECRET: !!process.env.RAZORPAY_KEY_SECRET,
    TEST_KEY: !!process.env.RAZORPAY_TEST_API_KEY,
    TEST_SECRET: !!process.env.RAZORPAY_TEST_API_SECRET,
  };
  return res.status(200).json({
    success: true,
    env: process.env.NODE_ENV || "development",
    using,
    keyIdPrefix: keyId ? keyId.slice(0, 8) : null,
  });
});

export const razorpayDebugSignature = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(403, "Not available in production");
  }
  const { order_id, payment_id } = req.body || {};
  if (!order_id || !payment_id) {
    throw new ApiError(400, "order_id and payment_id are required");
  }

  const secret =
    process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_TEST_API_SECRET;

  if (!secret) {
    throw new ApiError(500, "No Razorpay secret configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${order_id}|${payment_id}`)
    .digest("hex");

  return res.status(200).json({
    success: true,
    expectedSignaturePrefix: expectedSignature.slice(0, 10),
    hint: "Compare this prefix with the first 10 chars of razorpay_signature you received.",
  });
});
