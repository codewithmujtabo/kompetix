import { apiRequest } from "./api";

export interface Favorite {
  favorite_id: string;
  favorited_at: string;
  // Competition fields
  id: string;
  name: string;
  organizer_name: string;
  category: string;
  grade_level: string;
  fee: number;
  quota: number;
  reg_open_date: string;
  reg_close_date: string;
  competition_date: string;
  registration_status: string;
  poster_url?: string;
  description?: string;
  detailed_description?: string;
  website_url?: string;
  is_international: boolean;
  required_docs?: string[];
  image_url?: string;
  round_count?: number;
  created_at: string;
  updated_at: string;
}

export async function list(): Promise<Favorite[]> {
  const response = await apiRequest<{ favorites: Favorite[] }>("/favorites");
  return response.favorites;
}

export async function add(compId: string): Promise<void> {
  await apiRequest("/favorites", {
    method: "POST",
    body: { compId },
  });
}

export async function remove(compId: string): Promise<void> {
  await apiRequest(`/favorites/${compId}`, {
    method: "DELETE",
  });
}

export async function checkFavorited(compId: string): Promise<boolean> {
  const response = await apiRequest<{ isFavorited: boolean }>(
    `/favorites/check/${compId}`
  );
  return response.isFavorited;
}
