import { apiRequest } from "./api";

export interface HistoricalRecord {
  id: string;
  sourceId: string;
  fullName: string;
  grade: string | null;
  gender: string | null;
  result: string | null;
  schoolName: string | null;
  compId: string | null;
  compName: string | null;
  compYear: string | null;
  compCategory: string | null;
  eventPart: string | null;
}

export interface ClaimedRecord extends HistoricalRecord {
  email: string | null;
  phone: string | null;
  paymentStatus: string | null;
  claimedAt: string;
}

export async function getMyRecords(): Promise<ClaimedRecord[]> {
  return apiRequest<ClaimedRecord[]>("/historical/my-records");
}

export async function search(params: {
  name: string;
  school?: string;
  compName?: string;
}): Promise<HistoricalRecord[]> {
  const qs = new URLSearchParams({ name: params.name });
  if (params.school) qs.set("school", params.school);
  if (params.compName) qs.set("compName", params.compName);
  return apiRequest<HistoricalRecord[]>(`/historical/search?${qs.toString()}`);
}

export async function claim(id: string): Promise<{ message: string; id: string }> {
  return apiRequest<{ message: string; id: string }>(`/historical/${id}/claim`, {
    method: "POST",
  });
}

export async function unclaim(id: string): Promise<{ message: string; id: string }> {
  return apiRequest<{ message: string; id: string }>(`/historical/${id}/unclaim`, {
    method: "POST",
  });
}
