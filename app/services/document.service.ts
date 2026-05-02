import { apiRequest } from "./api";

export interface Document {
  id: string;
  docType: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: string;
}

export async function list(): Promise<Document[]> {
  return apiRequest<Document[]>("/documents");
}

export async function create(params: {
  docType: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
}): Promise<{ id: string }> {
  return apiRequest<{ id: string; message: string }>("/documents", {
    method: "POST",
    body: params,
  });
}

export async function remove(id: string): Promise<void> {
  await apiRequest(`/documents/${id}`, {
    method: "DELETE",
  });
}
