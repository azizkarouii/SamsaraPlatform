import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <div class="card-accent"></div>
        <mat-card-header>
          <mat-card-title>Samsara</mat-card-title>
          <mat-card-subtitle>Property Rental Management</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p class="form-intro">Access your properties, reservations, and notifications from one place.</p>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" placeholder="Enter your email" />
              <mat-icon matSuffix>email</mat-icon>
              <mat-error *ngIf="loginForm.get('email')?.hasError('required')">Email is required</mat-error>
              <mat-error *ngIf="loginForm.get('email')?.hasError('email')">Invalid email format</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password" placeholder="Enter your password" />
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="loginForm.get('password')?.hasError('required')">Password is required</mat-error>
              <mat-error *ngIf="loginForm.get('password')?.hasError('minlength')">Password must be at least 6 characters</mat-error>
            </mat-form-field>

            <button mat-raised-button color="primary" class="full-width" type="submit" [disabled]="loginForm.invalid || loading">
              <mat-spinner *ngIf="loading" diameter="20" class="spinner"></mat-spinner>
              <span *ngIf="!loading">Sign In</span>
            </button>
          </form>
        </mat-card-content>
        <mat-card-actions align="end" class="card-actions">
          <span class="register-text">Don't have an account?</span>
          <button mat-button color="primary" routerLink="/register">Register</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background:
        radial-gradient(circle at top, rgba(255, 255, 255, 0.18), transparent 34%),
        linear-gradient(135deg, #5d6de8 0%, #6f5bd5 48%, #8441c0 100%);
    }
    .login-card {
      position: relative;
      overflow: hidden;
      max-width: 440px;
      width: 100%;
      padding: 2rem 2rem 1.25rem;
      margin: 0;
      border: 1px solid rgba(255, 255, 255, 0.4);
      box-shadow: 0 24px 60px rgba(21, 23, 42, 0.24);
      backdrop-filter: blur(16px);
      background: rgba(255, 255, 255, 0.96);
    }
    .card-accent {
      position: absolute;
      inset: 0 auto auto 0;
      width: 100%;
      height: 5px;
      background: linear-gradient(90deg, #3f51b5, #7c4dff, #ff7a59);
    }
    mat-card-header {
      justify-content: center;
      text-align: center;
      margin-bottom: 1.5rem;
      padding-top: 0.5rem;
    }
    mat-card-title {
      font-size: 2.2rem;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: #3147b0;
    }
    mat-card-subtitle {
      color: rgba(31, 41, 55, 0.72);
      font-size: 0.98rem;
    }
    .form-intro {
      margin: 0 0 1.25rem;
      color: rgba(31, 41, 55, 0.78);
      font-size: 0.95rem;
      line-height: 1.5;
    }
    .full-width {
      width: 100%;
      margin-bottom: 1.1rem;
    }
    :host ::ng-deep .mat-mdc-form-field .mat-mdc-text-field-wrapper {
      background: rgba(248, 250, 252, 0.92);
    }
    :host ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-focus-overlay {
      background-color: transparent;
    }
    :host ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-infix {
      min-height: 52px;
      padding-top: 0.9rem;
      padding-bottom: 0.9rem;
    }
    :host ::ng-deep .mat-mdc-form-field .mat-mdc-icon-button {
      width: 40px;
      height: 40px;
      padding: 8px;
    }
    .spinner {
      display: inline-block;
      margin-right: 0.5rem;
    }
    button[mat-raised-button] {
      height: 48px;
      border-radius: 14px;
      font-weight: 600;
      box-shadow: 0 12px 24px rgba(63, 81, 181, 0.26);
    }
    .card-actions {
      padding-top: 0.5rem;
    }
    .register-text {
      font-size: 0.875rem;
      color: rgba(31, 41, 55, 0.68);
    }
    @media (max-width: 480px) {
      .login-card {
        padding: 1.5rem 1.25rem 1rem;
      }

      mat-card-title {
        font-size: 1.9rem;
      }
    }
  `]
})
export class LoginComponent {
  hidePassword = true;
  loading = false;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: () => {
        this.snackBar.open('Login successful!', 'Close', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || 'Login failed. Please check your credentials.';
        this.snackBar.open(msg, 'Close', { duration: 5000 });
      },
    });
  }
}
