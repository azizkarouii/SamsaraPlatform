import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { t } from '../../shared/translations';
import { UiPreferencesControlsComponent } from '../../shared/ui-preferences-controls.component';

function passwordsMatch(form: AbstractControl): ValidationErrors | null {
  return form.value.password === form.value.confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSnackBarModule, UiPreferencesControlsComponent],
  template: `
    <div class="auth-shell auth-page">
      <app-ui-preferences-controls class="prefs"></app-ui-preferences-controls>
      <mat-card class="auth-card">
        <mat-card-content>
          <h1>{{ t('reset_password_title') }}</h1>
          <form [formGroup]="form" (ngSubmit)="submit()" *ngIf="token; else noToken">
            <mat-form-field appearance="outline">
              <mat-label>{{ t('new_password') }}</mat-label>
              <input matInput type="password" autocomplete="new-password" formControlName="password" />
              <mat-error>{{ t('password_min') }}</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ t('confirm_password') }}</mat-label>
              <input matInput type="password" autocomplete="new-password" formControlName="confirm" />
            </mat-form-field>
            <p class="error" *ngIf="form.hasError('mismatch') && form.get('confirm')?.touched">{{ t('passwords_dont_match') }}</p>
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || loading">{{ t('update_password') }}</button>
          </form>
          <ng-template #noToken><p class="error">{{ t('reset_link_missing') }}</p></ng-template>
          <a mat-button routerLink="/login">{{ t('back_to_login') }}</a>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-page { position: relative; }
    .prefs { position: absolute; top: 1rem; inset-inline-end: 1rem; --mdc-icon-button-icon-color: #fff; color: #fff; }
    .auth-card { width: 100%; max-width: 440px; padding: 1rem; }
    h1 { margin: 0 0 1rem; font-size: 1.4rem; }
    form { display: grid; gap: 0.5rem; margin-bottom: 0.5rem; }
    .error { margin: 0; font-size: 0.85rem; color: var(--status-cancelled); }
  `]
})
export class ResetPasswordComponent implements OnInit {
  form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm: ['', Validators.required],
  }, { validators: passwordsMatch });
  token = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private uiPrefs: UiPreferencesService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.authService.resetPassword(this.token, this.form.value.password!).subscribe({
      next: () => {
        this.snackBar.open(this.t('password_updated'), this.t('close'), { duration: 3000 });
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.message || this.t('error_generic'), this.t('close'), { duration: 5000 });
      },
    });
  }
}
