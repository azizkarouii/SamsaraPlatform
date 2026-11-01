import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginDto, RegisterDto, AuthResponse, User } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private readonly currentUserSubject = new BehaviorSubject<User | null>(this.readStoredUser());
  /** Emits whenever the connected user changes (login, profile edit, photo...). */
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  private storeUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  login(dto: LoginDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, dto).pipe(
      tap(res => {
        localStorage.setItem('token', res.access_token);
        this.storeUser(res.user);
      })
    );
  }

  register(dto: RegisterDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, dto).pipe(
      tap(res => {
        localStorage.setItem('token', res.access_token);
        this.storeUser(res.user);
      })
    );
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/profile`);
  }

  updateProfile(dto: { name: string; phone?: string }): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/profile`, dto).pipe(
      tap(user => this.storeUser(user))
    );
  }

  updatePhoto(file: File): Observable<User> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.put<User>(`${this.apiUrl}/profile/photo`, body).pipe(tap(user => this.storeUser(user)));
  }

  removePhoto(): Observable<User> {
    return this.http.delete<User>(`${this.apiUrl}/profile/photo`).pipe(tap(user => this.storeUser(user)));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/password`, { currentPassword, newPassword });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getCurrentUser(): User | null {
    return this.readStoredUser();
  }

  private readStoredUser(): User | null {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
