import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Planning, PlanningStay } from '../../models/reservation.model';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { t } from '../../shared/translations';
import { getWeekdayLabels, todayIso } from '../../shared/calendar-utils';
import { PlanningHouse, addDays, assignLanes, covers, daysBetween, weekdayIndex } from './planning-utils';

/** A stay on one day: its arrival time, its departure time, or neither while it goes on. */
interface Entry { stay: PlanningStay; house: PlanningHouse; arrival?: string; departure?: string }
/** entries: one place per line of the week, null where that line is free on this day. */
interface Day { iso: string; weekday: string; day: number; today: boolean; weekend: boolean; entries: (Entry | null)[] }

/** One week, day by day: who arrives and leaves at what time, and who is staying, each stay on its own line. */
@Component({
  selector: 'app-planning-week',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="week">
      <section *ngFor="let day of days" class="day" [class.today]="day.today" [class.weekend]="day.weekend">
        <header>
          <span class="weekday">{{ day.weekday }}</span>
          <span class="num">{{ day.day }}</span>
        </header>
        <p class="empty" *ngIf="!day.entries.length">—</p>
        <ng-container *ngFor="let entry of day.entries">
          <a *ngIf="entry; else lane" [routerLink]="['/reservations', entry.stay.id]"
             [class]="'entry ' + entry.stay.status" [class.moving]="entry.arrival || entry.departure" [style.--house]="entry.house.color">
            <span class="when">
              <ng-container *ngIf="entry.arrival">↘ {{ entry.arrival }}<ng-container *ngIf="!entry.departure"> · {{ t('arrival') }}</ng-container></ng-container>
              <ng-container *ngIf="entry.arrival && entry.departure"> </ng-container>
              <ng-container *ngIf="entry.departure">↗ {{ entry.departure }}<ng-container *ngIf="!entry.arrival"> · {{ t('departure') }}</ng-container></ng-container>
            </span>
            <strong>{{ entry.stay.clientName }}</strong>
            <span class="house">{{ entry.house.title }}</span>
          </a>
        </ng-container>
      </section>
    </div>
    <ng-template #lane><span class="lane" aria-hidden="true"></span></ng-template>
  `,
  styles: [`
    .week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); border-top: 2px solid var(--text-primary); margin-top: 0.5rem; }
    .day { min-height: 320px; padding: 0.5rem; border-inline-start: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.4rem; min-width: 0; }
    .day:first-child { border-inline-start: 0; }
    .day.weekend { background: var(--weekend); }
    .day.today { background: var(--accent-gold-soft); }
    header { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--border-color); }
    .weekday { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-secondary); }
    .num { font-family: var(--display-font); font-size: 1.6rem; font-weight: 700; line-height: 1; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
    .today .num { border: 2px solid var(--accent-gold); border-radius: 50%; }
    .empty { margin: 0.5rem 0; text-align: center; color: var(--text-secondary); }
    /* Every place of a line has the same height, so a stay reads straight across the week */
    .entry, .lane { box-sizing: border-box; height: 64px; flex-shrink: 0; }
    .entry {
      display: flex; flex-direction: column; justify-content: center; gap: 1px; padding: 0.3rem 0.5rem; border-radius: 6px; text-decoration: none;
      color: var(--text-primary); font-size: 0.78rem; min-width: 0;
      background: transparent; border: 1px solid color-mix(in srgb, var(--house) 35%, transparent); border-inline-start: 3px solid var(--house);
    }
    .entry.moving { background: color-mix(in srgb, var(--house) 12%, transparent); }
    .entry:hover { background: color-mix(in srgb, var(--house) 22%, transparent); }
    .entry.pending { border-style: dashed; border-inline-start-style: solid; }
    .entry strong, .entry .house { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .when { min-height: 1em; font-size: 0.68rem; font-weight: 700; color: var(--house); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .house { font-size: 0.7rem; color: var(--text-secondary); }
    @media (max-width: 900px) {
      .week { grid-template-columns: 1fr; }
      .day { min-height: 0; border-inline-start: 0; border-top: 1px solid var(--border-color); }
      header { flex-direction: row; justify-content: flex-start; gap: 0.75rem; }
      .num { width: 34px; height: 34px; font-size: 1.3rem; }
      .empty, .lane { display: none; }
      .entry { height: auto; }
    }
  `]
})
export class PlanningWeekComponent implements OnChanges {
  @Input({ required: true }) planning!: Planning;
  @Input({ required: true }) houses: PlanningHouse[] = [];
  /** Monday of the week shown, yyyy-MM-dd */
  @Input({ required: true }) monday!: string;

  days: Day[] = [];

  constructor(private uiPrefs: UiPreferencesService) {}

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  ngOnChanges(): void {
    const labels = getWeekdayLabels(this.uiPrefs.getLanguage());
    const houses = new Map(this.houses.map(h => [h.id, h]));
    const today = todayIso();
    const days = daysBetween(this.monday, addDays(this.monday, 6));
    const lanes = assignLanes(this.planning.stays.filter(s => houses.has(s.propertyId)), days);
    const lineCount = lanes.reduce((max, l) => Math.max(max, l.lane + 1), 0);
    this.days = days.map(iso => {
      const entries: (Entry | null)[] = Array.from({ length: lineCount }, () => null);
      for (const { stay, lane } of lanes.filter(l => covers(l.stay, iso))) {
        entries[lane] = {
          stay, house: houses.get(stay.propertyId)!,
          arrival: stay.startDate === iso ? stay.checkInTime : undefined,
          departure: stay.endDate === iso ? stay.checkOutTime : undefined,
        };
      }
      // Lines free at the end of the day take no room
      while (entries.length && entries[entries.length - 1] === null) entries.pop();
      return { iso, weekday: labels[weekdayIndex(iso)], day: Number(iso.slice(8)), today: iso === today, weekend: weekdayIndex(iso) >= 5, entries };
    });
  }
}
