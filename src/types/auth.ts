export interface AuthUser {
  email: string;
  role: string;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
}
