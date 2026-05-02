import midtransClient from "midtrans-client";
import { env } from "../config/env";

// Snap is the Midtrans hosted payment page (handles all payment methods)
const snap = new midtransClient.Snap({
  isProduction: env.MIDTRANS_IS_PRODUCTION,
  serverKey: env.MIDTRANS_SERVER_KEY,
  clientKey: env.MIDTRANS_CLIENT_KEY,
});

const DEEP_LINK_BASE = "beyondclassroom://payment";

export interface SnapTokenResult {
  snapToken: string;
  redirectUrl: string;
}

/**
 * Create a Midtrans Snap transaction token for a registration.
 * Callbacks redirect back to the app via the beyondclassroom:// scheme.
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
