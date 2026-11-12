import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Planning, PlanningStay, statusKey } from '../../models/reservation.model';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { t } from '../../shared/translations';
import { getWeekdayLabels, todayIso } from '../../shared/calendar-utils';
import { PlanningHouse, addDays, byImportance, covers, daysBetween, shortDate, startOfWeek, weekdayIndex } from './planning-utils';

interface Chip { stay: PlanningStay; house: PlanningHouse; label: boolean; starts: boolean; ends: boolean }
/** chips: one place per lane of the week, null where that lane is free on this day. */
interface Cell { iso: string; day: number; inMonth: boolean; today: boolean; weekend: boolean; chips: (Chip | null)[]; more: number; blocked: PlanningHouse[] }

const SHOWN = 3;

/** The month as on a wall calendar: each stay a chip in the color of its house, its name on its first day of the week. */
@Component({
  selector: 'app-planning-month',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTooltipModule],
  template: `
    <div class="month" role="grid">
      <div class="weekdays" role="row">
        <span *ngFor="let label of weekdays" role="columnheader">{{ label }}</span>
      </div>
      <div class="week" role="row" *ngFor="let week of weeks">
        <div *ngFor="let cell of week" role="gridcell" class="cell"
             [class.out]="!cell.inMonth" [class.weekend]="cell.weekend" [class.today]="cell.today">
          <div class="cell-head">
            <span class="num">{{ cell.day }}</span>
            <span class="today-label" *ngIf="cell.today">{{ t('today') }}</span>
          </div>
          <ng-container *ngFor="let chip of cell.chips">
            <a *ngIf="chip; else lane" [routerLink]="['/reservations', chip.stay.id]"
               [class]="'chip ' + chip.stay.status" [class.starts]="chip.starts" [class.ends]="chip.ends"
               [style.--house]="chip.house.color" [matTooltip]="tooltip(chip)">
              <span *ngIf="chip.label">{{ chip.starts ? '↘ ' : '' }}{{ chip.stay.clientName }}</span>
              <span *ngIf="!chip.label" class="continued" aria-hidden="true"></span>
            </a>
          </ng-container>
          <span class="more" *ngIf="cell.more">+{{ cell.more }}</span>
          <span class="blocked" *ngFor="let house of cell.blocked" [style.--house]="house.color" [matTooltip]="house.title">{{ t('planning_blocked') }}</span>
        </div>
      </div>
    </div>
    <ng-template #lane><span class="lane" aria-hidden="true"></span></ng-template>
  `,
  styles: [`
    .lane { display: block; min-height: 20px; }
    .month { border-top: 2px solid var(--text-primary); margin-top: 0.5rem; }
    .weekdays, .week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
    .weekdays span { padding: 0.5rem 0.6rem; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-secondary); }
    .cell { min-height: 104px; padding: 0.4rem 0.4rem 0.5rem; border-top: 1px solid var(--border-color); border-inline-start: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .cell:first-child { border-inline-start: 0; }
    .cell.weekend { background: var(--weekend); }
    .cell.out .num { color: var(--text-secondary); opacity: 0.45; }
    .cell.out .chip { opacity: 0.45; }
    .cell-head { display: flex; align-items: center; justify-content: space-between; gap: 0.25rem; min-height: 26px; }
    .num { font-weight: 700; font-size: 0.95rem; padding-inline-start: 0.2rem; }
    .today .num { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 26px; border: 2px solid var(--accent-gold); border-radius: 50%; padding: 0; }
    .today-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--accent-gold); }
    .chip {
      display: block; min-height: 20px; padding: 2px 6px; font-size: 0.74rem; font-weight: 600; line-height: 16px;
      color: var(--text-primary); text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      background: color-mix(in srgb, var(--house) 14%, transparent); border-inline-start: 3px solid var(--house); border-radius: 4px;
    }
    .chip:hover { background: color-mix(in srgb, var(--house) 24%, transparent); }
    .chip:not(.starts) { border-inline-start-color: transparent; border-start-start-radius: 0; border-end-start-radius: 0; margin-inline-start: -0.4rem; padding-inline-start: calc(0.4rem + 6px); }
    .chip:not(.ends) { border-start-end-radius: 0; border-end-end-radius: 0; margin-inline-end: -0.4rem; }
    .chip.pending { background: transparent; outline: 1px dashed var(--house); outline-offset: -1px; color: var(--text-secondary); }
    .chip.completed { color: var(--text-secondary); text-decoration: line-through; background: var(--surface-subtle); border-inline-start-color: var(--border-color); }
    .continued { display: block; height: 16px; }
    .more { font-size: 0.72rem; color: var(--text-secondary); padding-inline-start: 0.3rem; }
    .blocked {
      font-size: 0.68rem; padding: 1px 6px; border-radius: 4px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      background: repeating-linear-gradient(45deg, var(--surface-subtle) 0 4px, color-mix(in srgb, var(--house) 18%, transparent) 4px 8px);
    }
    @media (max-width: 700px) {
      .cell { min-height: 72px; padding: 0.25rem; }
      .chip { font-size: 0.65rem; padding: 1px 3px; }
      .today-label { display: none; }
      .weekdays span { padding: 0.4rem 0.25rem; font-size: 0.6rem; }
    }
  `]
})
export class PlanningMonthComponent implements OnChanges {
  @Input({ required: true }) planning!: Planning;
  @Input({ required: true }) houses: PlanningHouse[] = [];
  /** yyyy-MM shown */
  @Input({ required: true }) month!: string;

  weeks: Cell[][] = [];
  weekdays: string[] = [];

  constructor(private uiPrefs: UiPreferencesService) {}

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  tooltip(chip: Chip): string {
    return `${chip.stay.clientName} · ${chip.house.title} · ${shortDate(chip.stay.startDate)} → ${shortDate(chip.stay.endDate)} · ${this.t(statusKey(chip.stay.status))}`;
  }

  ngOnChanges(): void {
    this.weekdays = getWeekdayLabels(this.uiPrefs.getLanguage());
    const [year, month] = this.month.split('-').map(Number);
    const first = `${this.month}-01`;
    const last = `${this.month}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
    const today = todayIso();
    const houses = new Map(this.houses.map(h => [h.id, h]));
    const stays = [...this.planning.stays].sort(byImportance);
    const blocked = new Map<string, PlanningHouse[]>();
    for (const b of this.planning.blocked) {
      const house = houses.get(b.propertyId);
      if (house) blocked.set(b.date, [...(blocked.get(b.date) ?? []), house]);
    }

    this.weeks = [];
    for (let monday = startOfWeek(first); monday <= last; monday = addDays(monday, 7)) {
      const days = daysBetween(monday, addDays(monday, 6));
      const lanes = this.lanes(stays.filter(s => houses.has(s.propertyId) && s.endDate >= days[0] && s.startDate <= days[6]), days);
      const used = Math.min(SHOWN, lanes.reduce((max, lane) => Math.max(max, lane.lane + 1), 0));
      this.weeks.push(days.map(iso => {
        const chips: (Chip | null)[] = Array.from({ length: used }, () => null);
        let more = 0;
        for (const { stay, lane } of lanes.filter(l => covers(l.stay, iso))) {
          if (lane >= SHOWN) {
            more++;
            continue;
          }
          const starts = stay.startDate === iso;
          chips[lane] = {
            stay, house: houses.get(stay.propertyId)!, starts, ends: stay.endDate === iso,
            // The name shows where the bar begins on each row: its first day, or Monday when it goes on from last week
            label: starts || weekdayIndex(iso) === 0,
          };
        }
        // Lanes free at the end of the day take no room
        while (chips.length && chips[chips.length - 1] === null) chips.pop();
        return {
          iso, day: Number(iso.slice(8)), inMonth: iso >= first && iso <= last, today: iso === today,
          weekend: weekdayIndex(iso) >= 5, chips, more, blocked: blocked.get(iso) ?? [],
        };
      }));
    }
  }

  /** Each stay of the week keeps one line from its first to its last day: the first line free on all of them. */
  private lanes(stays: PlanningStay[], days: string[]): { stay: PlanningStay; lane: number }[] {
    const ends: number[] = [];
    return [...stays]
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || byImportance(a, b))
      .map(stay => {
        const start = Math.max(0, days.indexOf(stay.startDate));
        const end = stay.endDate > days[6] ? 6 : days.indexOf(stay.endDate);
        let lane = ends.findIndex(last => last < start);
        if (lane < 0) lane = ends.length;
        ends[lane] = end;
        return { stay, lane };
      });
  }
}
