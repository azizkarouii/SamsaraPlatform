import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Planning, PlanningStay, statusKey } from '../../models/reservation.model';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { t } from '../../shared/translations';
import { getShortMonthLabel, getWeekdayLabels, todayIso } from '../../shared/calendar-utils';
import { PlanningHouse, addDays, byImportance, daysBetween, shortDate, weekdayIndex } from './planning-utils';

interface Column { iso: string; letter: string; day: number; today: boolean; weekend: boolean; month?: string }
interface Bar { stay: PlanningStay; start: number; end: number; clippedStart: boolean; clippedEnd: boolean }
interface Group { house: PlanningHouse; occupancy: number; pending: number; bars: Bar[]; blocked: number[] }

/** House by house over two or four weeks: a group per house with its occupancy, a row per stay. */
@Component({
  selector: 'app-planning-gantt',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTooltipModule],
  template: `
    <div class="scroller">
      <div class="gantt" [style.--days]="columns.length">
        <div class="row head">
          <div class="label"></div>
          <div class="col" *ngFor="let col of columns" [class.weekend]="col.weekend" [class.today]="col.today">
            <span class="month" *ngIf="col.month">{{ col.month }}</span>
            <span class="letter">{{ col.letter }}</span>
            <span class="num">{{ col.day }}</span>
          </div>
        </div>

        <div class="body">
          <div class="shade" aria-hidden="true">
            <span *ngFor="let col of columns" [class.weekend]="col.weekend" [class.today]="col.today"></span>
          </div>

          <p class="empty" *ngIf="!groups.length">{{ t('planning_no_houses') }}</p>
          <ng-container *ngFor="let group of groups">
            <div class="row group" [style.--house]="group.house.color">
              <div class="label">
                <a class="house" [routerLink]="['/properties', group.house.id]"><i class="swatch"></i>{{ group.house.title }}</a>
                <span class="progress"><i [style.width.%]="group.occupancy"></i></span>
                <span class="stats">{{ group.occupancy }} %<ng-container *ngIf="group.pending"> · <b>{{ group.pending }} {{ t('planning_to_confirm_short') }}</b></ng-container></span>
              </div>
              <div class="track">
                <span class="summary"></span>
                <span *ngFor="let day of group.blocked" class="blocked" [style.grid-column]="(day + 1) + ' / span 1'" [matTooltip]="t('planning_blocked')"></span>
              </div>
            </div>
            <div class="row stay" *ngFor="let bar of group.bars" [style.--house]="group.house.color">
              <div class="label">
                <a [routerLink]="['/reservations', bar.stay.id]" class="client">{{ bar.stay.clientName }}</a>
                <span class="dates" [class.pending]="bar.stay.status === 'pending'">
                  {{ short(bar.stay.startDate) }} → {{ short(bar.stay.endDate) }} · {{ t(statusKey(bar.stay.status)) }}
                </span>
              </div>
              <div class="track">
                <a class="bar" [routerLink]="['/reservations', bar.stay.id]" [class]="'bar ' + bar.stay.status"
                   [class.clip-start]="bar.clippedStart" [class.clip-end]="bar.clippedEnd"
                   [style.grid-column]="(bar.start + 1) + ' / ' + (bar.end + 2)" [matTooltip]="tooltip(bar)">
                  <span *ngIf="bar.end > bar.start">{{ bar.stay.checkInTime }} → {{ bar.stay.checkOutTime }}</span>
                </a>
              </div>
            </div>
            <div class="row" *ngIf="!group.bars.length && !group.blocked.length">
              <div class="label"><span class="dates">{{ t('planning_free_period') }}</span></div>
              <div class="track"></div>
            </div>
          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .scroller { overflow-x: auto; margin-top: 0.5rem; }
    .gantt { --label: 230px; min-width: calc(var(--label) + var(--days) * 34px); }
    .row { display: grid; grid-template-columns: var(--label) 1fr; min-height: 46px; }
    .row.head { border-bottom: 2px solid var(--text-primary); min-height: 0; }
    .head .col { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 0.35rem 0; font-size: 0.68rem; color: var(--text-secondary); }
    .head { grid-template-columns: var(--label) repeat(var(--days), minmax(0, 1fr)); }
    .head .month { align-self: flex-start; padding-inline-start: 4px; font-weight: 700; color: var(--text-primary); white-space: nowrap; }
    .head .col:not(:has(.month)) { padding-top: calc(0.35rem + 15px); }
    .head .letter { text-transform: uppercase; font-weight: 600; }
    .head .num { font-weight: 700; font-size: 0.8rem; color: var(--text-primary); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
    .head .today .num { background: var(--primary-strong); color: #fff; border-radius: 50%; }

    .body { position: relative; }
    .shade { position: absolute; inset-block: 0; inset-inline-start: var(--label); inset-inline-end: 0; display: grid; grid-template-columns: repeat(var(--days), minmax(0, 1fr)); pointer-events: none; }
    .shade span { border-inline-start: 1px solid var(--border-color); }
    .shade .weekend { background: var(--weekend); }
    .shade .today { background: var(--accent-gold-soft); }
    .empty { padding: 1rem; color: var(--text-secondary); }

    .label { padding: 0.45rem 0.75rem 0.45rem 0; display: flex; flex-direction: column; justify-content: center; gap: 3px; min-width: 0; position: sticky; inset-inline-start: 0; z-index: 2; background: var(--bg-card); }
    .track { position: relative; display: grid; grid-template-columns: repeat(var(--days), minmax(0, 1fr)); align-items: center; }
    .group { border-top: 1px solid var(--border-color); }
    .group .house { display: flex; align-items: center; gap: 0.45rem; font-weight: 700; color: var(--text-primary); text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .group .house:hover { color: var(--primary); }
    .swatch { width: 10px; height: 10px; border-radius: 3px; background: var(--house); flex-shrink: 0; }
    .progress { display: block; width: 90px; height: 4px; border-radius: 2px; background: var(--border-color); overflow: hidden; }
    .progress i { display: block; height: 100%; background: var(--house); }
    .stats { font-size: 0.72rem; color: var(--text-secondary); }
    .stats b { color: var(--note-text); font-weight: 600; }
    .summary { grid-column: 1 / -1; grid-row: 1; height: 2px; background: color-mix(in srgb, var(--house) 40%, transparent); }
    .blocked { grid-row: 1; height: 22px; margin: 0 2px; border-radius: 4px; background: repeating-linear-gradient(45deg, var(--surface-subtle) 0 4px, color-mix(in srgb, var(--house) 30%, transparent) 4px 8px); }
    .stay .label { padding-inline-start: 1.05rem; }
    .client { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .client:hover { color: var(--primary); }
    .dates { font-size: 0.72rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dates.pending { color: var(--note-text); }
    .bar {
      grid-row: 1; height: 22px; margin: 0 2px; border-radius: 6px; display: flex; align-items: center; padding: 0 8px; overflow: hidden;
      background: color-mix(in srgb, var(--house) 22%, var(--bg-card)); border: 1px solid color-mix(in srgb, var(--house) 55%, transparent);
      color: var(--text-primary); font-size: 0.68rem; font-weight: 600; text-decoration: none; white-space: nowrap; position: relative; z-index: 1;
    }
    .bar:hover { background: color-mix(in srgb, var(--house) 35%, var(--bg-card)); }
    .bar.in-progress { background: var(--house); color: #fff; border-color: var(--house); }
    .bar.pending { background: var(--note-bg); border: 1px dashed var(--note-text); color: var(--note-text); }
    .bar.completed { background: var(--surface-subtle); border-color: var(--border-color); color: var(--text-secondary); }
    .bar.clip-start { border-start-start-radius: 0; border-end-start-radius: 0; margin-inline-start: 0; }
    .bar.clip-end { border-start-end-radius: 0; border-end-end-radius: 0; margin-inline-end: 0; }
    @media (max-width: 700px) { .gantt { --label: 150px; } .progress { width: 60px; } }
  `]
})
export class PlanningGanttComponent implements OnChanges {
  @Input({ required: true }) planning!: Planning;
  @Input({ required: true }) houses: PlanningHouse[] = [];
  @Input({ required: true }) from!: string;
  @Input() dayCount = 14;

  readonly statusKey = statusKey;
  columns: Column[] = [];
  groups: Group[] = [];

  constructor(private uiPrefs: UiPreferencesService) {}

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  short(iso: string): string {
    return shortDate(iso);
  }

  tooltip(bar: Bar): string {
    return `${bar.stay.clientName} · ${shortDate(bar.stay.startDate)} ${bar.stay.checkInTime} → ${shortDate(bar.stay.endDate)} ${bar.stay.checkOutTime}`;
  }

  ngOnChanges(): void {
    const language = this.uiPrefs.getLanguage();
    const letters = getWeekdayLabels(language);
    const today = todayIso();
    const days = daysBetween(this.from, addDays(this.from, this.dayCount - 1));
    const last = days[days.length - 1];
    this.columns = days.map((iso, i) => ({
      iso, letter: letters[weekdayIndex(iso)], day: Number(iso.slice(8)), today: iso === today, weekend: weekdayIndex(iso) >= 5,
      month: i === 0 || iso.endsWith('-01') ? getShortMonthLabel(Number(iso.slice(5, 7)) - 1, language) : undefined,
    }));
    const index = (iso: string) => days.indexOf(iso);

    this.groups = this.houses.map(house => {
      const stays = this.planning.stays.filter(s => s.propertyId === house.id && s.endDate >= this.from && s.startDate <= last)
        .sort((a, b) => a.startDate.localeCompare(b.startDate) || byImportance(a, b));
      const bars = stays.map(stay => ({
        stay,
        start: stay.startDate < this.from ? 0 : index(stay.startDate),
        end: stay.endDate > last ? days.length - 1 : index(stay.endDate),
        clippedStart: stay.startDate < this.from,
        clippedEnd: stay.endDate > last,
      }));
      const booked = new Set<string>();
      for (const stay of stays.filter(s => s.status !== 'pending')) {
        for (const iso of days) if (stay.startDate <= iso && iso <= stay.endDate) booked.add(iso);
      }
      return {
        house, bars,
        occupancy: Math.round(booked.size * 100 / days.length),
        pending: stays.filter(s => s.status === 'pending').length,
        blocked: this.planning.blocked.filter(b => b.propertyId === house.id).map(b => index(b.date)).filter(i => i >= 0),
      };
    });
  }
}
