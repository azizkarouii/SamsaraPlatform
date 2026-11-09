import { Component, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReservationService } from '../../services/reservation.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { Planning, statusKey } from '../../models/reservation.model';
import { t } from '../../shared/translations';
import { formatIsoDate, getMonthLabel, getWeekdayLabels, todayIso } from '../../shared/calendar-utils';

type Stay = Planning['stays'][number];

/** Consecutive days of one house with the same content: a booking, a blocked day or free days. */
interface Segment {
  kind: 'stay' | 'blocked' | 'free';
  span: number;
  stay?: Stay;
}

interface Row {
  id: number;
  title: string;
  occupancy: number;
  segments: Segment[];
}

/** Confirmed and running stays hold the dates: they win over pending requests on the same day. */
const PRIORITY: Record<string, number> = { 'in-progress': 0, confirmed: 1, completed: 2, pending: 3 };

/** Every house of the user over one month: who is where, what is free, what the owner blocked. */
@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ t('planning') }}</h1>
          <p class="subtitle">{{ t('planning_subtitle') }}</p>
        </div>
        <div class="month-nav">
          <button mat-icon-button (click)="shift(-1)" [attr.aria-label]="t('previous')"><mat-icon class="flip-rtl">chevron_left</mat-icon></button>
          <strong class="month">{{ monthLabel }}</strong>
          <button mat-icon-button (click)="shift(1)" [attr.aria-label]="t('next')"><mat-icon class="flip-rtl">chevron_right</mat-icon></button>
          <button mat-stroked-button (click)="goToday()">{{ t('today') }}</button>
        </div>
      </div>

      <mat-card>
        <mat-card-content>
          <div class="legend">
            <span *ngFor="let s of legend"><i [class]="'swatch ' + s"></i>{{ t(statusKey(s)) }}</span>
            <span><i class="swatch blocked"></i>{{ t('planning_blocked') }}</span>
            <span><i class="swatch free"></i>{{ t('planning_free') }}</span>
          </div>

          <div *ngIf="loading" class="loading-container"><mat-spinner diameter="36"></mat-spinner></div>
          <p class="empty" *ngIf="!loading && !rows.length">{{ t('planning_no_houses') }}</p>

          <div class="scroller" *ngIf="!loading && rows.length">
            <table>
              <thead>
                <tr>
                  <th class="house">{{ t('property_label') }}</th>
                  <th *ngFor="let day of days" class="day" [class.weekend]="day.weekend" [class.today]="day.iso === today">
                    <span>{{ day.weekday }}</span><strong>{{ day.number }}</strong>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of rows">
                  <th class="house" scope="row">
                    <a [routerLink]="['/properties', row.id]">{{ row.title }}</a>
                    <span [matTooltip]="t('planning_occupancy')">{{ row.occupancy }} %</span>
                  </th>
                  <ng-container *ngFor="let segment of row.segments">
                    <td *ngIf="segment.kind === 'stay'" [attr.colspan]="segment.span" class="stay-cell">
                      <a [class]="'stay ' + segment.stay!.status" [routerLink]="['/reservations', segment.stay!.id]"
                         [matTooltip]="tooltip(segment.stay!)">{{ segment.stay!.clientName }}</a>
                    </td>
                    <td *ngIf="segment.kind === 'blocked'" [attr.colspan]="segment.span"><span class="blocked-day"></span></td>
                    <td *ngIf="segment.kind === 'free'" [attr.colspan]="segment.span" class="free-cell"></td>
                  </ng-container>
                </tr>
              </tbody>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .month-nav { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem; }
    .month { min-width: 7.5rem; text-align: center; font-size: 1.05rem; }
    .legend { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem; }
    .legend span { display: inline-flex; align-items: center; gap: 0.35rem; }
    .swatch { width: 14px; height: 14px; border-radius: 4px; display: inline-block; }
    .swatch.pending { background: var(--status-pending); }
    .swatch.confirmed { background: var(--status-confirmed); }
    .swatch.in-progress { background: var(--status-in-progress); }
    .swatch.completed { background: var(--status-completed); }
    .swatch.blocked, .blocked-day { background: repeating-linear-gradient(45deg, var(--border-color) 0 4px, transparent 4px 8px); border: 1px solid var(--border-color); }
    .swatch.free { background: var(--surface-subtle); border: 1px solid var(--border-color); }
    .empty { color: var(--text-secondary); }

    .scroller { overflow-x: auto; }
    table { border-collapse: separate; border-spacing: 0; width: 100%; table-layout: fixed; min-width: calc(150px + 31 * 26px); }
    th, td { padding: 0; height: 40px; border-bottom: 1px solid var(--border-color); }
    th.house {
      position: sticky; inset-inline-start: 0; z-index: 1; width: 150px; background: var(--bg-card);
      text-align: start; padding: 0 0.75rem; font-weight: 600; border-inline-end: 1px solid var(--border-color);
    }
    tbody th.house { display: table-cell; }
    th.house a { display: block; color: inherit; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    th.house a:hover { color: var(--primary); }
    th.house span { display: block; font-size: 0.7rem; font-weight: 400; color: var(--text-secondary); }
    th.day { width: 26px; font-size: 0.7rem; font-weight: 400; color: var(--text-secondary); text-align: center; }
    th.day span, th.day strong { display: block; line-height: 1.2; }
    th.day strong { font-size: 0.8rem; color: var(--text-primary); }
    th.day.weekend { background: var(--surface-subtle); }
    th.day.today strong { color: #fff; background: var(--primary); border-radius: 50%; width: 22px; height: 22px; line-height: 22px; margin: 0 auto; }
    .free-cell { background: transparent; }
    .stay-cell { padding: 4px 1px; }
    .stay {
      display: block; height: 30px; line-height: 30px; padding: 0 6px; border-radius: 8px; color: #fff; font-size: 0.75rem;
      font-weight: 600; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .stay.pending { background: var(--status-pending); }
    .stay.confirmed { background: var(--status-confirmed); }
    .stay.in-progress { background: var(--status-in-progress); }
    .stay.completed { background: var(--status-completed); }
    .blocked-day { display: block; height: 30px; margin: 4px 1px; border-radius: 6px; }
  `]
})
export class PlanningComponent implements OnInit {
  readonly statusKey = statusKey;
  readonly legend = ['pending', 'confirmed', 'in-progress', 'completed'];
  readonly today = todayIso();
  loading = true;
  month = this.today.slice(0, 7);
  days: { iso: string; number: number; weekday: string; weekend: boolean }[] = [];
  rows: Row[] = [];

  constructor(private reservationService: ReservationService, private uiPrefs: UiPreferencesService, private host: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.load();
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  get monthLabel(): string {
    const [year, month] = this.month.split('-').map(Number);
    return `${getMonthLabel(month - 1, this.uiPrefs.getLanguage())} ${year}`;
  }

  shift(step: number): void {
    const [year, month] = this.month.split('-').map(Number);
    this.month = formatIsoDate(new Date(year, month - 1 + step, 1)).slice(0, 7);
    this.load();
  }

  goToday(): void {
    this.month = this.today.slice(0, 7);
    this.load();
  }

  tooltip(stay: Stay): string {
    const day = (iso: string) => iso.split('-').reverse().join('/');
    return `${stay.clientName} · ${day(stay.startDate)} → ${day(stay.endDate)} · ${this.t(statusKey(stay.status))}`;
  }

  private load(): void {
    this.loading = true;
    this.reservationService.planning(this.month).subscribe({
      next: (planning) => {
        this.build(planning);
        this.loading = false;
        setTimeout(() => this.showToday());
      },
      error: () => this.loading = false,
    });
  }

  /** On a narrow screen the month scrolls sideways: start on today rather than on the 1st. */
  private showToday(): void {
    const scroller = this.host.nativeElement.querySelector<HTMLElement>('.scroller');
    const today = scroller?.querySelector<HTMLElement>('th.today');
    const house = scroller?.querySelector<HTMLElement>('th.house');
    if (!scroller || !today || !house || scroller.scrollWidth <= scroller.clientWidth) return;
    const rtl = document.documentElement.dir === 'rtl';
    const offset = rtl
      ? scroller.getBoundingClientRect().right - today.getBoundingClientRect().right - house.offsetWidth
      : today.getBoundingClientRect().left - scroller.getBoundingClientRect().left - house.offsetWidth;
    scroller.scrollLeft += (rtl ? -1 : 1) * Math.max(0, offset - 2 * today.offsetWidth);
  }

  private build(planning: Planning): void {
    const [year, month] = this.month.split('-').map(Number);
    const count = new Date(year, month, 0).getDate();
    const labels = getWeekdayLabels(this.uiPrefs.getLanguage());
    this.days = Array.from({ length: count }, (_, i) => {
      const date = new Date(year, month - 1, i + 1);
      const weekday = (date.getDay() + 6) % 7;
      return { iso: formatIsoDate(date), number: i + 1, weekday: labels[weekday], weekend: weekday >= 5 };
    });

    this.rows = planning.houses.map(house => {
      const stays = planning.stays
        .filter(stay => stay.propertyId === house.id)
        .sort((a, b) => (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9));
      const blocked = new Set(planning.blocked.filter(b => b.propertyId === house.id).map(b => b.date));
      const cells = this.days.map(day => {
        const stay = stays.find(s => s.startDate <= day.iso && day.iso <= s.endDate);
        if (stay) return { kind: 'stay' as const, stay };
        return { kind: blocked.has(day.iso) ? 'blocked' as const : 'free' as const };
      });

      const segments: Segment[] = [];
      for (const cell of cells) {
        const last = segments[segments.length - 1];
        // Free days merge; a booking spans its days; each blocked day stays its own cell
        if (last && last.kind === cell.kind && cell.kind !== 'blocked' && last.stay?.id === cell.stay?.id) {
          last.span++;
        } else {
          segments.push({ kind: cell.kind, span: 1, stay: cell.stay });
        }
      }
      const booked = cells.filter(c => c.kind === 'stay' && c.stay!.status !== 'pending').length;
      return { id: house.id, title: house.title, occupancy: Math.round(booked * 100 / count), segments };
    });
  }
}
