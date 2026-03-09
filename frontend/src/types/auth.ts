export interface User {
  id: number;
  email: string;
  username: string;
  selected_book_id: number | null;
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
