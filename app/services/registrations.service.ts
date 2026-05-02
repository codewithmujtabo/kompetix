import { apiRequest } from "./api";
import { Registration } from "@/context/AuthContext";

interface CreateParams {
  id: string;
  compId: string;
  status?: string;
  meta?: Record<string, any>;
}

function mapRow(raw: any): Registration {
  const meta = raw.meta ?? {};
  return {
    id: raw.id,
    compId: raw.compId,
    competitionName: meta.competitionName ?? "Unknown",
    fee: meta.fee ?? 0,
    status: raw.status,
    createdAt: raw.createdAt,
    meta,
  };
}

export async function list(): Promise<Registration[]> {
  const data = await apiRequest<any[]>("/registrations");
  return (data ?? []).map(mapRow);
}

export async function create(params: CreateParams): Promise<{ id: string; status: string }> {
  return apiRequest<{ id: string; status: string }>("/registrations", {
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
  await apiRequest(`/registrations/${id}`, { method: "DELETE" });
}

export interface RegistrationDetail {
  id: string;
  compId: string;
  status: string;
  meta?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  competitionName: string;
  competition: {
    id: string;
    name: string;
    organizerName: string;
    category: string;
    gradeLevel: string;
    fee: number;
    description?: string | null;
    detailedDescription?: string | null;
    websiteUrl?: string | null;
    competitionDate?: string | null;
    regCloseDate?: string | null;
    requiredDocs: string[];
    participantInstructions?: string | null;
    rounds: Array<{
      id: string;
      roundName: string;
      roundType: string;
      startDate?: string | null;
      registrationDeadline?: string | null;
      examDate?: string | null;
      resultsDate?: string | null;
      fee: number;
      location?: string | null;
      roundOrder?: number;
    }>;
  };
  payment: {
    id: string;
    status: string;
    method?: string | null;
    amount: number;
    proofUrl?: string | null;
    proofSubmittedAt?: string | null;
  } | null;
}

export async function getDetail(id: string): Promise<RegistrationDetail> {
  const data = await apiRequest<{ registration: RegistrationDetail }>(`/registrations/${id}`);
  return data.registration;
}
