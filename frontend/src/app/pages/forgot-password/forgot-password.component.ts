import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../services/auth.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { t } from '../../shared/translations';
import { UiPreferencesControlsComponent } from '../../shared/ui-preferences-controls.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, UiPreferencesControlsComponent],
  template: `
    <div class="auth-shell auth-page">
      <app-ui-preferences-controls class="prefs"></app-ui-preferences-controls>
      <mat-card class="auth-card">
        <mat-card-content>
          <h1>{{ t('forgot_password_title') }}</h1>
          <ng-container *ngIf="!sent; else done">
            <p>{{ t('forgot_password_intro') }}</p>
            <form [formGroup]="form" (ngSubmit)="submit()">
              <mat-form-field appearance="outline">
                <mat-label>{{ t('email_label') }}</mat-label>
                <input matInput type="email" autocomplete="email" formControlName="email" />
                <mat-error>{{ t('email_invalid') }}</mat-error>
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || loading">{{ t('send_reset_link') }}</button>
            </form>
          </ng-container>
          <ng-template #done>
            <p class="done" role="status"><mat-icon aria-hidden="true">mark_email_read</mat-icon> {{ t('reset_link_sent') }}</p>
          </ng-template>
          <a mat-button routerLink="/login">{{ t('back_to_login') }}</a>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-page { position: relative; }
    .prefs { position: absolute; top: 1rem; inset-inline-end: 1rem; --mdc-icon-button-icon-color: #fff; color: #fff; }
    .auth-card { width: 100%; max-width: 440px; padding: 1rem; }
    h1 { margin: 0 0 0.5rem; font-size: 1.4rem; }
    p { color: var(--text-secondary); }
    form { display: grid; gap: 0.5rem; margin-bottom: 0.5rem; }
    .done { display: flex; gap: 0.5rem; align-items: flex-start; color: var(--text-primary); }
    .done mat-icon { color: var(--primary); flex-shrink: 0; }
  `]
})
export class ForgotPasswordComponent {
  form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  loading = false;
  sent = false;

  constructor(private fb: FormBuilder, private authService: AuthService, private uiPrefs: UiPreferencesService) {}

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  /** The answer never says whether the account exists, so the same message follows any outcome. */
  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.authService.forgotPassword(this.form.value.email!.trim(), this.uiPrefs.getLanguage()).subscribe({
      next: () => this.sent = true,
      error: () => this.sent = true,
    });
  }
}
