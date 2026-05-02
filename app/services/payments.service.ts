import { apiRequest } from "./api";
import { API_BASE_URL } from "@/config/api";
import { getToken } from "./token.service";

export interface SnapTokenResponse {
  snapToken:   string;
  redirectUrl: string;
  paymentId:   string;
  orderId:     string;
}

/**
 * Request a Midtrans Snap token for a pending registration.
 * Returns the redirect URL to open in the WebBrowser.
 */
export async function createSnapToken(
  registrationId: string
): Promise<SnapTokenResponse> {
  return apiRequest<SnapTokenResponse>("/payments/snap", {
    method: "POST",
    body: { registrationId },
  });
}

export interface ManualPaymentIntent {
  paymentId: string;
  amount: number;
  paymentStatus: string;
  proofUrl: string | null;
}

export async function createManualIntent(
  registrationId: string
): Promise<ManualPaymentIntent> {
  return apiRequest<ManualPaymentIntent>("/payments/manual-intent", {
    method: "POST",
    body: { registrationId },
  });
}

export async function uploadPaymentProof(
  paymentId: string,
  file: { uri: string; name: string; mimeType?: string | null }
): Promise<{ message: string; proofUrl: string; status: string }> {
  const token = await getToken();
  const formData = new FormData();
  formData.append("proof", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || "application/octet-stream",
  } as any);

  const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/upload-proof`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to upload payment proof");
  }

  return data;
}
