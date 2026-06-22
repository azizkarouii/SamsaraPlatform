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
  selector: 'app-register',
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
    <div class="register-container">
      <mat-card class="register-card">
        <div class="card-accent"></div>
        <mat-card-header>
          <mat-card-title>Create Account</mat-card-title>
          <mat-card-subtitle>Join Samsara Property Management</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p class="form-intro">Create your profile once and manage your rentals with a cleaner, faster workspace.</p>
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Full Name</mat-label>
              <input matInput formControlName="name" placeholder="Enter your name" />
              <mat-icon matSuffix>person</mat-icon>
              <mat-error *ngIf="registerForm.get('name')?.hasError('required')">Name is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" placeholder="Enter your email" />
              <mat-icon matSuffix>email</mat-icon>
              <mat-error *ngIf="registerForm.get('email')?.hasError('required')">Email is required</mat-error>
              <mat-error *ngIf="registerForm.get('email')?.hasError('email')">Invalid email format</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password" placeholder="Enter your password" />
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="registerForm.get('password')?.hasError('required')">Password is required</mat-error>
              <mat-error *ngIf="registerForm.get('password')?.hasError('minlength')">Password must be at least 6 characters</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirm Password</mat-label>
              <input matInput [type]="hideConfirm ? 'password' : 'text'" formControlName="confirmPassword" placeholder="Confirm your password" />
              <button mat-icon-button matSuffix type="button" (click)="hideConfirm = !hideConfirm">
                <mat-icon>{{ hideConfirm ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="registerForm.hasError('mismatch')">Passwords do not match</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Phone (optional)</mat-label>
              <input matInput formControlName="phone" placeholder="Enter your phone number" />
              <mat-icon matSuffix>phone</mat-icon>
            </mat-form-field>

            <button mat-raised-button color="primary" class="full-width" type="submit" [disabled]="registerForm.invalid || loading">
              <mat-spinner *ngIf="loading" diameter="20" class="spinner"></mat-spinner>
              <span *ngIf="!loading">Create Account</span>
            </button>
          </form>
        </mat-card-content>
        <mat-card-actions align="end" class="card-actions">
          <span class="login-text">Already have an account?</span>
          <button mat-button color="primary" routerLink="/login">Sign In</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background:
        radial-gradient(circle at top, rgba(255, 255, 255, 0.18), transparent 34%),
        linear-gradient(135deg, #5d6de8 0%, #6f5bd5 48%, #8441c0 100%);
    }
    .register-card {
      position: relative;
      overflow: hidden;
      max-width: 560px;
      width: 100%;
      padding: 2rem 2rem 1.25rem;
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
      font-size: 2.15rem;
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
    .login-text {
      font-size: 0.875rem;
      color: rgba(31, 41, 55, 0.68);
    }
    @media (max-width: 480px) {
      .register-card {
        padding: 1.5rem 1.25rem 1rem;
      }

      mat-card-title {
        font-size: 1.85rem;
      }
    }
  `]
})
export class RegisterComponent {
  hidePassword = true;
  hideConfirm = true;
  loading = false;

  registerForm = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    phone: [''],
  }, { validators: this.passwordMatchValidator });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  passwordMatchValidator(group: any) {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.loading = true;
    const { name, email, password, phone } = this.registerForm.value;

    this.authService.register({ name: name!, email: email!, password: password!, phone: phone || undefined }).subscribe({
      next: () => {
        this.snackBar.open('Registration successful!', 'Close', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        let msg = 'Registration failed. Please try again.';
        if (err.error?.message) {
          msg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        } else if (err.status === 0) {
          msg = 'Cannot reach server. Make sure the backend is running on port 3001.';
        } else if (err.message) {
          msg = err.message;
        }
        this.snackBar.open(msg, 'Close', { duration: 8000 });
      },
    });
  }
}
