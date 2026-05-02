const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error(
    "Missing EXPO_PUBLIC_API_URL environment variable. Check your .env.local file."
  );
}

export { API_BASE_URL };
