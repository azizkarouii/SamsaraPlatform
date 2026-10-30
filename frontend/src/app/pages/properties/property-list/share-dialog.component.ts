import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { PropertySamsarService } from '../../../services/property-samsar.service';
import { UiPreferencesService } from '../../../services/ui-preferences.service';
import { TRANSLATIONS } from '../../../shared/translations';

@Component({
  selector: 'app-share-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ t('invite_samsar') }}</h2>
    <mat-dialog-content>
      <p class="dialog-subtitle"><strong>{{ data.propertyTitle }}</strong> — {{ t('invite_samsar_sub') }}</p>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ t('samsar_email') }}</mat-label>
          <input matInput type="email" formControlName="email" />
          <mat-error>{{ t('email_invalid') }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width phone-field">
          <mat-label>{{ t('samsar_phone') }}</mat-label>
          <span matTextPrefix>+216&nbsp;</span>
          <input matInput formControlName="phone" placeholder="12345678" inputmode="tel" />
          <mat-error>{{ t('phone_invalid') }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ t('allowed_increase') }}</mat-label>
          <mat-select formControlName="priceIncreaseTnd">
            <mat-option [value]="10">10 TND</mat-option>
            <mat-option [value]="20">20 TND</mat-option>
            <mat-option [value]="30">30 TND</mat-option>
          </mat-select>
          <mat-hint>{{ t('margin_explained') }}</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">{{ t('cancel') }}</button>
      <button mat-raised-button color="primary" (click)="submit()" [disabled]="form.invalid || submitting">
        {{ t('send_invite') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-subtitle { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem; }
    .full-width { width: 100%; margin-bottom: 0.5rem; }
  `]
})
export class ShareDialogComponent {
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[\d\s+]{8,15}$/)]],
    priceIncreaseTnd: [10, Validators.required],
  });
  submitting = false;

  constructor(
    public dialogRef: MatDialogRef<ShareDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { propertyId: number; propertyTitle: string },
    private fb: FormBuilder,
    private propertySamsarService: PropertySamsarService,
    private snackBar: MatSnackBar,
    private uiPrefs: UiPreferencesService,
  ) {
  }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    const { email, phone, priceIncreaseTnd } = this.form.value;
    this.propertySamsarService.invite({
      propertyId: this.data.propertyId,
      email: email!,
      phone: phone!,
      priceIncreaseTnd: priceIncreaseTnd || 10,
    }).subscribe({
      next: () => {
        this.snackBar.open(this.t('invite_success'), this.t('close'), { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.submitting = false;
        this.snackBar.open(err.error?.message || this.t('error_generic'), this.t('close'), { duration: 4000 });
      },
    });
  }

  t(key: string): string {
    return TRANSLATIONS[key]?.[this.uiPrefs.getLanguage()] ?? key;
  }
}
