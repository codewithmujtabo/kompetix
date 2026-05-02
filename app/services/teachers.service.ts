import { apiRequest } from "./api";

export interface Student {
  id: string;
  fullName: string;
  email: string;
  photoUrl?: string;
  nisn?: string;
  grade?: number;
  school?: string;
  registrationCount: number;
}

export interface StudentStats {
  totalStudents: number;
  totalRegistrations: number;
  activeStudents: number;
}

export interface RegistrationsByMonth {
  month: string;
  count: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  color: string;
}

export interface GradeParticipation {
  grade: string;
  count: number;
}

export interface SuccessRate {
  confirmed: number;
  pending: number;
  rejected: number;
}

export interface Activity {
  id: string;
  action: string;
  competition: string;
  time: string;
  icon: string;
  color: string;
}

export interface Deadline {
  id: string;
  competition: string;
  deadline: string;
  daysLeft: number;
  registeredCount: number;
  status: "urgent" | "upcoming";
}

export interface KeyMetrics {
  totalRegistrations: number;
  percentChange: number;
  activeStudents: number;
  averagePerStudent: string;
}

// Get students list with optional filters
export async function getTeacherStudents(
  search?: string,
  grade?: string
): Promise<{ students: Student[]; stats: StudentStats }> {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (grade) params.append("grade", grade);

  const queryString = params.toString();
  return await apiRequest(
    `/teachers/students${queryString ? `?${queryString}` : ""}`
  );
}

// Get registrations by month for charts
export async function getRegistrationsByMonth(): Promise<RegistrationsByMonth[]> {
  return await apiRequest("/teachers/analytics/registrations-by-month");
}

// Get competition category distribution
export async function getCategoryDistribution(): Promise<CategoryDistribution[]> {
  return await apiRequest("/teachers/analytics/categories");
}

// Get grade participation data
export async function getGradeParticipation(): Promise<GradeParticipation[]> {
  return await apiRequest("/teachers/analytics/grade-participation");
}

// Get success rate metrics
export async function getSuccessRate(): Promise<SuccessRate> {
  return await apiRequest("/teachers/analytics/success-rate");
}

// Get recent activities
export async function getRecentActivities(): Promise<Activity[]> {
  return await apiRequest("/teachers/recent-activities");
}

// Get upcoming deadlines
export async function getUpcomingDeadlines(): Promise<Deadline[]> {
  return await apiRequest("/teachers/upcoming-deadlines");
}

// Get key metrics for analytics cards
export async function getKeyMetrics(): Promise<KeyMetrics> {
  return await apiRequest("/teachers/key-metrics");
}
