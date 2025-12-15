// backend/controllers/webhook.controller.js
import cashfreeVerify from "../webhooks/cashfree.verify.js";
import payuVerify from "../webhooks/payu.verify.js";
import Transaction from "../models/transaction.model.js";

const webhookController = {
  payu: async (req, res) => {
    try {
      // Verify & normalize
      const { orderId, status, amount, gatewayPaymentId } = await payuVerify(req.body);

      await Transaction.updateOne(
        { gatewayOrderId: orderId },
        {
          status,
          gatewayPaymentId,
          updatedAt: new Date(),
          webhookPayload: req.body,
        }
      );

      return res.status(200).send("OK");
    } catch (err) {
      // Always 200 so gateway doesn't keep retrying (idempotency handled by app)
      console.error("PAYU WEBHOOK ERROR:", err);
      return res.status(200).send("OK");
    }
  },

  cashfree: async (req, res) => {
    try {
      // Raw body needed for signature verification
      const payload = JSON.parse(req.rawBody || "{}");
      const verified = cashfreeVerify(req.rawBody || "", req.headers);

      if (!verified) {
        console.warn("⚠️ Invalid Cashfree signature!");
      }

      const data = payload?.data || {};

      await Transaction.updateOne(
        { gatewayOrderId: data.order_id },
        {
          status: data.status,
          gatewayPaymentId: data.payment_id,
          updatedAt: new Date(),
          webhookPayload: payload,
        }
      );

      return res.status(200).send("OK");
    } catch (err) {
      console.error("CASHFREE WEBHOOK ERROR:", err);
      return res.status(200).send("OK");
    }
  },
};

export default webhookController;

