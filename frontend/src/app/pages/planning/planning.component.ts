import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReservationService } from '../../services/reservation.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { Planning, PlanningOverview } from '../../models/reservation.model';
import { t } from '../../shared/translations';
import { getMonthLabel, getShortMonthLabel, todayIso } from '../../shared/calendar-utils';
import { PlanningHouse, PlanningView, addDays, colorHouses, startOfWeek } from './planning-utils';
import { PlanningOverviewComponent } from './planning-overview.component';
import { PlanningMonthComponent } from './planning-month.component';
import { PlanningWeekComponent } from './planning-week.component';
import { PlanningGanttComponent } from './planning-gantt.component';
import { PlanningSideComponent } from './planning-side.component';

const VIEW_KEY = 'samsara-planning-view';

/**
 * Every house of the user: the year ahead, then a desk calendar (month, week or Gantt),
 * and beside it what needs attention (requests to confirm, today's arrivals and departures).
 */
@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, PlanningOverviewComponent, PlanningMonthComponent,
    PlanningWeekComponent, PlanningGanttComponent, PlanningSideComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div class="title-line">
          <h1>{{ t('planning') }}</h1>
          <p class="stats" *ngIf="overview">
            <span><b>{{ staysShown }}</b> {{ t(view === 'week' ? 'planning_stays_week' : 'planning_stays_period') }}</span>
            <span class="warn" *ngIf="overview.toConfirmCount"><b>{{ overview.toConfirmCount }}</b> {{ t('planning_to_confirm_short') }}</span>
            <span><b>{{ overview.arrivingToday.length }}</b> {{ t('planning_arrivals_today') }}</span>
          </p>
        </div>
      </div>

      <app-planning-overview *ngIf="overview" [overview]="overview"></app-planning-overview>

      <div class="layout">
        <section class="notebook">
          <div class="notebook-head">
            <h2 class="notebook-title">{{ title }}<small>{{ subtitle }}</small></h2>
            <div class="controls">
              <div class="nav segmented">
                <button type="button" (click)="shift(-1)" [attr.aria-label]="t('previous')"><mat-icon class="flip-rtl">chevron_left</mat-icon></button>
                <button type="button" (click)="goToday()">{{ t('today') }}</button>
                <button type="button" (click)="shift(1)" [attr.aria-label]="t('next')"><mat-icon class="flip-rtl">chevron_right</mat-icon></button>
              </div>
              <div class="segmented" role="group">
                <button type="button" [class.active]="view === 'month'" (click)="setView('month')">{{ t('planning_view_month') }}</button>
                <button type="button" [class.active]="view === 'week'" (click)="setView('week')">{{ t('planning_view_week') }}</button>
                <button type="button" [class.active]="view === 'gantt'" (click)="setView('gantt')">Gantt</button>
              </div>
            </div>
          </div>

          <div class="gantt-bar" *ngIf="view === 'gantt'">
            <span><b>{{ staysShown }}</b> {{ t('planning_stays_short') }}<ng-container *ngIf="pendingShown"> · <b class="warn">{{ pendingShown }}</b> {{ t('planning_to_confirm_short') }}</ng-container></span>
            <div class="segmented">
              <button type="button" [class.active]="ganttDays === 14" (click)="setGanttDays(14)">{{ t('planning_two_weeks') }}</button>
              <button type="button" [class.active]="ganttDays === 28" (click)="setGanttDays(28)">{{ t('planning_four_weeks') }}</button>
            </div>
          </div>

          <div *ngIf="loading && !planning" class="loading-container"><mat-spinner diameter="36"></mat-spinner></div>
          <p class="empty" *ngIf="planning && !houses.length">{{ t('planning_no_houses') }}</p>
          <ng-container *ngIf="planning && houses.length">
            <app-planning-month *ngIf="view === 'month'" [planning]="planning" [houses]="houses" [month]="month"></app-planning-month>
            <app-planning-week *ngIf="view === 'week'" [planning]="planning" [houses]="houses" [monday]="from"></app-planning-week>
            <app-planning-gantt *ngIf="view === 'gantt'" [planning]="planning" [houses]="houses" [from]="from" [dayCount]="ganttDays"></app-planning-gantt>
          </ng-container>
        </section>

        <app-planning-side *ngIf="overview" [overview]="overview" [houses]="houses" [counts]="counts" [periodLabel]="periodLabel"></app-planning-side>
      </div>
    </div>
  `,
  styles: [`
    .title-line { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem 1rem; }
    .title-line h1 { font-family: var(--display-font); font-size: 2.2rem; line-height: 1; }
    .stats { display: flex; flex-wrap: wrap; gap: 0.9rem; margin: 0; font-size: 0.85rem; color: var(--text-secondary); }
    .stats b { color: var(--text-primary); }
    .stats .warn b, .stats .warn { color: var(--note-text); }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 1.5rem; align-items: start; margin-top: 0.75rem; }
    .notebook-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 1rem; padding-bottom: 0.75rem; }
    .controls { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .nav button { display: inline-flex; align-items: center; padding-block: 0.3rem; }
    .nav mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .gantt-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.6rem 0; border-top: 1px solid var(--border-color); font-size: 0.85rem; color: var(--text-secondary); }
    .gantt-bar b { color: var(--text-primary); }
    .gantt-bar b.warn { color: var(--note-text); }
    .empty { color: var(--text-secondary); }
    @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } }
  `]
})
export class PlanningComponent implements OnInit {
  view: PlanningView = 'month';
  ganttDays = 14;
  anchor = todayIso();
  from = '';
  to = '';
  loading = true;
  planning?: Planning;
  overview?: PlanningOverview;
  houses: PlanningHouse[] = [];
  counts: Record<number, number> = {};

  constructor(private reservationService: ReservationService, private uiPrefs: UiPreferencesService) {}

  ngOnInit(): void {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === 'month' || saved === 'week' || saved === 'gantt') this.view = saved;
    } catch {
      // No storage (private window): the month view
    }
    this.reservationService.planningOverview().subscribe(overview => this.overview = overview);
    this.load();
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  get month(): string {
    return this.anchor.slice(0, 7);
  }

  get title(): string {
    if (this.view === 'month') return getMonthLabel(Number(this.month.slice(5)) - 1, this.uiPrefs.getLanguage());
    return this.t(this.view === 'week' ? 'planning_week_title' : 'planning_gantt_title');
  }

  get subtitle(): string {
    return this.view === 'month' ? this.month.slice(0, 4) : this.rangeLabel;
  }

  /** "9 nov. → 22 nov." */
  get rangeLabel(): string {
    const language = this.uiPrefs.getLanguage();
    const show = (iso: string) => `${Number(iso.slice(8))} ${getShortMonthLabel(Number(iso.slice(5, 7)) - 1, language)}`;
    return this.from ? `${show(this.from)} → ${show(this.to)}` : '';
  }

  get periodLabel(): string {
    return this.t(this.view === 'month' ? 'planning_this_month' : this.view === 'week' ? 'planning_this_week' : 'planning_these_weeks');
  }

  /** Stays touching the period shown (in the month view: the month itself, not the days of the weeks around it). */
  get staysShown(): number {
    if (!this.planning) return 0;
    const [from, to] = this.view === 'month' ? [`${this.month}-01`, `${this.month}-31`] : [this.from, this.to];
    return this.planning.stays.filter(s => s.endDate >= from && s.startDate <= to).length;
  }

  get pendingShown(): number {
    return this.planning ? this.planning.stays.filter(s => s.status === 'pending' && s.endDate >= this.from && s.startDate <= this.to).length : 0;
  }

  setView(view: PlanningView): void {
    this.view = view;
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      // Not kept: fine
    }
    this.load();
  }

  setGanttDays(days: number): void {
    this.ganttDays = days;
    this.load();
  }

  shift(step: number): void {
    if (this.view === 'month') {
      const [year, month] = this.month.split('-').map(Number);
      const target = new Date(year, month - 1 + step, 1);
      this.anchor = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-01`;
    } else {
      this.anchor = addDays(this.anchor, 7 * step);
    }
    this.load();
  }

  goToday(): void {
    this.anchor = todayIso();
    this.load();
  }

  private load(): void {
    if (this.view === 'month') {
      const [year, month] = this.month.split('-').map(Number);
      const last = `${this.month}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
      this.from = startOfWeek(`${this.month}-01`);
      this.to = addDays(startOfWeek(last), 6);
    } else {
      this.from = startOfWeek(this.anchor);
      this.to = addDays(this.from, (this.view === 'week' ? 7 : this.ganttDays) - 1);
    }
    this.loading = true;
    const from = this.from;
    this.reservationService.planning(this.from, this.to).subscribe({
      next: (planning) => {
        if (from !== this.from) return; // a later navigation already asked for another period
        this.planning = planning;
        this.houses = colorHouses(planning);
        const [start, end] = this.view === 'month' ? [`${this.month}-01`, `${this.month}-31`] : [this.from, this.to];
        this.counts = {};
        for (const stay of planning.stays.filter(s => s.endDate >= start && s.startDate <= end)) {
          this.counts[stay.propertyId] = (this.counts[stay.propertyId] || 0) + 1;
        }
        this.loading = false;
      },
      error: () => this.loading = false,
    });
  }
}
