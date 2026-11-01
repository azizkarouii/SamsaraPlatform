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
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { AppLanguage, t } from '../../shared/translations';
import { UiPreferencesControlsComponent } from '../../shared/ui-preferences-controls.component';

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
    UiPreferencesControlsComponent,
  ],
  template: `
    <div class="login-container auth-shell">
      <app-ui-preferences-controls class="prefs"></app-ui-preferences-controls>
      <mat-card class="login-card">
        <div class="card-accent"></div>
        <header class="brand-header">
          <h1 class="logo-title">
            <img src="assets/brand/logo-full.png" alt="Samsara" width="900" height="257" class="logo-full" />
          </h1>
          <!-- The slogan is text (not part of the image) so it follows the selected language -->
          <p class="slogan">{{ t('app_slogan') }}</p>
        </header>
        <mat-card-content>
          <p class="form-intro">{{ t('login_intro') }}</p>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ t('email_label') }}</mat-label>
              <input matInput type="email" autocomplete="email" formControlName="email" [placeholder]="t('email_label')" />
              <mat-icon matSuffix>email</mat-icon>
              <mat-error *ngIf="loginForm.get('email')?.hasError('required')">{{ t('email_required') }}</mat-error>
              <mat-error *ngIf="loginForm.get('email')?.hasError('email')">{{ t('email_invalid') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ t('password_required') }}</mat-label>
              <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password" autocomplete="current-password" [placeholder]="t('password_required')" />
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword" [attr.aria-label]="t(hidePassword ? 'show_password' : 'hide_password')" [attr.aria-pressed]="!hidePassword">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="loginForm.get('password')?.hasError('required')">{{ t('password_required') }}</mat-error>
              <mat-error *ngIf="loginForm.get('password')?.hasError('minlength')">{{ t('password_min') }}</mat-error>
            </mat-form-field>

            <button mat-raised-button color="primary" class="full-width" type="submit" [disabled]="loginForm.invalid || loading">
              <mat-spinner *ngIf="loading" diameter="20" class="spinner"></mat-spinner>
              <span *ngIf="!loading">{{ t('sign_in') }}</span>
            </button>
          </form>
        </mat-card-content>
        <mat-card-actions align="end" class="card-actions">
          <span class="register-text">{{ t('no_account') }}</span>
          <button mat-button color="primary" routerLink="/register">{{ t('register') }}</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .login-container { position: relative; }
    .prefs { position: absolute; top: 1rem; inset-inline-end: 1rem; --mdc-icon-button-icon-color: #fff; color: #fff; }
    .login-card {
      position: relative;
      overflow: hidden;
      max-width: 440px;
      width: 100%;
      padding: 2rem 2rem 1.25rem;
      margin: 0;
      border: 1px solid var(--border-color);
      box-shadow: 0 24px 60px rgba(2, 6, 23, 0.3) !important;
      backdrop-filter: blur(16px);
      background: var(--bg-card);
    }
    .card-accent {
      position: absolute;
      inset: 0 auto auto 0;
      width: 100%;
      height: 5px;
      background: linear-gradient(90deg, #15803D, #4ADE80, #15803D);
    }
    .brand-header { text-align: center; margin: 0.5rem 0 1.5rem; }
    .logo-title { margin: 0; line-height: 0; }
    .logo-full { width: min(100%, 300px); height: auto; }
    .slogan {
      margin: 0.6rem 0 0; font-family: 'Montserrat', 'Fira Sans', sans-serif; font-weight: 600;
      font-size: 0.8rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--primary);
    }
    mat-card-subtitle {
      color: var(--text-secondary);
      font-size: 0.98rem;
    }
    .form-intro {
      margin: 0 0 1.25rem;
      color: var(--text-secondary);
      font-size: 0.95rem;
      line-height: 1.5;
    }
    .full-width {
      width: 100%;
      margin-bottom: 1.1rem;
    }
    :host ::ng-deep .mat-mdc-form-field .mat-mdc-text-field-wrapper {
      background: var(--surface-subtle);
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
      margin-inline-end: 0.5rem;
    }
    button[mat-raised-button] {
      height: 48px;
      border-radius: 12px;
      font-weight: 600;
      box-shadow: 0 10px 22px rgba(15, 118, 110, 0.28);
    }
    .card-actions {
      padding-top: 0.5rem;
    }
    .register-text {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
    @media (max-width: 480px) {
      .login-card {
        padding: 1.5rem 1.25rem 1rem;
      }

      .slogan {
        letter-spacing: 0.16em;
      }
    }
  `]
})
export class LoginComponent {
  hidePassword = true;
  loading = false;
  language: AppLanguage = 'fr';

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private uiPreferencesService: UiPreferencesService
  ) {
    this.language = this.uiPreferencesService.getLanguage();
    this.uiPreferencesService.language$.subscribe((lang) => {
      this.language = lang;
    });
  }

  t(key: string): string {
    return t(key, this.language);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: () => {
        this.snackBar.open(this.t('login_success'), this.t('close'), { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || this.t('login_failed');
        this.snackBar.open(msg, this.t('close'), { duration: 5000 });
      },
    });
  }
}
