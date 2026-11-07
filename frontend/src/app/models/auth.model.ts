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
  /** Language of the confirmation email. */
  language?: string;
}

export interface AuthResponse {
  user?: User;
  /** True after sign-up: the account must be confirmed through the emailed link before signing in. */
  verificationRequired?: boolean;
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
