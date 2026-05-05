import { http } from './client';
import type { AuthUser, Competition, Pagination, PendingRegistration, School, User } from '@/types';

export const authApi = {
  login: (email: string, password: string) =>
    http.post<{ token: string; user: AuthUser }>('/auth/login', { email, password }),
};

export const schoolsApi = {
  list: (p: { page?: number; limit?: number; search?: string; province?: string } = {}) => {
    const q = new URLSearchParams();
    if (p.page)     q.set('page',     String(p.page));
    if (p.limit)    q.set('limit',    String(p.limit));
    if (p.search)   q.set('search',   p.search);
    if (p.province) q.set('province', p.province);
    return http.get<{ schools: School[]; pagination: Pagination }>(`/admin/schools?${q}`);
  },
  provinces: () => http.get<string[]>('/admin/schools/provinces'),
  create: (data: Partial<School>) => http.post<School>('/admin/schools', data),
};

export const competitionsApi = {
  list: (p: { page?: number; limit?: number; category?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    if (p.page)     q.set('page',     String(p.page));
    if (p.limit)    q.set('limit',    String(p.limit));
    if (p.category) q.set('category', p.category);
    if (p.search)   q.set('search',   p.search);
    
    return http.get<Competition[]>(`/admin/competitions?${q}`).then(data => {
      return {
        competitions: data,
        pagination: {
          total: data.length,
          page: p.page || 1,
          limit: p.limit || 15,
          totalPages: Math.ceil(data.length / (p.limit || 15))
        }
      };
    });
  },

};

export const usersApi = {
  list: (p: { page?: number; limit?: number; role?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    if (p.page)   q.set('page',   String(p.page));
    if (p.limit)  q.set('limit',  String(p.limit));
    if (p.role)   q.set('role',   p.role);
    if (p.search) q.set('search', p.search);
    return http.get<{ users: User[]; pagination: Pagination }>(`/admin/users?${q}`);
  },
};

export const registrationsApi = {
  listPending: () =>
    http.get<{ pendingRegistrations: PendingRegistration[] }>('/admin/registrations/pending'),
  approve: (id: string) =>
    http.post<{ message: string; status: string }>(`/admin/registrations/${id}/approve`, {}),
  reject: (id: string, reason: string) =>
    http.post<{ message: string; status: string }>(`/admin/registrations/${id}/reject`, { reason }),
};

export const notificationsApi = {
  broadcast: (data: {
    title: string;
    body: string;
    type: string;
    school_ids: string[];
    competition_id?: string;
    scheduled_for?: string;
  }) => http.post<{ sent: number; schools: number; message: string }>('/admin/notifications/broadcast', data),
};
