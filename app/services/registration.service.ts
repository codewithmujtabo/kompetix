import { apiRequest } from "./api";

export interface Registration {
  id: string;
  compId: string;
  status: string;
  meta?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

export async function list(): Promise<Registration[]> {
  return apiRequest<Registration[]>("/registrations");
}

export async function create(params: {
  id: string;
  compId: string;
  status?: string;
  meta?: Record<string, any>;
}): Promise<void> {
  await apiRequest("/registrations", {
    method: "POST",
    body: params,
  });
}

export async function updateStatus(
  id: string,
  status: string
): Promise<void> {
  await apiRequest(`/registrations/${id}`, {
    method: "PUT",
    body: { status },
  });
}

export async function remove(id: string): Promise<void> {
  await apiRequest(`/registrations/${id}`, {
    method: "DELETE",
  });
}
