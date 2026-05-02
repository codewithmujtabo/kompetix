import { apiRequest } from "./api";

export async function getProfile(): Promise<any> {
  return apiRequest("/users/me");
}

export async function updateProfile(
  data: Record<string, any>
): Promise<void> {
  await apiRequest("/users/me", {
    method: "PUT",
    body: data,
  });
}
