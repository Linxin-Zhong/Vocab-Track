export interface User {
  email: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
