import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { PropertyService } from '../../services/property.service';
import { PropertySamsarService } from '../../services/property-samsar.service';
import { ReservationService } from '../../services/reservation.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { User } from '../../models/auth.model';
import { Reservation, ReservationEarning } from '../../models/reservation.model';
import { t } from '../../shared/translations';
import { UserAvatarComponent } from '../../shared/user-avatar.component';
import { ACCEPT_ATTRIBUTE, checkImageFile, compressImage } from '../../shared/image-utils';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('newPassword')?.value === group.get('confirmPassword')?.value ? null : { mismatch: true };
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    UserAvatarComponent,
  ],
  template: `
    <div class="page narrow">
      <div class="page-header">
        <h1>{{ t('profile') }}</h1>
      </div>

      <mat-card class="identity">
        <mat-card-content>
          <div class="photo-block">
            <div class="avatar-wrap">
              <app-user-avatar class="avatar" [name]="user?.name" [photo]="user?.photoUrl"></app-user-avatar>
              <div class="avatar-busy" *ngIf="photoBusy"><mat-spinner diameter="28"></mat-spinner></div>
              <button mat-mini-fab color="primary" type="button" class="change-photo" (click)="photoInput.click()"
                      [disabled]="photoBusy" [attr.aria-label]="user?.photoUrl ? t('change_photo') : t('add_photo')">
                <mat-icon>photo_camera</mat-icon>
              </button>
            </div>
            <button mat-button type="button" class="remove-photo" *ngIf="user?.photoUrl" (click)="removePhoto()" [disabled]="photoBusy">
              {{ t('remove_photo') }}
            </button>
            <input #photoInput type="file" hidden [accept]="accept" (change)="onPhotoPicked($event)" />
          </div>
          <div class="who">
            <strong>{{ user?.name }}</strong>
            <span>{{ user?.email }}</span>
            <span class="pill primary">{{ user?.role === 'PROPRIETAIRE' ? t('owner_role') : t('samsar_role') }}</span>
          </div>
          <div class="stats">
            <a class="stat" [routerLink]="user?.role === 'PROPRIETAIRE' ? '/properties' : '/shared-houses'">
              <strong>{{ propertyCount }}</strong><span>{{ user?.role === 'PROPRIETAIRE' ? t('properties_count') : t('shared_houses') }}</span>
            </a>
            <a class="stat" routerLink="/reservations"><strong>{{ reservationCount }}</strong><span>{{ t('reservations_count') }}</span></a>
            <a class="stat gold" routerLink="/reports"><strong>{{ totalRevenue | number:'1.0-0' }} <small>TND</small></strong><span>{{ user?.role === 'SAMSAR' ? t('my_gains') : t('revenue_suffix') }}</span></a>
          </div>
        </mat-card-content>
      </mat-card>

      <div class="grid">
        <mat-card>
          <mat-card-header><mat-card-title>{{ t('edit_profile') }}</mat-card-title></mat-card-header>
          <mat-card-content>
            <form [formGroup]="profileForm" (ngSubmit)="onUpdateProfile()">
              <mat-form-field appearance="outline">
                <mat-label>{{ t('name_label') }}</mat-label>
                <input matInput formControlName="name" />
                <mat-error>{{ t('name_min') }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline" class="field-with-hint" subscriptSizing="dynamic">
                <mat-label>{{ t('email_label') }}</mat-label>
                <input matInput type="email" [value]="user?.email" disabled />
                <mat-hint>{{ t('email_not_editable') }}</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ t('phone_label') }}</mat-label>
                <span matTextPrefix>+216&nbsp;</span>
                <input matInput formControlName="phone" inputmode="tel" />
                <mat-error>{{ t('phone_invalid') }}</mat-error>
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" [disabled]="profileForm.invalid || profileForm.pristine || saving">
                {{ t('save_changes') }}
              </button>
            </form>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header><mat-card-title>{{ t('change_password') }}</mat-card-title></mat-card-header>
          <mat-card-content>
            <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()">
              <mat-form-field appearance="outline">
                <mat-label>{{ t('current_password') }}</mat-label>
                <input matInput [type]="showPasswords ? 'text' : 'password'" formControlName="currentPassword" autocomplete="current-password" />
                <button mat-icon-button matSuffix type="button" (click)="showPasswords = !showPasswords" [attr.aria-label]="t(showPasswords ? 'hide_password' : 'show_password')" [attr.aria-pressed]="showPasswords">
                  <mat-icon>{{ showPasswords ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ t('new_password') }}</mat-label>
                <input matInput [type]="showPasswords ? 'text' : 'password'" formControlName="newPassword" autocomplete="new-password" />
                <button mat-icon-button matSuffix type="button" (click)="showPasswords = !showPasswords" [attr.aria-label]="t(showPasswords ? 'hide_password' : 'show_password')" [attr.aria-pressed]="showPasswords">
                  <mat-icon>{{ showPasswords ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                <mat-error>{{ t('password_min') }}</mat-error>
              </mat-form-field>
              <div class="strength" *ngIf="passwordForm.value.newPassword" [attr.data-level]="strength">
                <span class="strength-bars"><i></i><i></i><i></i><i></i></span>
                <span class="strength-label">{{ t('password_strength_' + strength) }}</span>
              </div>
              <mat-form-field appearance="outline">
                <mat-label>{{ t('confirm_password') }}</mat-label>
                <input matInput [type]="showPasswords ? 'text' : 'password'" formControlName="confirmPassword" autocomplete="new-password" />
                <button mat-icon-button matSuffix type="button" (click)="showPasswords = !showPasswords" [attr.aria-label]="t(showPasswords ? 'hide_password' : 'show_password')" [attr.aria-pressed]="showPasswords">
                  <mat-icon>{{ showPasswords ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>
              <div class="inline-error" *ngIf="passwordForm.hasError('mismatch') && passwordForm.get('confirmPassword')?.dirty">
                {{ t('passwords_dont_match') }}
              </div>
              <button mat-raised-button color="primary" type="submit" [disabled]="passwordForm.invalid || changingPassword">
                {{ t('update_password') }}
              </button>
            </form>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="logout-row">
        <button mat-button (click)="logoutEverywhere()" [matTooltip]="t('logout_everywhere_hint')"><mat-icon>devices</mat-icon> {{ t('logout_everywhere') }}</button>
        <button mat-stroked-button color="warn" (click)="logout()"><mat-icon>logout</mat-icon> {{ t('logout') }}</button>
      </div>
    </div>
  `,
  styles: [`
    .narrow { max-width: 960px; }
    .identity mat-card-content { display: flex; flex-wrap: wrap; align-items: center; gap: 1.25rem; padding-top: 1rem !important; }
    .photo-block { display: flex; flex-direction: column; align-items: center; }
    .avatar-wrap { position: relative; }
    .avatar { --avatar-size: 88px; }
    .avatar-busy { position: absolute; inset: 0; display: grid; place-items: center; border-radius: 50%; background: rgba(0, 0, 0, 0.45); }
    .change-photo { position: absolute; bottom: -4px; inset-inline-end: -4px; transform: scale(0.85); }
    .remove-photo { font-size: 0.78rem; min-height: 28px; height: 28px; margin-top: 4px; }
    .who { display: flex; flex-direction: column; align-items: flex-start; gap: 0.2rem; flex: 1; min-width: 200px; }
    .who strong { font-size: 1.25rem; }
    .who span:not(.pill) { color: var(--text-secondary); }
    .identity { position: relative; overflow: hidden; }
    .identity::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 76px; background: linear-gradient(120deg, var(--primary-soft), var(--accent-gold-soft)); pointer-events: none; }
    .identity mat-card-content { position: relative; }
    .avatar { border-radius: 50%; box-shadow: 0 0 0 4px var(--bg-card), 0 0 0 6px var(--accent-gold-soft); }
    .who strong { font-family: var(--display-font); font-size: 2rem !important; line-height: 1.05; }
    .stats { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .stat { display: flex; flex-direction: column; align-items: flex-start; min-width: 110px; padding: 0.6rem 0.9rem; border-radius: 12px; border: 1px solid var(--border-color); border-top: 3px solid var(--primary); background: var(--bg-card); color: inherit; text-decoration: none; transition: transform 0.15s ease, box-shadow 0.15s ease; }
    .stat:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .stat.gold { border-top-color: var(--accent-gold); }
    .stat strong { font-family: var(--display-font); font-size: 1.7rem; line-height: 1; }
    .stat small { font-size: 0.75rem; color: var(--text-secondary); }
    .stat span { font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
    .strength { display: flex; align-items: center; gap: 0.6rem; margin: -0.6rem 0 0.9rem; font-size: 0.78rem; color: var(--text-secondary); }
    .strength-bars { display: grid; grid-template-columns: repeat(4, 28px); gap: 4px; }
    .strength-bars i { height: 5px; border-radius: 3px; background: var(--border-color); }
    .strength[data-level='weak'] i:nth-child(-n + 1) { background: var(--status-cancelled); }
    .strength[data-level='fair'] i:nth-child(-n + 2) { background: var(--status-pending); }
    .strength[data-level='good'] i:nth-child(-n + 3) { background: var(--status-confirmed); }
    .strength[data-level='strong'] i { background: var(--primary); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: 1.25rem; }
    form { display: flex; flex-direction: column; padding-top: 0.75rem; }
    form button { align-self: flex-start; }
    .inline-error { color: var(--status-cancelled); font-size: 0.82rem; margin: -0.5rem 0 0.75rem; }
    .logout-row { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.5rem; }
  `]
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  propertyCount = 0;
  reservationCount = 0;
  totalRevenue = 0;
  saving = false;
  changingPassword = false;
  showPasswords = false;

  /** Length, then the kinds of characters mixed (lower and upper case, digits, symbols). */
  get strength(): 'weak' | 'fair' | 'good' | 'strong' {
    const value = this.passwordForm.value.newPassword || '';
    const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(value)).length;
    const score = (value.length >= 6 ? 1 : 0) + (value.length >= 10 ? 1 : 0) + (kinds >= 2 ? 1 : 0) + (kinds >= 3 ? 1 : 0);
    return (['weak', 'weak', 'fair', 'good', 'strong'] as const)[score];
  }

  profileForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    phone: ['', Validators.pattern(/^[\d\s+]{8,15}$/)],
  });

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private propertyService: PropertyService,
    private propertySamsarService: PropertySamsarService,
    private reservationService: ReservationService,
    private router: Router,
    private snackBar: MatSnackBar,
    private uiPrefs: UiPreferencesService,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.resetProfileForm();
    this.loadStats();
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  readonly accept = ACCEPT_ATTRIBUTE;
  photoBusy = false;

  /** Profile photo: resized to 512px in the browser, then replaces the initials everywhere. */
  async onPhotoPicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const error = checkImageFile(file);
    if (error) {
      this.snackBar.open(this.t(error), this.t('close'), { duration: 4000 });
      return;
    }
    this.photoBusy = true;
    const prepared = await compressImage(file, 512);
    this.authService.updatePhoto(prepared).subscribe({
      next: (user) => {
        this.user = user;
        this.photoBusy = false;
        this.snackBar.open(this.t('photo_updated'), this.t('close'), { duration: 2500 });
      },
      error: (err) => this.photoFailed(err),
    });
  }

  removePhoto(): void {
    if (!confirm(this.t('remove_photo_confirm'))) return;
    this.photoBusy = true;
    this.authService.removePhoto().subscribe({
      next: (user) => {
        this.user = user;
        this.photoBusy = false;
      },
      error: (err) => this.photoFailed(err),
    });
  }

  private photoFailed(err: any): void {
    this.photoBusy = false;
    this.snackBar.open(err?.error?.message || this.t('error_generic'), this.t('close'), { duration: 4000 });
  }

  private resetProfileForm(): void {
    this.profileForm.reset({ name: this.user?.name || '', phone: this.user?.phone || '' });
  }

  private loadStats(): void {
    this.reservationService.summary().subscribe({
      next: (summary) => {
        this.propertyCount = summary.propertyCount;
        this.reservationCount = summary.reservationCount;
        this.totalRevenue = summary.earned;
      },
    });
  }


  onUpdateProfile(): void {
    if (this.profileForm.invalid) return;
    this.saving = true;
    const { name, phone } = this.profileForm.getRawValue();
    this.authService.updateProfile({ name: name!.trim(), phone: phone?.trim() || undefined }).subscribe({
      next: (user) => {
        this.user = user;
        this.resetProfileForm();
        this.saving = false;
        this.snackBar.open(this.t('profile_updated'), this.t('close'), { duration: 3000 });
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || this.t('failed_to_update_profile'), this.t('close'), { duration: 4000 });
      },
    });
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) return;
    this.changingPassword = true;
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.authService.changePassword(currentPassword!, newPassword!).subscribe({
      next: () => {
        this.changingPassword = false;
        this.passwordForm.reset();
        this.snackBar.open(this.t('password_updated_others_signed_out'), this.t('close'), { duration: 4000 });
      },
      error: (err) => {
        this.changingPassword = false;
        this.snackBar.open(err.error?.message || this.t('error_generic'), this.t('close'), { duration: 4000 });
      },
    });
  }

  logout(): void {
    this.authService.logout().subscribe(() => this.router.navigate(['/login']));
  }

  logoutEverywhere(): void {
    if (!confirm(this.t('logout_everywhere_confirm'))) return;
    this.authService.logoutEverywhere().subscribe({
      next: () => this.router.navigate(['/login']),
      error: (err) => this.snackBar.open(err?.error?.message || this.t('error_generic'), this.t('close'), { duration: 4000 }),
    });
  }

}
