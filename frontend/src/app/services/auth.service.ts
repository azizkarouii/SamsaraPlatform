import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
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

  /** The session itself is an HttpOnly cookie set by the server: page scripts never see the token. */
  login(dto: LoginDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, dto).pipe(
      tap(res => this.storeUser(res.user!))
    );
  }

  /** With email verification, there is no session yet: the response only says a link was sent. */
  register(dto: RegisterDto): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, dto).pipe(
      tap(res => {
        if (res.user) this.storeUser(res.user);
      })
    );
  }

  verifyEmail(token: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/verify-email`, { token });
  }

  resendVerification(email: string, language: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/resend-verification`, { email, language });
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

  forgotPassword(email: string, language: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/forgot-password`, { email, language });
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/reset-password`, { token, newPassword });
  }

  /** The other devices are signed out; this browser receives a new session cookie. */
  changePassword(currentPassword: string, newPassword: string): Observable<AuthResponse> {
    return this.http.put<AuthResponse>(`${this.apiUrl}/password`, { currentPassword, newPassword });
  }

  /** Erases the session cookie on the server side, then forgets the user here. */
  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/logout`, {}).pipe(
      catchError(() => of(undefined)),
      tap(() => this.clearLocalSession()),
    );
  }

  logoutEverywhere(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/logout-all`, {}).pipe(tap(() => this.clearLocalSession()));
  }

  /** Also called when the server answers 401: the session ended elsewhere. */
  clearLocalSession(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
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

  /** The cookie is not readable here: the stored profile says a session was opened (the server has the last word). */
  isLoggedIn(): boolean {
    return !!this.readStoredUser();
  }
}
