import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ReservationService } from '../../services/reservation.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { User } from '../../models/auth.model';
import {
  DashboardSummary,
  RentalEarning,
  Reservation,
  RESERVATION_STATUSES,
  normalizeReservationStatus,
  statusKey,
} from '../../models/reservation.model';
import { getShortMonthLabel } from '../../shared/calendar-utils';
import { t } from '../../shared/translations';

interface MonthBucket { key: string; label: string; revenue: number; count: number; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <p class="eyebrow">{{ user?.role === 'PROPRIETAIRE' ? t('owner_role') : t('samsar_role') }}</p>
          <h1>{{ t('hello') }}, {{ user?.name }}</h1>
          <p class="subtitle">{{ t('dashboard_subtitle') }}</p>
        </div>
        <div class="filters">
          <label>
            <span>{{ t('from') }}</span>
            <input type="date" [(ngModel)]="dateFrom" (change)="loadData()" />
          </label>
          <label>
            <span>{{ t('to') }}</span>
            <input type="date" [(ngModel)]="dateTo" (change)="loadData()" />
          </label>
          <button mat-stroked-button (click)="dateFrom = ''; dateTo = ''; loadData()" [disabled]="!dateFrom && !dateTo">{{ t('clear_filter') }}</button>
          <button mat-icon-button (click)="loadData()" [attr.aria-label]="t('refresh')"><mat-icon>refresh</mat-icon></button>
        </div>
      </div>

      <div *ngIf="loading" class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>

      <ng-container *ngIf="!loading">
        <div class="metrics">
          <div class="metric">
            <mat-icon class="metric-icon revenue">payments</mat-icon>
            <div>
              <div class="metric-label">{{ isSamsar ? t('my_gains') : t('total_revenue') }}</div>
              <div class="metric-value">{{ totalRevenue | number:'1.0-0' }} <small>TND</small></div>
              <div class="metric-sub" *ngIf="isSamsar && upcomingGains">{{ t('upcoming_gains') }} : {{ upcomingGains | number:'1.0-2' }} TND</div>
              <div class="metric-sub" *ngIf="!isSamsar && toCollect">{{ t('to_collect') }} : {{ toCollect | number:'1.0-0' }} TND</div>
            </div>
          </div>
          <a class="metric clickable" routerLink="/reservations">
            <mat-icon class="metric-icon bookings">event_available</mat-icon>
            <div>
              <div class="metric-label">{{ t('reservations') }}</div>
              <div class="metric-value">{{ reservationCount }}</div>
            </div>
          </a>
          <a class="metric clickable" routerLink="/reservations" [queryParams]="{ tab: 'pending' }">
            <mat-icon class="metric-icon pending">hourglass_top</mat-icon>
            <div>
              <div class="metric-label">{{ t('pending_reservations') }}</div>
              <div class="metric-value">{{ countByStatus('pending') }}</div>
            </div>
          </a>
          <a class="metric clickable" [routerLink]="user?.role === 'PROPRIETAIRE' ? '/properties' : '/shared-houses'">
            <mat-icon class="metric-icon houses">home_work</mat-icon>
            <div>
              <div class="metric-label">{{ user?.role === 'PROPRIETAIRE' ? t('total_properties') : t('shared_houses') }}</div>
              <div class="metric-value">{{ summary?.propertyCount ?? 0 }}</div>
            </div>
          </a>
        </div>

        <div class="grid-2">
          <mat-card>
            <mat-card-header><mat-card-title>{{ isSamsar ? t('gains_trend') : t('revenue_trend') }}</mat-card-title></mat-card-header>
            <mat-card-content>
              <div *ngIf="months.length; else noData" class="columns">
                <div class="column" *ngFor="let m of months" [title]="(m.revenue | number:'1.0-0') + ' TND'">
                  <span class="column-value">{{ m.revenue ? (m.revenue | number:'1.0-0') : '' }}</span>
                  <div class="column-track"><div class="column-fill" [style.height.%]="(m.revenue / maxMonthRevenue) * 100"></div></div>
                  <span class="column-label">{{ m.label }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header><mat-card-title>{{ t('status_breakdown') }}</mat-card-title></mat-card-header>
            <mat-card-content>
              <div *ngIf="reservationCount; else noData">
                <div class="stacked">
                  <div *ngFor="let s of statuses" class="stacked-part" [ngClass]="'bg-' + s"
                       [style.width.%]="(countByStatus(s) / reservationCount) * 100"></div>
                </div>
                <ul class="legend">
                  <li *ngFor="let s of statuses">
                    <span class="status-chip" [ngClass]="'status-' + s">{{ t(statusKey(s)) }}</span>
                    <strong>{{ countByStatus(s) }}</strong>
                  </li>
                </ul>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <div class="grid-2">
          <mat-card>
            <mat-card-header><mat-card-title>{{ isSamsar ? t('gains_by_property') : t('revenue_by_property') }}</mat-card-title></mat-card-header>
            <mat-card-content>
              <div *ngIf="revenueByProperty.length; else noData" class="bars">
                <div class="bar" *ngFor="let item of revenueByProperty">
                  <span class="bar-label" [title]="item.title">{{ item.title }}</span>
                  <div class="bar-track"><div class="bar-fill" [style.width.%]="(item.amount / maxPropertyRevenue) * 100"></div></div>
                  <span class="bar-value">{{ item.amount | number:'1.0-0' }} TND</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header>
              <mat-card-title>{{ t('upcoming_arrivals') }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div *ngIf="upcoming.length; else noUpcoming" class="upcoming">
                <a class="upcoming-item" *ngFor="let r of upcoming" [routerLink]="['/reservations', r.id]">
                  <div class="date-box">
                    <strong>{{ r.startDate | date:'dd' }}</strong>
                    <span>{{ monthShort(r.startDate) }}</span>
                  </div>
                  <div class="upcoming-body">
                    <strong>{{ r.clientName }}</strong>
                    <span>{{ r.property?.title }} · {{ r.startDate | date:'dd/MM' }} → {{ r.endDate | date:'dd/MM' }}</span>
                  </div>
                  <span class="status-chip" [ngClass]="'status-' + normalize(r.status)">{{ t(statusKey(r.status)) }}</span>
                </a>
              </div>
              <ng-template #noUpcoming><div class="empty-state small">{{ t('no_upcoming') }}</div></ng-template>
            </mat-card-content>
          </mat-card>
        </div>

        <mat-card *ngIf="isSamsar">
          <mat-card-header><mat-card-title>{{ t('gains_by_rental') }}</mat-card-title></mat-card-header>
          <mat-card-content>
            <div *ngIf="gainsByRental.length; else noData" class="rentals">
              <a class="rental" *ngFor="let r of gainsByRental" [routerLink]="['/reservations', r.id]">
                <div class="rental-body">
                  <strong>{{ r.propertyTitle }}</strong>
                  <span>{{ r.clientName }} · {{ r.startDate | date:'dd/MM/yyyy' }} → {{ r.endDate | date:'dd/MM/yyyy' }}</span>
                </div>
                <span class="status-chip" [ngClass]="'status-' + normalize(r.status)">{{ t(statusKey(r.status)) }}</span>
                <div class="rental-money">
                  <strong>{{ r.earned | number:'1.0-2' }} TND</strong>
                  <span>{{ t('paid') }} {{ r.paid | number:'1.0-0' }} / {{ r.total | number:'1.0-0' }} TND</span>
                </div>
              </a>
            </div>
          </mat-card-content>
        </mat-card>

        <div class="quick-actions">
          <a mat-raised-button color="primary" routerLink="/reservations/add"><mat-icon>add</mat-icon> {{ t('reservation_new_title') }}</a>
          <a mat-stroked-button routerLink="/availability"><mat-icon>event</mat-icon> {{ t('search_available_houses') }}</a>
          <a *ngIf="user?.role === 'PROPRIETAIRE'" mat-stroked-button routerLink="/properties/add"><mat-icon>add_home</mat-icon> {{ t('add_property') }}</a>
        </div>
      </ng-container>

      <ng-template #noData><div class="empty-state small">{{ t('no_data_period') }}</div></ng-template>
    </div>
  `,
  styles: [`
    .filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.5rem; }
    .filters label { display: flex; flex-direction: column; font-size: 0.72rem; color: var(--text-secondary); gap: 2px; }
    .filters input {
      border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 10px;
      font: inherit; font-size: 0.85rem; background: var(--bg-card); color: var(--text-primary);
    }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; }
    .metric {
      display: flex; align-items: center; gap: 1rem; padding: 1.1rem 1.25rem; border-radius: 14px;
      background: var(--bg-card); border: 1px solid var(--border-color); color: inherit; text-decoration: none;
    }
    .metric.clickable:hover { border-color: var(--primary); }
    .metric-icon { width: 48px; height: 48px; font-size: 26px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .metric-icon.revenue { background: var(--status-in-progress-bg); color: var(--status-in-progress); }
    .metric-icon.bookings { background: var(--status-confirmed-bg); color: var(--status-confirmed); }
    .metric-icon.pending { background: var(--status-pending-bg); color: var(--status-pending); }
    .metric-icon.houses { background: var(--primary-soft); color: var(--primary); }
    .metric-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); }
    .metric-value { font-size: 1.6rem; font-weight: 700; }
    .metric-sub { font-size: 0.75rem; color: var(--text-secondary); }
    .metric-value small { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }

    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 1.25rem; }
    mat-card-title { font-size: 1rem !important; font-weight: 600; }
    mat-card-content { padding-top: 0.75rem !important; }

    .columns { display: flex; align-items: flex-end; gap: 6px; height: 200px; overflow-x: auto; padding-top: 1rem; }
    .column { flex: 1; min-width: 34px; display: flex; flex-direction: column; align-items: center; height: 100%; gap: 4px; }
    .column-value { font-size: 0.65rem; color: var(--text-secondary); min-height: 1em; }
    .column-track { flex: 1; width: 100%; max-width: 36px; display: flex; align-items: flex-end; background: var(--surface-subtle); border-radius: 6px 6px 0 0; }
    .column-fill { width: 100%; background: var(--primary); border-radius: 6px 6px 0 0; min-height: 2px; transition: height 0.4s ease; }
    .column-label { font-size: 0.7rem; color: var(--text-secondary); white-space: nowrap; }

    .stacked { display: flex; height: 14px; border-radius: 7px; overflow: hidden; background: var(--surface-subtle); margin: 0.5rem 0 1rem; }
    .stacked-part { height: 100%; transition: width 0.4s ease; }
    .bg-pending { background: var(--status-pending); }
    .bg-confirmed { background: var(--status-confirmed); }
    .bg-in-progress { background: var(--status-in-progress); }
    .bg-completed { background: var(--status-completed); }
    .bg-cancelled { background: var(--status-cancelled); }
    .legend { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
    .legend li { display: flex; align-items: center; justify-content: space-between; }

    .bars { display: grid; gap: 0.6rem; }
    .bar { display: grid; grid-template-columns: minmax(80px, 140px) 1fr auto; align-items: center; gap: 0.6rem; }
    .bar-label { font-size: 0.82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar-track { height: 12px; background: var(--surface-subtle); border-radius: 6px; overflow: hidden; }
    .bar-fill { height: 100%; background: var(--status-in-progress); border-radius: 6px; min-width: 2px; }
    .bar-value { font-size: 0.8rem; font-weight: 600; white-space: nowrap; }

    .upcoming { display: grid; gap: 0.5rem; }
    .upcoming-item {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; border-radius: 10px;
      color: inherit; text-decoration: none;
    }
    .upcoming-item:hover { background: var(--surface-hover); }
    .date-box {
      width: 44px; flex-shrink: 0; text-align: center; border-radius: 10px; padding: 4px 0;
      background: var(--primary-soft); color: var(--primary); display: flex; flex-direction: column; line-height: 1.1;
    }
    .date-box strong { font-size: 1.1rem; }
    .date-box span { font-size: 0.65rem; text-transform: uppercase; }
    .upcoming-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .upcoming-body span { font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .empty-state.small { padding: 1.5rem; }
    .rentals { display: grid; gap: 0.25rem; max-height: 340px; overflow-y: auto; }
    .rental { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; padding: 0.5rem; border-radius: 10px; color: inherit; text-decoration: none; }
    .rental:hover { background: var(--surface-hover); }
    .rental-body { flex: 1; min-width: 180px; display: flex; flex-direction: column; }
    .rental-body span, .rental-money span { font-size: 0.8rem; color: var(--text-secondary); }
    .rental-money { display: flex; flex-direction: column; align-items: flex-end; font-variant-numeric: tabular-nums; }
    .quick-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
  `]
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  summary?: DashboardSummary;
  loading = false;
  dateFrom = '';
  dateTo = '';
  readonly statuses = RESERVATION_STATUSES;
  readonly statusKey = statusKey;
  readonly normalize = normalizeReservationStatus;
  private request?: Subscription;

  constructor(
    private authService: AuthService,
    private reservationService: ReservationService,
    private uiPrefs: UiPreferencesService,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.loadData();
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  get isSamsar(): boolean {
    return this.user?.role === 'SAMSAR';
  }

  /** The server computes every figure from the payments received; a newer request replaces one in flight. */
  loadData(): void {
    this.loading = !this.summary;
    this.request?.unsubscribe();
    this.request = this.reservationService.summary(this.dateFrom || undefined, this.dateTo || undefined).subscribe({
      next: (summary) => {
        this.summary = summary;
        this.loading = false;
      },
      error: () => this.loading = false,
    });
  }

  get totalRevenue(): number {
    return this.summary?.earned ?? 0;
  }

  get upcomingGains(): number {
    return this.summary?.upcoming ?? 0;
  }

  get toCollect(): number {
    return this.summary?.toCollect ?? 0;
  }

  get reservationCount(): number {
    return this.summary?.reservationCount ?? 0;
  }

  countByStatus(status: string): number {
    return this.summary?.counts[status] ?? 0;
  }

  get months(): MonthBucket[] {
    return (this.summary?.months ?? []).map(month => {
      const [year, monthNumber] = month.key.split('-').map(Number);
      return {
        key: month.key,
        label: `${getShortMonthLabel(monthNumber - 1, this.uiPrefs.getLanguage())} ${String(year).slice(2)}`,
        revenue: month.amount,
        count: month.count,
      };
    });
  }

  get maxMonthRevenue(): number {
    return Math.max(...this.months.map(m => m.revenue), 1);
  }

  get revenueByProperty(): { title: string; amount: number }[] {
    return this.summary?.byProperty ?? [];
  }

  get maxPropertyRevenue(): number {
    return Math.max(...this.revenueByProperty.map(i => i.amount), 1);
  }

  get gainsByRental(): RentalEarning[] {
    return this.summary?.rentals ?? [];
  }

  get upcoming(): Reservation[] {
    return this.summary?.arrivals ?? [];
  }

  monthShort(date: string): string {
    return getShortMonthLabel(Number(date.slice(5, 7)) - 1, this.uiPrefs.getLanguage());
  }
}
