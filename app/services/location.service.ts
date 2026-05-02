import AsyncStorage from "@react-native-async-storage/async-storage";

const CITIES_CACHE_KEY = "indonesian_cities";
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface Province {
  id: string;
  name: string;
}

export interface City {
  id: string;
  name: string;
  province_id?: string;
}

/**
 * Fetch Indonesian cities from API with caching
 * Uses emsifa/api-wilayah-indonesia for data
 */
export async function fetchIndonesianCities(): Promise<City[]> {
  try {
    // Check cache first
    const cached = await AsyncStorage.getItem(CITIES_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }

    // Fetch from API with timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        "https://emsifa.github.io/api-wilayah-indonesia/api/regencies.json",
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to fetch cities");
      }

      const cities: City[] = await response.json();

      // Cache the result
      await AsyncStorage.setItem(
        CITIES_CACHE_KEY,
        JSON.stringify({
          data: cities,
          timestamp: Date.now(),
        })
      );

      return cities;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timed out while loading cities');
      }

      throw error;
    }
  } catch (error) {
    console.error("Failed to load cities:", error);
    // Return cached data even if expired, or empty array
    const cached = await AsyncStorage.getItem(CITIES_CACHE_KEY);
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
    return [];
  }
}

/**
 * Search cities by query string
 */
export function searchCities(cities: City[], query: string): City[] {
  // Return first 20 cities when no query (for dropdown icon click)
  if (!query || !query.trim()) {
    return cities.slice(0, 20);
  }

  const lowerQuery = query.toLowerCase();
  return cities
    .filter((city) => city.name.toLowerCase().includes(lowerQuery))
    .slice(0, 10); // Limit to 10 results when searching
}

/**
 * Clear the cities cache (useful for troubleshooting)
 */
export async function clearCitiesCache(): Promise<void> {
  await AsyncStorage.removeItem(CITIES_CACHE_KEY);
}
