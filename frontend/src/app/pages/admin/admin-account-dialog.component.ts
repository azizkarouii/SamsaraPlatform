import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService, AdminUser, AdminUserRequest, ManagedRole } from '../../services/admin.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { t } from '../../shared/translations';

export interface AdminAccountDialogData {
  /** Absent: a new account. */
  user?: AdminUser;
  role?: ManagedRole;
}

/** Creates or edits an account; after a creation, shows the sign-in details to hand to the person. */
@Component({
  selector: 'app-admin-account-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule,
            MatInputModule, MatSlideToggleModule, MatTooltipModule, MatProgressSpinnerModule],
  template: `
    <ng-container *ngIf="!created; else done">
      <div class="head">
        <span class="head-icon" aria-hidden="true"><mat-icon>{{ editing ? 'manage_accounts' : 'person_add' }}</mat-icon></span>
        <div>
          <h2>{{ t(editing ? 'admin_edit_account' : 'admin_new_account') }}</h2>
          <p>{{ t(editing ? 'admin_edit_account_sub' : 'admin_new_account_sub') }}</p>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="roles" role="radiogroup" [attr.aria-label]="t('role')">
          <button type="button" role="radio" *ngFor="let r of roles" class="role" [class.active]="form.value.role === r.id"
                  [attr.aria-checked]="form.value.role === r.id" [disabled]="editing" (click)="form.patchValue({ role: r.id })">
            <mat-icon>{{ r.icon }}</mat-icon>
            <b>{{ t(r.label) }}</b>
            <small>{{ t(r.hint) }}</small>
          </button>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>{{ t('full_name') }}</mat-label>
          <mat-icon matPrefix>badge</mat-icon>
          <input matInput formControlName="name" autocomplete="off" />
          <mat-error>{{ t('name_min') }}</mat-error>
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>{{ t('email_label') }}</mat-label>
            <mat-icon matPrefix>alternate_email</mat-icon>
            <input matInput type="email" formControlName="email" autocomplete="off" />
            <mat-error>{{ t('email_invalid') }}</mat-error>
          </mat-form-field>
          <!-- Label kept above: inside a dialog that is still growing, +216 would otherwise cover it -->
          <mat-form-field appearance="outline" floatLabel="always">
            <mat-label>{{ t('phone_label') }}{{ form.value.role === 'SAMSAR' ? ' *' : '' }}</mat-label>
            <mat-icon matPrefix>call</mat-icon>
            <span matTextPrefix>+216&nbsp;</span>
            <input matInput formControlName="phone" inputmode="tel" autocomplete="off" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>{{ t(editing ? 'admin_new_password_optional' : 'password_label') }}</mat-label>
          <mat-icon matPrefix>key</mat-icon>
          <input matInput [type]="showPassword ? 'text' : 'password'" formControlName="password" autocomplete="new-password" />
          <button mat-icon-button matSuffix type="button" (click)="showPassword = !showPassword" [attr.aria-label]="t(showPassword ? 'hide_password' : 'show_password')">
            <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          <button mat-icon-button matSuffix type="button" (click)="generate()" [matTooltip]="t('admin_generate_password')" [attr.aria-label]="t('admin_generate_password')">
            <mat-icon>casino</mat-icon>
          </button>
          <mat-hint>{{ t(editing ? 'admin_password_keep_hint' : 'admin_password_hint') }}</mat-hint>
          <mat-error>{{ t('password_min') }}</mat-error>
        </mat-form-field>

        <div class="switches">
          <mat-slide-toggle formControlName="active" color="primary">
            <b>{{ t('admin_account_active') }}</b><small>{{ t('admin_account_active_hint') }}</small>
          </mat-slide-toggle>
          <mat-slide-toggle *ngIf="form.value.role === 'PROPRIETAIRE'" formControlName="samsarsEnabled" color="primary">
            <b>{{ t('admin_works_with_samsars') }}</b><small>{{ t('admin_works_with_samsars_hint') }}</small>
          </mat-slide-toggle>
        </div>

        <p class="inline-error" *ngIf="error" role="alert"><mat-icon>error</mat-icon>{{ error }}</p>

        <div class="actions">
          <button mat-button type="button" mat-dialog-close>{{ t('cancel') }}</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving">
            <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
            <ng-container *ngIf="!saving"><mat-icon>check</mat-icon> {{ t(editing ? 'save_changes' : 'admin_create_account') }}</ng-container>
          </button>
        </div>
      </form>
    </ng-container>

    <ng-template #done>
      <div class="done">
        <span class="done-icon"><mat-icon>verified</mat-icon></span>
        <h2>{{ t('admin_account_created') }}</h2>
        <p>{{ t('admin_hand_over') }}</p>
        <pre class="credentials">{{ credentials }}</pre>
        <div class="actions">
          <button mat-stroked-button type="button" (click)="copyCredentials()"><mat-icon>{{ copied ? 'check' : 'content_copy' }}</mat-icon> {{ t(copied ? 'link_copied' : 'admin_copy_credentials') }}</button>
          <button mat-flat-button color="primary" type="button" (click)="dialogRef.close(created ?? undefined)">{{ t('close') }}</button>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; padding: 1.2rem; max-width: 620px; }
    .head { display: flex; gap: 0.75rem; margin-bottom: 1rem; }
    .head h2 { margin: 0; font-family: var(--display-font); font-size: 1.55rem; line-height: 1.1; }
    .head p { margin: 0.15rem 0 0; font-size: 0.82rem; color: var(--text-secondary); }
    .head-icon { width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px; display: grid; place-items: center; background: var(--primary-soft); color: var(--primary); }
    form { display: flex; flex-direction: column; gap: 0.35rem; }
    .roles { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 0.6rem; }
    .role { display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem; padding: 0.8rem 0.9rem; border: 1px solid var(--border-color); border-radius: 14px; background: var(--bg-card); color: var(--text-primary); font: inherit; text-align: start; cursor: pointer; transition: all 0.18s ease; }
    .role mat-icon { color: var(--text-secondary); margin-bottom: 0.2rem; }
    .role small { font-size: 0.75rem; color: var(--text-secondary); }
    .role:hover:not(:disabled) { border-color: var(--primary); transform: translateY(-1px); }
    .role.active { background: var(--primary-soft); border-color: var(--primary-strong); box-shadow: inset 0 0 0 1px var(--primary-strong); }
    .role.active mat-icon { color: var(--primary-strong); }
    .role:disabled:not(.active) { opacity: 0.45; cursor: not-allowed; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
    .switches { display: flex; flex-direction: column; gap: 0.7rem; margin: 0.9rem 0 0.4rem; padding: 0.8rem 0.9rem; border-radius: 14px; background: var(--surface-hover); }
    .switches b { display: block; font-size: 0.88rem; }
    .switches small { display: block; font-size: 0.75rem; color: var(--text-secondary); }
    .actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.8rem; }
    .actions mat-spinner { display: inline-block; }
    .done { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.5rem; }
    .done h2 { margin: 0; font-family: var(--display-font); font-size: 1.6rem; }
    .done p { margin: 0; color: var(--text-secondary); font-size: 0.88rem; }
    .done-icon { width: 60px; height: 60px; display: grid; place-items: center; border-radius: 50%; background: var(--primary-soft); color: var(--primary); animation: pop 0.35s cubic-bezier(0.3, 1.4, 0.6, 1); }
    .done-icon mat-icon { font-size: 34px; width: 34px; height: 34px; }
    @keyframes pop { from { transform: scale(0.3); opacity: 0; } }
    .credentials { width: 100%; margin: 0.4rem 0; padding: 0.9rem 1rem; border-radius: 12px; border: 1px dashed var(--border-color); background: var(--surface-hover); text-align: start; white-space: pre-wrap; font-size: 0.85rem; }
    @media (max-width: 560px) { .row, .roles { grid-template-columns: 1fr; } }
  `],
})
export class AdminAccountDialogComponent {
  readonly editing: boolean;
  readonly roles: { id: ManagedRole; icon: string; label: string; hint: string }[] = [
    { id: 'PROPRIETAIRE', icon: 'home_work', label: 'owner_role', hint: 'admin_owner_hint' },
    { id: 'SAMSAR', icon: 'handshake', label: 'samsar_role', hint: 'admin_samsar_hint' },
  ];

  form;
  showPassword = false;
  saving = false;
  error = '';
  created: AdminUser | null = null;
  credentials = '';
  copied = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) private data: AdminAccountDialogData,
    public dialogRef: MatDialogRef<AdminAccountDialogComponent, AdminUser>,
    private fb: FormBuilder,
    private adminService: AdminService,
    private uiPrefs: UiPreferencesService,
  ) {
    const user = data?.user;
    this.editing = !!user;
    this.form = this.fb.group({
      role: [user?.role ?? data?.role ?? 'PROPRIETAIRE' as ManagedRole, Validators.required],
      name: [user?.name ?? '', [Validators.required, Validators.minLength(3)]],
      email: [user?.email ?? '', [Validators.required, Validators.email]],
      phone: [user?.phone ?? ''],
      password: ['', this.editing ? [Validators.minLength(6)] : [Validators.required, Validators.minLength(6)]],
      active: [user?.active ?? true],
      samsarsEnabled: [user?.samsarsEnabled ?? true],
    });
    if (!this.editing) this.generate();
  }

  /** A password easy to read aloud or type on a phone: no 0/O or 1/l. */
  generate(): void {
    const letters = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const pick = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
    const word = Array.from({ length: 6 }, () => pick(letters)).join('');
    this.form.patchValue({ password: word[0].toUpperCase() + word.slice(1) + pick(digits) + pick(digits) + pick(digits) });
    this.showPassword = true;
  }

  save(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const request: AdminUserRequest = {
      name: value.name!.trim(),
      email: value.email!.trim(),
      phone: value.phone?.trim() || undefined,
      role: value.role as ManagedRole,
      password: value.password || undefined,
      active: !!value.active,
      samsarsEnabled: value.role === 'PROPRIETAIRE' ? !!value.samsarsEnabled : undefined,
      language: this.uiPrefs.getLanguage(),
    };
    const user = this.data?.user;
    if (user && user.samsarsEnabled && request.samsarsEnabled === false && user.shares > 0
        && !confirm(this.t('admin_samsars_off_confirm'))) {
      return;
    }
    this.saving = true;
    this.error = '';
    (user ? this.adminService.update(user.id, request) : this.adminService.create(request)).subscribe({
      next: saved => {
        this.saving = false;
        if (user) {
          this.dialogRef.close(saved);
          return;
        }
        this.created = saved;
        this.credentials = `${this.t('app_title')}\n${location.origin}/login\n${this.t('email_label')} : ${saved.email}\n${this.t('password_label')} : ${request.password}`;
      },
      error: err => {
        this.saving = false;
        this.error = err.error?.message || this.t('admin_save_failed');
      },
    });
  }

  async copyCredentials(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.credentials);
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    } catch {
      this.copied = false;
    }
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }
}
