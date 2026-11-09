import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReservationService } from '../../../services/reservation.service';
import { UiPreferencesService } from '../../../services/ui-preferences.service';
import { Reservation, ReservationPayment, ReservationStatus } from '../../../models/reservation.model';
import { t } from '../../../shared/translations';
import { todayIso } from '../../../shared/calendar-utils';

/** Payments received for a booking, with the form to record one. The page reloads the money on `changed`. */
@Component({
  selector: 'app-reservation-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSnackBarModule, MatTooltipModule],
  template: `
    <mat-card>
      <mat-card-content>
        <div class="card-head">
          <h3>{{ t('payments') }}</h3>
          <button mat-stroked-button *ngIf="canAdd && !adding" (click)="open()">
            <mat-icon>add</mat-icon> {{ t('record_payment') }}
          </button>
        </div>
        <p class="hint" *ngIf="!payments.length">{{ t('no_payment_yet') }}</p>
        <ul class="payments" *ngIf="payments.length">
          <li *ngFor="let payment of payments">
            <div>
              <strong>{{ payment.amount | number:'1.0-2' }} TND</strong>
              <span>{{ payment.paidOn | date:'dd/MM/yyyy' }} · {{ label(payment) }}</span>
            </div>
            <button mat-icon-button *ngIf="payment.kind !== 'advance'" (click)="remove(payment)"
                    [attr.aria-label]="t('delete_payment')" [matTooltip]="t('delete_payment')">
              <mat-icon>delete</mat-icon>
            </button>
          </li>
        </ul>
        <form class="stay-panel" *ngIf="adding" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ t('amount') }}</mat-label>
            <input matInput type="number" name="paymentAmount" min="0" [max]="remaining" required [(ngModel)]="amount" />
            <span matTextSuffix>TND</span>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ t('payment_date') }}</mat-label>
            <input matInput type="date" name="paymentDate" [max]="today" [(ngModel)]="paidOn" />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ t('payment_note') }}</mat-label>
            <input matInput name="paymentNote" maxlength="500" [(ngModel)]="note" />
          </mat-form-field>
          <div class="panel-actions">
            <button mat-button type="button" (click)="adding = false">{{ t('cancel') }}</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="saving || !amount">{{ t('save_changes') }}</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    h3 { margin: 1rem 0 0.25rem; font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); }
    .card-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    .hint { font-size: 0.82rem; color: var(--text-secondary); }
    .payments { list-style: none; margin: 0.5rem 0 0; padding: 0; display: grid; gap: 0.4rem; }
    .payments li { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border-color); }
    .payments li div { display: flex; flex-direction: column; }
    .payments li span { font-size: 0.8rem; color: var(--text-secondary); }
    .stay-panel { display: grid; gap: 0.75rem; max-width: 420px; margin-top: 1rem; padding: 1rem; border-radius: 12px; background: var(--surface-subtle); }
    .panel-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
  `]
})
export class ReservationPaymentsComponent {
  @Input({ required: true }) reservation!: Reservation;
  @Input() payments: ReservationPayment[] = [];
  @Input({ required: true }) status!: ReservationStatus;
  @Input() remaining = 0;
  @Output() changed = new EventEmitter<void>();

  adding = false;
  saving = false;
  amount: number | null = null;
  paidOn = '';
  note = '';
  readonly today = todayIso();

  constructor(
    private reservationService: ReservationService,
    private snackBar: MatSnackBar,
    private uiPrefs: UiPreferencesService,
  ) {}

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  get canAdd(): boolean {
    return this.remaining > 0 && this.status !== 'pending';
  }

  label(payment: ReservationPayment): string {
    if (payment.kind === 'advance') return this.t('advance_paid');
    if (payment.kind === 'balance') return this.t('balance_paid_on_arrival');
    return payment.note || this.t('payment');
  }

  open(): void {
    this.amount = this.remaining;
    this.paidOn = this.today;
    this.note = '';
    this.adding = true;
  }

  submit(): void {
    this.saving = true;
    this.reservationService.addPayment(this.reservation.id, {
      amount: Number(this.amount),
      paidOn: this.paidOn || undefined,
      note: this.note || undefined,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.adding = false;
        this.changed.emit();
        this.snackBar.open(this.t('payment_recorded'), this.t('close'), { duration: 2500 });
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || this.t('error_generic'), this.t('close'), { duration: 4000 });
      },
    });
  }

  remove(payment: ReservationPayment): void {
    if (!confirm(this.t('delete_payment_confirm'))) return;
    this.reservationService.removePayment(this.reservation.id, payment.id).subscribe({
      next: () => this.changed.emit(),
      error: (err) => this.snackBar.open(err.error?.message || this.t('error_generic'), this.t('close'), { duration: 4000 }),
    });
  }
}
