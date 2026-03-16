import { getAccessToken } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  console.log('[apiRequest] URL: ', API_BASE_URL);
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Token ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = new Error("API Error") as any;
    error.status = response.status;
    throw error;
  }

  return response.json();
}
