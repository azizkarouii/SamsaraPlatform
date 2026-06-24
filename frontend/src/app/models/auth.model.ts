export interface LoginDto {
  email: string;
  password: string;
}

export type UserRole = 'PROPRIETAIRE' | 'SAMSAR';

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
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
  role: UserRole;
  createdAt: string;
}
