import { Component } from '@angular/core';
import { AuthShowcaseComponent } from '../../shared/auth-showcase.component';
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
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { AuthService } from '../../services/auth.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { AppLanguage, t } from '../../shared/translations';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [AuthShowcaseComponent, 
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
    MatButtonToggleModule,
  ],
  template: `
    <div class="register-container auth-shell">
      <app-auth-showcase></app-auth-showcase>
      <mat-card class="register-card">
        <div class="card-accent"></div>
        <img src="assets/brand/logo-icon.png" alt="Samsara" width="256" height="256" class="logo-icon" />
        <mat-card-header>
          <mat-card-title>{{ t('create_account') }}</mat-card-title>
          <mat-card-subtitle>{{ t('register_subtitle') }}</mat-card-subtitle>
        </mat-card-header>
        <div class="check-email" *ngIf="pendingEmail" role="status">
          <mat-icon aria-hidden="true">mark_email_unread</mat-icon>
          <h2>{{ t('check_your_email') }}</h2>
          <p>{{ t('verification_sent').replace('{{email}}', pendingEmail) }}</p>
          <button mat-stroked-button type="button" (click)="resend()" [disabled]="resent">{{ resent ? t('link_sent_again') : t('resend_link') }}</button>
          <a mat-button routerLink="/login">{{ t('back_to_login') }}</a>
        </div>
        <mat-card-content *ngIf="!pendingEmail">
          <p class="form-intro">{{ t('register_intro') }}</p>
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ t('full_name') }}</mat-label>
              <input matInput autocomplete="name" formControlName="name" [placeholder]="t('full_name')" />
              <mat-icon matSuffix>person</mat-icon>
              <mat-error *ngIf="registerForm.get('name')?.hasError('required')">{{ t('name_required') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ t('email_label') }}</mat-label>
              <input matInput type="email" autocomplete="email" formControlName="email" [placeholder]="t('email_label')" />
              <mat-icon matSuffix>email</mat-icon>
              <mat-error *ngIf="registerForm.get('email')?.hasError('required')">{{ t('email_required') }}</mat-error>
              <mat-error *ngIf="registerForm.get('email')?.hasError('email')">{{ t('email_invalid') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ t('password_required') }}</mat-label>
              <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password" autocomplete="new-password" [placeholder]="t('password_required')" />
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword" [attr.aria-label]="t(hidePassword ? 'show_password' : 'hide_password')" [attr.aria-pressed]="!hidePassword">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="registerForm.get('password')?.hasError('required')">{{ t('password_required') }}</mat-error>
              <mat-error *ngIf="registerForm.get('password')?.hasError('minlength')">{{ t('password_min') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ t('confirm_password') }}</mat-label>
              <input matInput [type]="hideConfirm ? 'password' : 'text'" formControlName="confirmPassword" autocomplete="new-password" [placeholder]="t('confirm_password')" />
              <button mat-icon-button matSuffix type="button" (click)="hideConfirm = !hideConfirm" [attr.aria-label]="t(hideConfirm ? 'show_password' : 'hide_password')" [attr.aria-pressed]="!hideConfirm">
                <mat-icon>{{ hideConfirm ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="registerForm.hasError('mismatch')">{{ t('passwords_dont_match') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="field-with-hint full-width" subscriptSizing="dynamic">
              <mat-label>{{ isSamsar ? t('phone_required_label') : t('phone_optional') }}</mat-label>
              <span matTextPrefix>+216&nbsp;</span>
              <input matInput formControlName="phone" type="tel" inputmode="tel" autocomplete="tel-national" />
              <mat-icon matSuffix>phone</mat-icon>
              <mat-hint *ngIf="isSamsar">{{ t('samsar_phone_hint') }}</mat-hint>
              <mat-error>{{ t('phone_invalid') }}</mat-error>
            </mat-form-field>

            <label class="role-label">{{ t('account_type') }}</label>
            <mat-button-toggle-group formControlName="role" class="role-toggle full-width" aria-label="Account role">
              <mat-button-toggle value="PROPRIETAIRE">
                <mat-icon>home</mat-icon>
                {{ t('owner_role') }}
              </mat-button-toggle>
              <mat-button-toggle value="SAMSAR">
                <mat-icon>support_agent</mat-icon>
                {{ t('samsar_role') }}
              </mat-button-toggle>
            </mat-button-toggle-group>
            <mat-error *ngIf="registerForm.get('role')?.hasError('required') && registerForm.get('role')?.touched" class="field-error">{{ t('select_account_type') }}</mat-error>

            <button mat-raised-button color="primary" class="full-width" type="submit" [disabled]="registerForm.invalid || loading">
              <mat-spinner *ngIf="loading" diameter="20" class="spinner"></mat-spinner>
              <span *ngIf="!loading">{{ t('create_account') }}</span>
            </button>
          </form>
        </mat-card-content>
        <mat-card-actions *ngIf="!pendingEmail" align="end" class="card-actions">
          <span class="login-text">{{ t('already_account') }}</span>
          <button mat-button color="primary" routerLink="/login">{{ t('sign_in') }}</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .register-card {
      position: relative;
      overflow: hidden;
      max-width: 560px;
      width: 100%;
      padding: 2rem 2rem 1.25rem;
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
    .check-email { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; text-align: center; padding: 1rem; }
    .check-email mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--primary); }
    .check-email h2 { margin: 0; }
    .check-email p { margin: 0 0 0.5rem; color: var(--text-secondary); }
    .logo-icon { display: block; width: 64px; height: 64px; margin: 0.25rem auto 0.5rem; }
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
      color: var(--primary);
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
    .role-label {
      display: block;
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 0.35rem;
      font-weight: 500;
    }
    .role-toggle {
      margin-bottom: 0.25rem;
    }
    :host ::ng-deep .role-toggle .mat-button-toggle {
      flex: 1;
    }
    :host ::ng-deep .role-toggle .mat-button-toggle .mat-icon {
      margin-inline-end: 4px;
    }
    .field-error {
      font-size: 0.75rem;
      color: var(--status-cancelled);
      margin: 0 0 1rem 0;
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
    .login-text {
      font-size: 0.875rem;
      color: var(--text-secondary);
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
  language: AppLanguage = 'fr';

  registerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    phone: ['', Validators.pattern(/^[\d\s+]{8,15}$/)],
    role: ['PROPRIETAIRE', [Validators.required]],
  }, { validators: this.passwordMatchValidator });

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
    // Owners find a samsar by email + phone, so the phone is mandatory for samsars
    this.registerForm.get('role')!.valueChanges.subscribe(role => {
      const phone = this.registerForm.get('phone')!;
      phone.setValidators(role === 'SAMSAR'
        ? [Validators.required, Validators.pattern(/^[\d\s+]{8,15}$/)]
        : [Validators.pattern(/^[\d\s+]{8,15}$/)]);
      phone.updateValueAndValidity();
    });
  }

  t(key: string): string {
    return t(key, this.language);
  }

  get isSamsar(): boolean {
    return this.registerForm.get('role')?.value === 'SAMSAR';
  }

  passwordMatchValidator(group: any) {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  pendingEmail = '';
  resent = false;

  resend(): void {
    this.authService.resendVerification(this.pendingEmail, this.uiPreferencesService.getLanguage()).subscribe({
      next: () => this.resent = true,
      error: () => this.resent = true,
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.loading = true;
    const { name, email, password, phone, role } = this.registerForm.value;

    this.authService.register({ name: name!, email: email!, password: password!, phone: phone || undefined,
      role: role! as 'PROPRIETAIRE' | 'SAMSAR', language: this.uiPreferencesService.getLanguage() }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.verificationRequired) {
          this.pendingEmail = email!.trim();
          return;
        }
        this.snackBar.open(this.t('register_success'), this.t('close'), { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        let msg = this.t('register_failed');
        if (err.error?.message) {
          msg = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        } else if (err.status === 0) {
          msg = this.t('server_unreachable');
        } else if (err.message) {
          msg = err.message;
        }
        this.snackBar.open(msg, this.t('close'), { duration: 8000 });
      },
    });
  }
}
