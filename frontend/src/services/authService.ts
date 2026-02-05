import { apiRequest } from "./apiClient";
import { ENDPOINTS } from "./endpoints";
import type { AuthResponse, User } from "../types/auth";

let accessToken: string | null = null;
export const getAccessToken = () => accessToken;

export type AuthResult =
  | { success: true; user: User }
  | { success: false; errorType: 'NETWORK' | 'AUTH' | 'RATE_LIMIT' | 'VALIDATION' | 'CONFLICT' | 'UNKNOWN' };

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const data = await apiRequest<AuthResponse>(ENDPOINTS.USER.LOGIN, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    accessToken = data.token;
    return { success: true, user: data.user};
  } catch (error: any) {
    if (!error.status) return { success: false, errorType: 'NETWORK' };
    switch (error.status) {
      case 400: return { success: false, errorType: 'VALIDATION' };
      case 401: return { success: false, errorType: 'AUTH' };
      case 429: return { success: false, errorType: 'RATE_LIMIT' };
      default: return { success: false, errorType: 'UNKNOWN' };
    }
  }
}

export async function register(email: string, password: string): Promise<AuthResult> {
  try {
    const data = await apiRequest<AuthResponse>(ENDPOINTS.USER.REGISTER, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    accessToken = data.token;
    return { success: true, user: data.user};

  } catch (error: any) {
    if (!error.status) return { success: false, errorType: 'NETWORK' };
    switch (error.status) {
      case 400: return { success: false, errorType: 'VALIDATION' };
      case 409: return { success: false, errorType: 'CONFLICT' };
      case 429: return { success: false, errorType: 'RATE_LIMIT' };
      default: return { success: false, errorType: 'UNKNOWN' };
    }
  }
}
