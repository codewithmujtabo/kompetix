import { apiRequest } from "./api";

export interface School {
  id: string;
  name: string;
  npsn?: string;
  address?: string;
  city?: string;
  grade?: string;
  status?: string;
  provinceCode?: string;
  provinceName?: string;
  regencyCode?: string;
  regencyName?: string;
  districtCode?: string;
  districtName?: string;
}

interface SchoolSearchParams {
  name?: string;
  provinceCode?: string;
  regencyCode?: string;
  districtCode?: string;
  grade?: string;
  status?: string;
  npsn?: string;
  page?: number;
}

interface SchoolSearchResponse {
  data: School[];
  paging: {
    page: number;
    total: number;
  };
}

/**
 * Search for Indonesian schools using backend API (which calls API.co.id)
 *
 * @param params Search parameters
 * @returns Array of schools matching the criteria
 */
export async function searchSchools(
  nameOrParams: string | SchoolSearchParams
): Promise<School[]> {
  try {
    // Handle both string (for backward compatibility) and object params
    const params: SchoolSearchParams = typeof nameOrParams === 'string'
      ? { name: nameOrParams }
      : nameOrParams;

    // If empty query, return empty array (dropdown will show "Start typing..." message)
    if (!params.name && !params.regencyCode && !params.npsn) {
      return [];
    }

    // Build query string
    const queryParams = new URLSearchParams();
    if (params.name) queryParams.append('name', params.name);
    if (params.provinceCode) queryParams.append('provinceCode', params.provinceCode);
    if (params.regencyCode) queryParams.append('regencyCode', params.regencyCode);
    if (params.districtCode) queryParams.append('districtCode', params.districtCode);
    if (params.grade) queryParams.append('grade', params.grade);
    if (params.status) queryParams.append('status', params.status);
    if (params.npsn) queryParams.append('npsn', params.npsn);
    if (params.page) queryParams.append('page', params.page.toString());

    const response = await apiRequest<SchoolSearchResponse>(
      `/schools/search?${queryParams.toString()}`,
      { auth: false }
    );

    // Map to our School interface format (add id field using npsn)
    return response.data.map(school => ({
      id: school.npsn || `school-${Math.random()}`,
      name: school.name,
      npsn: school.npsn,
      address: school.address,
      city: school.regencyName,
      grade: school.grade,
      status: school.status,
      provinceCode: school.provinceCode,
      provinceName: school.provinceName,
      regencyCode: school.regencyCode,
      regencyName: school.regencyName,
      districtCode: school.districtCode,
      districtName: school.districtName,
    }));
  } catch (error) {
    console.error("School search error:", error);
    return [];
  }
}

/**
 * Clear schools cache (for future implementation)
 */
export async function clearSchoolsCache(): Promise<void> {
  // Placeholder for future cache implementation
  console.log("Schools cache cleared");
}
