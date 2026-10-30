import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReservationService } from '../../../services/reservation.service';
import { AuthService } from '../../../services/auth.service';
import { UiPreferencesService } from '../../../services/ui-preferences.service';
import {
  Reservation,
  ReservationStatus,
  RESERVATION_STATUSES,
  STATUS_TRANSITIONS,
  countReservationDays,
  normalizeReservationStatus,
  statusKey,
} from '../../../models/reservation.model';
import { t } from '../../../shared/translations';
import { todayIso } from '../../../shared/calendar-utils';

@Component({
  selector: 'app-reservation-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div *ngIf="loading" class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>

    <div class="page" *ngIf="!loading && reservation as r">
      <div class="page-header">
        <div>
          <p class="eyebrow">{{ t('reservation') }} #{{ r.id }}</p>
          <h1>{{ r.clientName }}</h1>
          <p class="subtitle">{{ r.property?.title }}</p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button routerLink="/reservations">
            <mat-icon>arrow_back</mat-icon> {{ t('back_to_list') }}
          </button>
          <a mat-stroked-button *ngIf="editable" [routerLink]="['/reservations', r.id, 'edit']">
            <mat-icon>edit</mat-icon> {{ t('edit') }}
          </a>
          <button mat-stroked-button color="warn" (click)="deleteReservation()">
            <mat-icon>delete</mat-icon> {{ t('delete') }}
          </button>
        </div>
      </div>

      <mat-card>
        <mat-card-content>
          <!-- Workflow progress -->
          <div class="workflow" *ngIf="status !== 'cancelled'; else cancelledBanner">
            <div class="step" *ngFor="let s of workflowSteps; let i = index"
                 [class.done]="stepIndex > i" [class.current]="stepIndex === i">
              <span class="bullet">{{ stepIndex > i ? '✓' : i + 1 }}</span>
              <span class="step-label">{{ t(statusKey(s)) }}</span>
            </div>
          </div>
          <ng-template #cancelledBanner>
            <div class="cancelled-banner"><mat-icon>cancel</mat-icon> {{ t('reservation_cancelled_banner') }}</div>
          </ng-template>

          <div class="status-actions" *ngIf="nextStatuses.length">
            <span class="hint">{{ t('next_step') }}</span>
            <button mat-raised-button *ngFor="let next of nextStatuses"
                    [color]="next === 'cancelled' ? 'warn' : 'primary'"
                    [disabled]="updating"
                    (click)="changeStatus(next)">
              <mat-icon>{{ actionIcon(next) }}</mat-icon> {{ t('action_' + next.replace('-', '_')) }}
            </button>
            <span class="hint" *ngIf="startsLater">{{ t('auto_start_hint') }}</span>
          </div>
        </mat-card-content>
      </mat-card>

      <div class="grid">
        <mat-card>
          <mat-card-content>
            <h3>{{ t('dates_times') }}</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">{{ t('arrival') }}</span>
                <span class="value">{{ r.startDate | date:'dd/MM/yyyy' }} · {{ r.checkInTime }}</span>
              </div>
              <div class="info-item">
                <span class="label">{{ t('departure') }}</span>
                <span class="value">{{ r.endDate | date:'dd/MM/yyyy' }} · {{ r.checkOutTime }}</span>
              </div>
              <div class="info-item">
                <span class="label">{{ t('days_count') }}</span>
                <span class="value">{{ days }}</span>
              </div>
            </div>

            <mat-divider></mat-divider>
            <h3>{{ t('client_information') }}</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">{{ t('name_label') }}</span>
                <span class="value">{{ r.clientName }}</span>
              </div>
              <div class="info-item">
                <span class="label">{{ t('client_phone_label') }}</span>
                <a class="value link ltr" *ngIf="r.clientPhone; else dash" [href]="'tel:+216' + r.clientPhone">+216 {{ r.clientPhone }}</a>
              </div>
            </div>

            <mat-divider></mat-divider>
            <h3>{{ t('property_details') }}</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">{{ t('property_label') }}</span>
                <a class="value link" [routerLink]="['/properties', r.propertyId]">{{ r.property?.title || '#' + r.propertyId }}</a>
              </div>
              <div class="info-item" *ngIf="r.samsar">
                <span class="label">{{ t('booked_by') }}</span>
                <span class="value">{{ r.samsar.name }}<span class="muted" *ngIf="r.samsarId === currentUserId"> ({{ t('you') }})</span></span>
              </div>
            </div>

            <div *ngIf="r.notes">
              <mat-divider></mat-divider>
              <h3>{{ t('notes_label') }}</h3>
              <p class="notes">{{ r.notes }}</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-content>
            <h3>{{ t('financial_details') }}</h3>
            <div class="money">
              <div><span>{{ t('total_amount_label') }}</span><strong class="total">{{ r.totalAmount | number:'1.0-0' }} TND</strong></div>
              <div><span>{{ t('advance_paid') }}</span><strong>{{ r.advanceAmount | number:'1.0-0' }} TND</strong></div>
              <div class="balance"><span>{{ t('balance_due') }}</span><strong>{{ r.totalAmount - r.advanceAmount | number:'1.0-0' }} TND</strong></div>
            </div>
            <div class="meta">
              <span>{{ t('created_label') }} {{ r.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
              <span>{{ t('updated_label') }} {{ r.updatedAt | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>

    <ng-template #dash><span class="value">-</span></ng-template>
  `,
  styles: [`
    .grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(260px, 1fr); gap: 1.25rem; align-items: start; }
    h3 { margin: 1rem 0 0.25rem; font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); }
    .link { color: var(--primary); text-decoration: none; }
    .muted { color: var(--text-secondary); font-weight: 400; }
    .notes { white-space: pre-line; margin: 0.5rem 0 0; }

    .workflow { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .step { display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 120px; color: var(--text-secondary); }
    .step:not(:last-child)::after { content: ''; flex: 1; height: 2px; background: var(--border-color); min-width: 16px; }
    .step.done:not(:last-child)::after { background: var(--status-in-progress); }
    .bullet {
      width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.8rem; font-weight: 700; background: var(--surface-subtle); border: 2px solid var(--border-color); flex-shrink: 0;
    }
    .step.done .bullet { background: var(--status-in-progress); border-color: var(--status-in-progress); color: #fff; }
    .step.current { color: var(--text-primary); font-weight: 700; }
    .step.current .bullet { border-color: var(--primary); color: var(--primary); }
    .step-label { font-size: 0.85rem; white-space: nowrap; }
    .cancelled-banner {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 10px;
      background: var(--status-cancelled-bg); color: var(--status-cancelled); font-weight: 600;
    }
    .status-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-color); }
    .hint { font-size: 0.85rem; color: var(--text-secondary); }

    .money { display: grid; gap: 0.6rem; margin: 0.75rem 0; }
    .money > div { display: flex; justify-content: space-between; align-items: baseline; }
    .money span { color: var(--text-secondary); font-size: 0.9rem; }
    .money .total { font-size: 1.4rem; color: var(--status-in-progress); }
    .money .balance { border-top: 1px solid var(--border-color); padding-top: 0.6rem; }
    .meta { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.75rem; color: var(--text-secondary); margin-top: 1rem; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  `]
})
export class ReservationDetailComponent implements OnInit {
  reservation?: Reservation;
  loading = true;
  updating = false;
  currentUserId?: number;
  readonly workflowSteps: ReservationStatus[] = RESERVATION_STATUSES.filter(s => s !== 'cancelled');
  readonly statusKey = statusKey;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reservationService: ReservationService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private uiPrefs: UiPreferencesService,
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUser()?.id;
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadReservation(+id);
    }
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  get status(): ReservationStatus {
    return normalizeReservationStatus(this.reservation?.status) as ReservationStatus;
  }

  get stepIndex(): number {
    return this.workflowSteps.indexOf(this.status);
  }

  /** The stay can only start on the arrival day (it also starts automatically that day). */
  get startsLater(): boolean {
    return this.status === 'confirmed' && !!this.reservation && this.reservation.startDate > todayIso();
  }

  get nextStatuses(): ReservationStatus[] {
    return (STATUS_TRANSITIONS[this.status] ?? []).filter(s => !(s === 'in-progress' && this.startsLater));
  }

  get editable(): boolean {
    return this.status !== 'completed' && this.status !== 'cancelled';
  }

  get days(): number {
    return this.reservation ? countReservationDays(this.reservation.startDate, this.reservation.endDate) : 0;
  }

  actionIcon(status: ReservationStatus): string {
    return { 'confirmed': 'check_circle', 'in-progress': 'login', 'completed': 'task_alt', 'cancelled': 'cancel', 'pending': 'hourglass_top' }[status];
  }

  private loadReservation(id: number): void {
    this.reservationService.findOne(id).subscribe({
      next: (reservation) => {
        this.reservation = reservation;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open(this.t('reservation_failed_load'), this.t('close'), { duration: 3000 });
        this.router.navigate(['/reservations']);
      },
    });
  }

  deleteReservation(): void {
    if (!confirm(this.t('reservation_delete_confirm'))) return;
    this.reservationService.remove(this.reservation!.id).subscribe({
      next: () => {
        this.snackBar.open(this.t('reservation_deleted'), this.t('close'), { duration: 3000 });
        this.router.navigate(['/reservations']);
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || this.t('error_generic'), this.t('close'), { duration: 5000 });
      },
    });
  }

  changeStatus(status: ReservationStatus): void {
    if (status === 'cancelled' && !confirm(this.t('reservation_cancel_confirm'))) return;
    this.updating = true;
    this.reservationService.updateStatus(this.reservation!.id, status).subscribe({
      next: (updated) => {
        this.reservation = updated;
        this.updating = false;
        const message = this.t('reservation_status_changed').replace('{{status}}', this.t(statusKey(status)));
        this.snackBar.open(message, this.t('close'), { duration: 2500 });
      },
      error: (err) => {
        this.updating = false;
        this.snackBar.open(err.error?.message || this.t('reservation_update_failed'), this.t('close'), { duration: 3000 });
      },
    });
  }
}
