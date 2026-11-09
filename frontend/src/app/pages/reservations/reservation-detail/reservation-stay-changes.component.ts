import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { ReservationService } from '../../../services/reservation.service';
import { UiPreferencesService } from '../../../services/ui-preferences.service';
import { Reservation, ReservationStatus, ownerReceived, samsarReceived } from '../../../models/reservation.model';
import { t } from '../../../shared/translations';
import { formatIsoDate, parseIsoDate, todayIso } from '../../../shared/calendar-utils';

/** Changes during or after a stay: ending it early, and money given back to the client. */
@Component({
  selector: 'app-reservation-stay-changes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSnackBarModule],
  template: `
    <div class="status-actions" *ngIf="canEndEarly || canRefund">
      <span class="hint">{{ t('stay_changes') }}</span>
      <button mat-stroked-button *ngIf="canEndEarly" (click)="open('early')"><mat-icon>event_busy</mat-icon> {{ t('end_early') }}</button>
      <button mat-stroked-button *ngIf="canRefund" (click)="open('refund')"><mat-icon>undo</mat-icon> {{ t('give_money_back') }}</button>
    </div>

    <form class="stay-panel" *ngIf="panel === 'early'" (ngSubmit)="submitEarlyEnd()">
      <p>{{ t('end_early_explained') }}</p>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>{{ t('new_end_date') }}</mat-label>
        <input matInput type="date" name="earlyEndDate" required [min]="reservation.startDate" [max]="latestEarlyEnd" [(ngModel)]="earlyEndDate" />
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic" *ngIf="maxRefund > 0">
        <mat-label>{{ t('money_given_back_optional') }}</mat-label>
        <input matInput type="number" name="earlyRefund" min="0" [max]="maxRefund" [(ngModel)]="refundInput" />
        <span matTextSuffix>TND</span>
      </mat-form-field>
      <div class="panel-actions">
        <button mat-button type="button" (click)="panel = null">{{ t('cancel') }}</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="saving || !earlyEndDate">{{ t('confirm_end_early') }}</button>
      </div>
    </form>

    <form class="stay-panel" *ngIf="panel === 'refund'" (ngSubmit)="submitRefund()">
      <p>{{ t(refundExplanationKey) }}</p>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>{{ t('money_given_back') }}</mat-label>
        <input matInput type="number" name="refund" min="0" [max]="maxRefund" [(ngModel)]="refundInput" />
        <span matTextSuffix>TND</span>
      </mat-form-field>
      <div class="panel-actions">
        <button mat-button type="button" (click)="panel = null">{{ t('cancel') }}</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="saving">{{ t('save_changes') }}</button>
      </div>
    </form>
  `,
  styles: [`
    .status-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-color); }
    .hint { font-size: 0.85rem; color: var(--text-secondary); }
    .stay-panel { display: grid; gap: 0.75rem; max-width: 420px; margin-top: 1rem; padding: 1rem; border-radius: 12px; background: var(--surface-subtle); }
    .stay-panel p { margin: 0; font-size: 0.85rem; color: var(--text-secondary); }
    .panel-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
  `]
})
export class ReservationStayChangesComponent {
  @Input({ required: true }) reservation!: Reservation;
  @Input({ required: true }) status!: ReservationStatus;
  @Input() paid = 0;
  @Input() isHouseOwner = false;
  @Output() updated = new EventEmitter<Reservation>();

  panel: 'early' | 'refund' | null = null;
  saving = false;
  earlyEndDate = '';
  refundInput: number | null = null;

  constructor(
    private reservationService: ReservationService,
    private snackBar: MatSnackBar,
    private uiPrefs: UiPreferencesService,
  ) {}

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  /** A one-day stay cannot end sooner. */
  get canEndEarly(): boolean {
    return this.status === 'in-progress' && this.reservation.startDate < this.reservation.endDate;
  }

  /** Most the caller can give back: what he has received himself. The server enforces the same limits. */
  get maxRefund(): number {
    return this.isHouseOwner ? ownerReceived(this.reservation, this.paid) : samsarReceived(this.reservation, this.paid);
  }

  /** Always voluntary, once money has really been received by the one giving it back. */
  get canRefund(): boolean {
    return this.maxRefund > 0 && ['in-progress', 'cancelled'].includes(this.status);
  }

  get refundExplanationKey(): string {
    if (!this.isHouseOwner) return 'give_back_samsar';
    return this.status === 'cancelled' ? 'give_back_cancelled' : 'give_back_owner';
  }

  get latestEarlyEnd(): string {
    const dayBefore = parseIsoDate(this.reservation.endDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    return formatIsoDate(dayBefore);
  }

  open(panel: 'early' | 'refund'): void {
    this.panel = panel;
    this.refundInput = (this.isHouseOwner ? this.reservation.refundAmount : this.reservation.samsarRefundAmount) ?? null;
    if (panel === 'early') {
      const today = todayIso();
      this.earlyEndDate = today < this.latestEarlyEnd ? today : this.latestEarlyEnd;
      this.refundInput = null;
    }
  }

  submitEarlyEnd(): void {
    this.apply(
      this.reservationService.endEarly(this.reservation.id, this.earlyEndDate, Number(this.refundInput || 0) || undefined),
      this.t('stay_ended_early'),
    );
  }

  submitRefund(): void {
    this.apply(this.reservationService.setRefund(this.reservation.id, Number(this.refundInput || 0)), this.t('refund_saved'));
  }

  private apply(change: Observable<Reservation>, message: string): void {
    this.saving = true;
    change.subscribe({
      next: (updated) => {
        this.saving = false;
        this.panel = null;
        this.updated.emit(updated);
        this.snackBar.open(message, this.t('close'), { duration: 3000 });
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || this.t('reservation_update_failed'), this.t('close'), { duration: 4000 });
      },
    });
  }
}
