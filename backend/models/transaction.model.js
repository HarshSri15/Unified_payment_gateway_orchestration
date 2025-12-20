import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    // 🔐 USER WHO INITIATED PAYMENT
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🔥 PROJECT THIS TRANSACTION BELONGS TO
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    // 💳 GATEWAY INFO
    gateway: {
      type: String,
      required: true,
      index: true,
    },

    // INTERNAL TRANSACTION ID (optional)
    transactionId: {
      type: String,
      index: true,
      default: "",
    },

    // GATEWAY IDS (standard)
    gatewayOrderId: {
      type: String,
      index: true,
      default: "",
    },

    gatewayPaymentId: {
      type: String,
      index: true,
      default: "",
    },

    // CASHFREE SPECIFIC
    cashfreeLinkId: {
      type: String,
      index: true,
      default: "",
    },

    cashfreeOrderId: {
      type: String,
      index: true,
      default: "",
    },

    // 💰 PAYMENT DETAILS
    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    customer: {
      name: { type: String, default: "N/A" },
      email: { type: String, default: "N/A" },
      phone: { type: String, default: "N/A" },
    },

    // 📊 STATUS
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "paid",
        "failed",
        "cancelled",
        "refunded",
      ],
      default: "pending",
      index: true,
    },

    // 🧾 EXTRA DATA
    paymentInfo: {
      type: Object,
      default: {},
    },

    callbackData: {
      type: Object,
      default: {},
    },

    webhookData: {
      type: Object,
      default: {},
    },

    isWebhookReceived: {
      type: Boolean,
      default: false,
    },

    failureReason: {
      type: String,
      default: "",
    },

    // ⏱️ TIMESTAMPS
    initiatedAt: Date,
    verifiedAt: Date,
    refundedAt: Date,
  },
  { timestamps: true }
);

//
// 🔍 DEBUG — CONFIRM DB WRITE (VERY IMPORTANT)
// This will log ONLY if MongoDB actually saves the transaction
//
transactionSchema.post("save", function (doc) {
  console.log("🟢 TRANSACTION SAVED IN DB:", {
    id: doc._id.toString(),
    projectId: doc.project?.toString(),
    userId: doc.userId?.toString(),
    gateway: doc.gateway,
    amount: doc.amount,
    status: doc.status,
  });
});

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
