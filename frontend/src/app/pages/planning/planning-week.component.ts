import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Planning, PlanningStay } from '../../models/reservation.model';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { t } from '../../shared/translations';
import { getWeekdayLabels, todayIso } from '../../shared/calendar-utils';
import { PlanningHouse, addDays, byImportance, covers, daysBetween, weekdayIndex } from './planning-utils';

interface Entry { stay: PlanningStay; house: PlanningHouse; kind: 'arrival' | 'departure' | 'stay'; time?: string }
interface Day { iso: string; weekday: string; day: number; today: boolean; weekend: boolean; entries: Entry[] }

/** One week, day by day: who arrives and leaves at what time, and who is staying. */
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
        <a *ngFor="let entry of day.entries" [routerLink]="['/reservations', entry.stay.id]"
           [class]="'entry ' + entry.kind + ' ' + entry.stay.status" [style.--house]="entry.house.color">
          <span class="when" *ngIf="entry.kind !== 'stay'">
            {{ entry.kind === 'arrival' ? '↘' : '↗' }} {{ entry.time }} · {{ t(entry.kind === 'arrival' ? 'arrival' : 'departure') }}
          </span>
          <strong>{{ entry.stay.clientName }}</strong>
          <span class="house">{{ entry.house.title }}</span>
        </a>
      </section>
    </div>
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
    .entry {
      display: flex; flex-direction: column; gap: 1px; padding: 0.4rem 0.5rem; border-radius: 6px; text-decoration: none; color: var(--text-primary);
      background: color-mix(in srgb, var(--house) 12%, transparent); border-inline-start: 3px solid var(--house); font-size: 0.78rem; min-width: 0;
    }
    .entry:hover { background: color-mix(in srgb, var(--house) 22%, transparent); }
    .entry.stay { background: transparent; border: 1px solid color-mix(in srgb, var(--house) 35%, transparent); border-inline-start: 3px solid var(--house); }
    .entry.pending { background: transparent; border: 1px dashed var(--house); }
    .entry strong { overflow-wrap: anywhere; line-height: 1.2; }
    .entry .house { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .when { font-size: 0.68rem; font-weight: 700; color: var(--house); font-variant-numeric: tabular-nums; }
    .house { font-size: 0.7rem; color: var(--text-secondary); }
    @media (max-width: 900px) {
      .week { grid-template-columns: 1fr; }
      .day { min-height: 0; border-inline-start: 0; border-top: 1px solid var(--border-color); }
      header { flex-direction: row; justify-content: flex-start; gap: 0.75rem; }
      .num { width: 34px; height: 34px; font-size: 1.3rem; }
      .empty { display: none; }
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
    const stays = [...this.planning.stays].filter(s => houses.has(s.propertyId)).sort(byImportance);
    this.days = daysBetween(this.monday, addDays(this.monday, 6)).map(iso => {
      const entries: Entry[] = [];
      for (const stay of stays.filter(s => covers(s, iso))) {
        const house = houses.get(stay.propertyId)!;
        if (stay.startDate === iso) entries.push({ stay, house, kind: 'arrival', time: stay.checkInTime });
        if (stay.endDate === iso) entries.push({ stay, house, kind: 'departure', time: stay.checkOutTime });
        if (stay.startDate !== iso && stay.endDate !== iso) entries.push({ stay, house, kind: 'stay' });
      }
      // The day reads in time order: departures in the morning, then arrivals, then the stays going on
      const rank = (e: Entry) => (e.kind === 'stay' ? '99:99' : e.time ?? '');
      entries.sort((a, b) => rank(a).localeCompare(rank(b)));
      return { iso, weekday: labels[weekdayIndex(iso)], day: Number(iso.slice(8)), today: iso === today, weekend: weekdayIndex(iso) >= 5, entries };
    });
  }
}
