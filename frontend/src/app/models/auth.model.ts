export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  createdAt: string;
}
