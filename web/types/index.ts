export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  city?: string;
  role: string;
  created_at: string;
}

export interface School {
  id: string;
  npsn: string;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  created_at: string;
}

export interface Competition {
  id: string;
  name: string;
  organizer_name: string;
  category?: string;
  grade_level?: string;
  fee: number;
  quota?: number;
  reg_open_date?: string;
  reg_close_date?: string;
  competition_date?: string;
  description?: string;
  created_at: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PendingRegistration {
  registrationId: string;
  status: string;
  registeredAt: string;
  student: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    school?: string;
    grade?: string;
    nisn?: string;
  };
  competition: {
    id: string;
    name: string;
    fee: number;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}
