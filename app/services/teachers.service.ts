import { apiRequest } from "./api";

export interface Student {
  id: string;
  fullName: string;
  email: string;
  photoUrl?: string;
  nisn?: string;
  grade?: string;
  school?: string;
  registrationCount: number;
}

export interface StudentStats {
  totalStudents: number;
  totalRegistrations: number;
  activeStudents: number;
}

export interface Deadline {
  id: string;
  competition: string;
  deadline: string;
  daysLeft: number;
  registeredCount: number;
  status: "urgent" | "upcoming";
}

export interface DashboardSummary {
  totalStudents: number;
  totalRegistrations: number;
  confirmedRegistrations: number;
  activeStudents: number;
}

export interface CompetitionStudent {
  id: string;
  fullName: string;
  grade: string;
  status: string;
  registrationNumber: string | null;
}

export interface MyCompetition {
  id: string;
  name: string;
  category: string | null;
  fee: number;
  regCloseDate: string | null;
  competitionDate: string | null;
  students: CompetitionStudent[];
}

// My linked students (scoped to this teacher)
export async function getMyStudents(search?: string, grade?: string): Promise<{ students: Student[]; stats: StudentStats }> {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (grade) params.append("grade", grade);
  const qs = params.toString();
  return await apiRequest(`/teachers/students${qs ? `?${qs}` : ""}`);
}

// Competitions my students are registered for
export async function getMyCompetitions(): Promise<{ competitions: MyCompetition[] }> {
  return await apiRequest("/teachers/my-competitions");
}

// Dashboard summary stats
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return await apiRequest("/teachers/dashboard-summary");
}

// Upcoming competition deadlines
export async function getUpcomingDeadlines(): Promise<Deadline[]> {
  return await apiRequest("/teachers/upcoming-deadlines");
}

// Add a student to this teacher's roster by email
export async function linkStudent(email: string): Promise<{ message: string; studentId: string; fullName: string }> {
  return await apiRequest("/teachers/link-student", {
    method: "POST",
    body: { email },
  });
}

// Remove a student from this teacher's roster
export async function unlinkStudent(studentId: string): Promise<{ message: string }> {
  return await apiRequest(`/teachers/link-student/${studentId}`, {
    method: "DELETE",
  });
}
