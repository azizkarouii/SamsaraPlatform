import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type ManagedRole = 'PROPRIETAIRE' | 'SAMSAR';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: ManagedRole;
  active: boolean;
  /** Owners only: works with samsars. */
  samsarsEnabled?: boolean | null;
  photoUrl?: string;
  createdAt: string;
  /** Houses of an owner. */
  houses: number;
  /** Samsar accesses given (owner) or received (samsar). */
  shares: number;
}

export interface AdminUserRequest {
  name: string;
  email: string;
  phone?: string;
  role?: ManagedRole;
  /** Required on creation; empty on an edit keeps the current one. */
  password?: string;
  active?: boolean;
  samsarsEnabled?: boolean;
  language?: string;
}

export interface AdminStats {
  owners: number;
  activeOwners: number;
  samsars: number;
  activeSamsars: number;
  ownersWithSamsars: number;
  houses: number;
  reservations: number;
  newAccountsThisMonth: number;
  monthlyPrice: number;
  monthlyRevenue: number;
  totalRevenue: number;
  months: { month: string; accounts: number; revenue: number }[];
}

/** The superadmin's calls: accounts of the platform and its figures. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  stats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.apiUrl}/stats`);
  }

  users(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.apiUrl}/users`);
  }

  create(request: AdminUserRequest): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.apiUrl}/users`, request);
  }

  update(id: number, request: AdminUserRequest): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.apiUrl}/users/${id}`, request);
  }

  setActive(id: number, active: boolean): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.apiUrl}/users/${id}/active`, { active });
  }

  setSamsars(id: number, enabled: boolean): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.apiUrl}/users/${id}/samsars`, { enabled });
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${id}`);
  }
}
