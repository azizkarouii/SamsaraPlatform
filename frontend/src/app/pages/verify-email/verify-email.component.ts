import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { t } from '../../shared/translations';
import { UiPreferencesControlsComponent } from '../../shared/ui-preferences-controls.component';

/** Landing page of the link sent at sign-up: confirms the email, then the account can sign in. */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, UiPreferencesControlsComponent],
  template: `
    <div class="auth-shell auth-page">
      <app-ui-preferences-controls class="prefs"></app-ui-preferences-controls>
      <mat-card class="auth-card">
        <mat-card-content>
          <div *ngIf="state === 'checking'" class="center"><mat-spinner diameter="36"></mat-spinner></div>
          <div *ngIf="state === 'done'" class="center" role="status">
            <mat-icon class="ok" aria-hidden="true">verified</mat-icon>
            <h1>{{ t('email_confirmed') }}</h1>
            <p>{{ t('email_confirmed_text') }}</p>
            <a mat-raised-button color="primary" routerLink="/login">{{ t('sign_in') }}</a>
          </div>
          <div *ngIf="state === 'failed'" class="center" role="alert">
            <mat-icon class="ko" aria-hidden="true">link_off</mat-icon>
            <h1>{{ t('email_confirm_failed') }}</h1>
            <p>{{ t('email_confirm_failed_text') }}</p>
            <a mat-stroked-button routerLink="/login">{{ t('back_to_login') }}</a>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-page { position: relative; }
    .prefs { position: absolute; top: 1rem; inset-inline-end: 1rem; --mdc-icon-button-icon-color: #fff; color: #fff; }
    .auth-card { width: 100%; max-width: 440px; padding: 1rem; }
    .center { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.5rem; }
    h1 { margin: 0; font-size: 1.4rem; }
    p { margin: 0 0 0.75rem; color: var(--text-secondary); }
    mat-icon.ok, mat-icon.ko { font-size: 48px; width: 48px; height: 48px; }
    mat-icon.ok { color: var(--primary); }
    mat-icon.ko { color: var(--status-cancelled); }
  `]
})
export class VerifyEmailComponent implements OnInit {
  state: 'checking' | 'done' | 'failed' = 'checking';

  constructor(private route: ActivatedRoute, private authService: AuthService, private uiPrefs: UiPreferencesService) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.authService.verifyEmail(token).subscribe({
      next: () => this.state = 'done',
      error: () => this.state = 'failed',
    });
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }
}
