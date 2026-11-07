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
  ownerReceived,
  ownerShareOf,
  ReservationEvent,
  ReservationPayment,
  samsarReceived,
  statusKey,
} from '../../../models/reservation.model';
import { t } from '../../../shared/translations';
import { formatIsoDate, parseIsoDate, todayIso } from '../../../shared/calendar-utils';

import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
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
          <button mat-stroked-button color="warn" *ngIf="canManage" (click)="deleteReservation()">
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
          <p class="read-only" *ngIf="!canManage"><mat-icon inline>visibility</mat-icon> {{ t('reservation_read_only') }}</p>
          <ng-template #cancelledBanner>
            <div class="cancelled-banner"><mat-icon>cancel</mat-icon> {{ t('reservation_cancelled_banner') }}</div>
          </ng-template>

          <div class="status-actions" *ngIf="canManage && nextStatuses.length">
            <span class="hint">{{ t('next_step') }}</span>
            <button mat-raised-button *ngFor="let next of nextStatuses"
                    [color]="next === 'cancelled' ? 'warn' : 'primary'"
                    [disabled]="updating"
                    (click)="changeStatus(next)">
              <mat-icon>{{ actionIcon(next) }}</mat-icon> {{ t('action_' + next.replace('-', '_')) }}
            </button>
            <span class="hint" *ngIf="startsLater">{{ t('auto_start_hint') }}</span>
          </div>

          <div class="status-actions" *ngIf="canEndEarly || canRefund">
            <span class="hint">{{ t('stay_changes') }}</span>
            <button mat-stroked-button *ngIf="canEndEarly" (click)="openPanel('early')"><mat-icon>event_busy</mat-icon> {{ t('end_early') }}</button>
            <button mat-stroked-button *ngIf="canRefund" (click)="openPanel('refund')"><mat-icon>undo</mat-icon> {{ t('give_money_back') }}</button>
          </div>

          <form class="stay-panel" *ngIf="panel === 'early'" (ngSubmit)="submitEarlyEnd()">
            <p>{{ t('end_early_explained') }}</p>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ t('new_end_date') }}</mat-label>
              <input matInput type="date" name="earlyEndDate" required [min]="r.startDate" [max]="latestEarlyEnd" [(ngModel)]="earlyEndDate" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" *ngIf="maxRefund > 0">
              <mat-label>{{ t('money_given_back_optional') }}</mat-label>
              <input matInput type="number" name="earlyRefund" min="0" [max]="maxRefund" [(ngModel)]="refundInput" />
              <span matTextSuffix>TND</span>
            </mat-form-field>
            <div class="panel-actions">
              <button mat-button type="button" (click)="panel = null">{{ t('cancel') }}</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="updating || !earlyEndDate">{{ t('confirm_end_early') }}</button>
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
              <button mat-raised-button color="primary" type="submit" [disabled]="updating">{{ t('save_changes') }}</button>
            </div>
          </form>
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
              <div class="info-item" *ngIf="r.originalEndDate">
                <span class="label">{{ t('planned_end') }}</span>
                <span class="value">{{ r.originalEndDate | date:'dd/MM/yyyy' }}</span>
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
              <div *ngIf="r.negotiatedPricePerDay"><span>{{ t('negotiated_price') }}</span><strong>{{ r.negotiatedPricePerDay | number:'1.0-2' }} TND</strong></div>
              <div><span>{{ t('advance_paid') }}</span><strong>{{ r.advanceAmount | number:'1.0-0' }} TND</strong></div>
              <div class="balance"><span>{{ t('balance_due') }}</span><strong>{{ r.totalAmount - r.advanceAmount | number:'1.0-0' }} TND</strong></div>
              <ng-container *ngIf="showsShares">
                <div><span>{{ r.samsarId === currentUserId ? t('your_gain') : t('samsar_gain') }}<ng-container *ngIf="r.samsarCommissionPercent"> ({{ r.samsarCommissionPercent }} %)</ng-container></span><strong>{{ r.samsarGain || 0 | number:'1.0-2' }} TND</strong></div>
                <div><span>{{ t('owner_share') }}</span><strong>{{ ownerShare | number:'1.0-2' }} TND</strong></div>
              </ng-container>
              <div><span>{{ t('paid_so_far') }}</span><strong>{{ paid | number:'1.0-2' }} TND</strong></div>
              <div class="balance" *ngIf="remaining > 0 && status !== 'cancelled'"><span>{{ t('still_to_pay') }}</span><strong>{{ remaining | number:'1.0-2' }} TND</strong></div>
              <div *ngIf="r.refundAmount"><span>{{ t('refund_by_owner') }}</span><strong>- {{ r.refundAmount | number:'1.0-2' }} TND</strong></div>
              <div *ngIf="r.samsarRefundAmount"><span>{{ t('refund_by_samsar') }}</span><strong>- {{ r.samsarRefundAmount | number:'1.0-2' }} TND</strong></div>
            </div>
            <div class="meta">
              <span>{{ t('created_label') }} {{ r.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
              <span>{{ t('updated_label') }} {{ r.updatedAt | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card *ngIf="canManage">
          <mat-card-content>
            <div class="card-head">
              <h3>{{ t('payments') }}</h3>
              <button mat-stroked-button *ngIf="canAddPayment && !addingPayment" (click)="openPayment()">
                <mat-icon>add</mat-icon> {{ t('record_payment') }}
              </button>
            </div>
            <p class="hint" *ngIf="!payments.length">{{ t('no_payment_yet') }}</p>
            <ul class="payments" *ngIf="payments.length">
              <li *ngFor="let payment of payments">
                <div>
                  <strong>{{ payment.amount | number:'1.0-2' }} TND</strong>
                  <span>{{ payment.paidOn | date:'dd/MM/yyyy' }} · {{ payment.kind === 'advance' ? t('advance_paid') : (payment.note || t('payment')) }}</span>
                </div>
                <button mat-icon-button *ngIf="payment.kind !== 'advance'" (click)="removePayment(payment)"
                        [attr.aria-label]="t('delete_payment')" [matTooltip]="t('delete_payment')">
                  <mat-icon>delete</mat-icon>
                </button>
              </li>
            </ul>
            <form class="stay-panel" *ngIf="addingPayment" (ngSubmit)="submitPayment()">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>{{ t('amount') }}</mat-label>
                <input matInput type="number" name="paymentAmount" min="0" [max]="remaining" required [(ngModel)]="paymentAmount" />
                <span matTextSuffix>TND</span>
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>{{ t('payment_date') }}</mat-label>
                <input matInput type="date" name="paymentDate" [max]="today" [(ngModel)]="paymentDate" />
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>{{ t('payment_note') }}</mat-label>
                <input matInput name="paymentNote" maxlength="500" [(ngModel)]="paymentNote" />
              </mat-form-field>
              <div class="panel-actions">
                <button mat-button type="button" (click)="addingPayment = false">{{ t('cancel') }}</button>
                <button mat-raised-button color="primary" type="submit" [disabled]="updating || !paymentAmount">{{ t('save_changes') }}</button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <mat-card *ngIf="canManage && history.length">
          <mat-card-content>
            <h3>{{ t('history') }}</h3>
            <ol class="history">
              <li *ngFor="let event of history">
                <span class="when">{{ event.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                <span>{{ describe(event) }}</span>
              </li>
            </ol>
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
    .card-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    .payments, .history { list-style: none; margin: 0.5rem 0 0; padding: 0; display: grid; gap: 0.4rem; }
    .payments li { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border-color); }
    .payments li div { display: flex; flex-direction: column; }
    .payments li span, .history .when { font-size: 0.8rem; color: var(--text-secondary); }
    .history li { display: flex; flex-direction: column; font-size: 0.85rem; }
    .hint { font-size: 0.82rem; color: var(--text-secondary); }
    .stay-panel { display: grid; gap: 0.75rem; max-width: 420px; margin-top: 1rem; padding: 1rem; border-radius: 12px; background: var(--surface-subtle); }
    .stay-panel p { margin: 0; font-size: 0.85rem; color: var(--text-secondary); }
    .panel-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }

    .workflow { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .step { display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 120px; color: var(--text-secondary); }
    .step:not(:last-child)::after { content: ''; flex: 1; height: 2px; background: var(--border-color); min-width: 16px; }
    .step.done:not(:last-child)::after { background: var(--status-in-progress); }
    .bullet {
      width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.8rem; font-weight: 700; background: var(--surface-subtle); border: 2px solid var(--border-color); flex-shrink: 0;
    }
    .read-only { display: flex; align-items: center; gap: 0.4rem; margin: 0.75rem 0 0; font-size: 0.85rem; color: var(--text-secondary); }
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
  panel: 'early' | 'refund' | null = null;
  payments: ReservationPayment[] = [];
  history: ReservationEvent[] = [];
  addingPayment = false;
  paymentAmount: number | null = null;
  paymentDate = '';
  paymentNote = '';
  readonly today = todayIso();
  earlyEndDate = '';
  refundInput: number | null = null;
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

  /** Only the samsar who booked it and the owner of the house manage a reservation; other samsars just read it. */
  get canManage(): boolean {
    const r = this.reservation;
    return !!r && (r.samsarId === this.currentUserId || r.property?.createdBy === this.currentUserId);
  }

  /** Split of the money, for the booking samsar and the owner; pointless on the owner's own bookings. */
  get showsShares(): boolean {
    const r = this.reservation;
    return this.canManage && !!r && r.samsarGain != null && r.samsarId !== r.property?.createdBy;
  }

  get ownerShare(): number {
    return this.reservation ? ownerShareOf(this.reservation) : 0;
  }

  get isHouseOwner(): boolean {
    return !!this.reservation && this.reservation.property?.createdBy === this.currentUserId;
  }

  /** A one-day stay cannot end sooner. */
  get canEndEarly(): boolean {
    const r = this.reservation;
    return this.canManage && this.status === 'in-progress' && !!r && r.startDate < r.endDate;
  }

  /** Most the caller can give back, from his own part; the server enforces the same limits. */
  /** Most the caller can give back: what he has received himself. The server enforces the same limits. */
  get maxRefund(): number {
    const r = this.reservation;
    if (!r) return 0;
    return this.isHouseOwner ? ownerReceived(r, this.paid) : samsarReceived(r, this.paid);
  }

  get paid(): number {
    return this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  }

  get remaining(): number {
    return Math.max(0, (this.reservation?.totalAmount || 0) - this.paid);
  }

  get canAddPayment(): boolean {
    return this.remaining > 0 && this.status !== 'pending';
  }

  openPayment(): void {
    this.paymentAmount = this.remaining;
    this.paymentDate = this.today;
    this.paymentNote = '';
    this.addingPayment = true;
  }

  submitPayment(): void {
    this.updating = true;
    this.reservationService.addPayment(this.reservation!.id, {
      amount: Number(this.paymentAmount),
      paidOn: this.paymentDate || undefined,
      note: this.paymentNote || undefined,
    }).subscribe({
      next: () => {
        this.updating = false;
        this.addingPayment = false;
        this.loadMoney();
        this.snackBar.open(this.t('payment_recorded'), this.t('close'), { duration: 2500 });
      },
      error: (err) => {
        this.updating = false;
        this.snackBar.open(err.error?.message || this.t('error_generic'), this.t('close'), { duration: 4000 });
      },
    });
  }

  removePayment(payment: ReservationPayment): void {
    if (!confirm(this.t('delete_payment_confirm'))) return;
    this.reservationService.removePayment(this.reservation!.id, payment.id).subscribe({
      next: () => this.loadMoney(),
      error: (err) => this.snackBar.open(err.error?.message || this.t('error_generic'), this.t('close'), { duration: 4000 }),
    });
  }

  /** Payments and history are only shown to the samsar of the booking and the owner of the house. */
  private loadMoney(): void {
    if (!this.reservation || !this.canManage) return;
    this.reservationService.findPayments(this.reservation.id).subscribe(payments => this.payments = payments);
    this.reservationService.findHistory(this.reservation.id).subscribe(history => this.history = history);
  }

  /** One line of the history, in the reader's language. */
  describe(event: ReservationEvent): string {
    let details: Record<string, unknown> = {};
    try {
      details = JSON.parse(event.details || '{}');
    } catch {
      details = {};
    }
    const who = event.actorName || this.t('history_system');
    const status = (value: unknown) => this.t(statusKey(String(value)));
    const amount = (value: unknown) => `${Number(value || 0).toLocaleString(this.locale)} TND`;
    const date = (value: unknown) => String(value || '').split('-').reverse().join('/');
    const text = this.t('history_' + event.action)
      .replace('{{actor}}', who)
      .replace('{{to}}', status(details['to']))
      .replace('{{from}}', status(details['from']))
      .replace('{{amount}}', amount(details['amount']))
      .replace('{{total}}', amount(details['total']))
      .replace('{{newEnd}}', date(details['to']))
      .replace('{{plannedEnd}}', date(details['from']));
    return text.startsWith('history_') ? `${who} — ${event.action}` : text;
  }

  private get locale(): string {
    return { fr: 'fr-FR', en: 'en-GB', ar: 'ar-TN' }[this.uiPrefs.getLanguage()] ?? 'fr-FR';
  }

  /** Always voluntary, once money has really been received by the one giving it back. */
  get canRefund(): boolean {
    return this.canManage && this.maxRefund > 0 && ['in-progress', 'cancelled'].includes(this.status);
  }

  get refundExplanationKey(): string {
    if (!this.isHouseOwner) return 'give_back_samsar';
    return this.status === 'cancelled' ? 'give_back_cancelled' : 'give_back_owner';
  }

  get latestEarlyEnd(): string {
    const dayBefore = parseIsoDate(this.reservation!.endDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    return formatIsoDate(dayBefore);
  }

  openPanel(panel: 'early' | 'refund'): void {
    this.panel = panel;
    this.refundInput = (this.isHouseOwner ? this.reservation?.refundAmount : this.reservation?.samsarRefundAmount) ?? null;
    if (panel === 'early') {
      const today = todayIso();
      this.earlyEndDate = today < this.latestEarlyEnd ? today : this.latestEarlyEnd;
      this.refundInput = null;
    }
  }

  submitEarlyEnd(): void {
    this.applyStayChange(
      this.reservationService.endEarly(this.reservation!.id, this.earlyEndDate, Number(this.refundInput || 0) || undefined),
      this.t('stay_ended_early'),
    );
  }

  submitRefund(): void {
    this.applyStayChange(
      this.reservationService.setRefund(this.reservation!.id, Number(this.refundInput || 0)),
      this.t('refund_saved'),
    );
  }

  private applyStayChange(change: Observable<Reservation>, message: string): void {
    this.updating = true;
    change.subscribe({
      next: (updated) => {
        this.reservation = updated;
        this.updating = false;
        this.panel = null;
        this.loadMoney();
        this.snackBar.open(message, this.t('close'), { duration: 3000 });
      },
      error: (err) => {
        this.updating = false;
        this.snackBar.open(err.error?.message || this.t('reservation_update_failed'), this.t('close'), { duration: 4000 });
      },
    });
  }

  get editable(): boolean {
    return this.canManage && this.status !== 'completed' && this.status !== 'cancelled';
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
        this.loadMoney();
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
    if (status === 'cancelled' && !confirm(this.t(this.status === 'in-progress' ? 'cancel_stay_confirm' : 'reservation_cancel_confirm'))) return;
    this.updating = true;
    this.reservationService.updateStatus(this.reservation!.id, status).subscribe({
      next: (updated) => {
        this.reservation = updated;
        this.updating = false;
        this.loadMoney();
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
