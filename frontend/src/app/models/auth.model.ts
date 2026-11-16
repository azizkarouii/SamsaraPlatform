export interface LoginDto {
  email: string;
  password: string;
}

export type UserRole = 'SUPERADMIN' | 'PROPRIETAIRE' | 'SAMSAR';

export interface AuthResponse {
  user?: User;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  role: UserRole;
  createdAt: string;
  active?: boolean;
  /** For an owner: works with samsars (set by the superadmin). */
  samsarsEnabled?: boolean;
}

/** Whether this user sees anything about samsars: a samsar always, an owner when the option is on. */
export function worksWithSamsars(user: User | null | undefined): boolean {
  return !!user && (user.role === 'SAMSAR' || (user.role === 'PROPRIETAIRE' && user.samsarsEnabled !== false));
}

/** First page after signing in. */
export function homeOf(user: User | null | undefined): string {
  return user?.role === 'SUPERADMIN' ? '/admin' : '/dashboard';
}
