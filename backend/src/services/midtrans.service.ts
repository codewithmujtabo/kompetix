import midtransClient from "midtrans-client";
import { env } from "../config/env";

// Snap is the Midtrans hosted payment page (handles all payment methods)
const snap = new midtransClient.Snap({
  isProduction: env.MIDTRANS_IS_PRODUCTION,
  serverKey: env.MIDTRANS_SERVER_KEY,
  clientKey: env.MIDTRANS_CLIENT_KEY,
});

// Core API is used for server-side operations like refunds
const coreApi = new midtransClient.CoreApi({
  isProduction: env.MIDTRANS_IS_PRODUCTION,
  serverKey: env.MIDTRANS_SERVER_KEY,
  clientKey: env.MIDTRANS_CLIENT_KEY,
});

const DEEP_LINK_BASE = "competzy://payment";

export interface SnapTokenResult {
  snapToken: string;
  redirectUrl: string;
}

/**
 * Create a Midtrans Snap transaction token for a registration.
 * Callbacks redirect back to the app via the competzy:// scheme.
 */
export async function createSnapToken(params: {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  competitionName: string;
}): Promise<SnapTokenResult> {
  if (!env.MIDTRANS_SERVER_KEY) {
    throw new Error("MIDTRANS_SERVER_KEY is not configured");
  }

  const transaction = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.amount,
    },
    item_details: [
      {
        id: params.orderId,
        price: params.amount,
        quantity: 1,
        name: params.competitionName.slice(0, 50),
      },
    ],
    customer_details: {
      first_name: params.customerName,
      email: params.customerEmail,
    },
    callbacks: {
      finish:  `${DEEP_LINK_BASE}/finish`,
      error:   `${DEEP_LINK_BASE}/error`,
      pending: `${DEEP_LINK_BASE}/pending`,
    },
  };

  const response = await snap.createTransaction(transaction);
  return {
    snapToken: response.token,
    redirectUrl: response.redirect_url,
  };
}

/**
 * Fetch the current transaction status from Midtrans for a given order ID.
 * Returns the raw transaction_status string (e.g. "settlement", "pending", "cancel").
 */
export async function getTransactionStatus(orderId: string): Promise<string> {
  const response = await (coreApi as any).transaction.status(orderId);
  return response.transaction_status as string;
}

export interface RefundResult {
  refundKey: string;
  status: string;
  refundAmount: number;
}

/**
 * Issue a refund for a settled Midtrans transaction.
 * Works for GoPay, OVO, Dana, and credit card (online refund).
 * Bank transfer / VA refunds are offline and cannot be automated — this will throw.
 */
export async function refundPayment(
  orderId: string,
  amount: number,
  reason: string
): Promise<RefundResult> {
  if (!env.MIDTRANS_SERVER_KEY) {
    throw new Error("MIDTRANS_SERVER_KEY is not configured");
  }

  const refundKey = `${orderId}-refund-${Date.now()}`;
  // midtrans-client has no TS types for transaction — cast to any
  const response = await (coreApi as any).transaction.refund(orderId, {
    refund_key: refundKey,
    amount,
    reason,
  });

  return {
    refundKey,
    status: response.transaction_status ?? "unknown",
    refundAmount: Number(response.refund_amount ?? amount),
  };
}
