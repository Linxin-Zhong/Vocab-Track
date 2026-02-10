export interface User {
  email: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export class AuthError extends Error {
  type:
    | "AUTH"
    | "NETWORK"
    | "RATE_LIMIT"
    | "VALIDATION"
    | "CONFLICT"
    | "UNKNOWN";

  constructor(type: AuthError["type"], message: string) {
    super(message);
    this.type = type;
    this.name = "AuthError";
  }
}
