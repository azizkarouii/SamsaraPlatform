import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PlanningOverview, PlanningItem } from '../../models/reservation.model';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { t } from '../../shared/translations';
import { parseIsoDate, todayIso } from '../../shared/calendar-utils';
import { PlanningHouse, shortDate } from './planning-utils';

/** Beside the calendar: the requests to confirm (a note pinned on the desk), today's moves (an envelope), the colors. */
@Component({
  selector: 'app-planning-side',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="side">
      <section class="note">
        <i class="pin" aria-hidden="true"></i>
        <h2><span class="big">{{ overview.toConfirmCount }}</span> {{ t('planning_to_confirm') }}<small>{{ t('planning_to_confirm_hint') }}</small></h2>
        <p class="calm" *ngIf="!overview.toConfirm.length">{{ t('planning_nothing_to_confirm') }}</p>
        <a *ngFor="let item of overview.toConfirm" class="note-item" [routerLink]="['/reservations', item.id]">
          <span class="who">
            <strong>{{ item.clientName }}</strong>
            <span>{{ item.propertyTitle }} · {{ short(item.startDate) }} → {{ short(item.endDate) }}</span>
          </span>
          <span class="in">{{ inDays(item) }}</span>
        </a>
        <a class="note-more" *ngIf="overview.toConfirmCount > overview.toConfirm.length" routerLink="/reservations" [queryParams]="{ tab: 'pending', view: 'table' }">
          {{ t('planning_see_all_requests') }} ({{ overview.toConfirmCount }})
        </a>
      </section>

      <section class="envelope">
        <div class="letter">
          <p class="letter-title">{{ t('today') }}</p>
          <p class="calm" *ngIf="!overview.arrivingToday.length && !overview.leavingToday.length">{{ t('planning_no_move_today') }}</p>
          <a *ngFor="let item of overview.arrivingToday" class="move" [routerLink]="['/reservations', item.id]">
            <span class="arrow in">↘ {{ item.time }}</span><strong>{{ item.clientName }}</strong><span>{{ item.propertyTitle }}</span>
          </a>
          <a *ngFor="let item of overview.leavingToday" class="move" [routerLink]="['/reservations', item.id]">
            <span class="arrow out">↗ {{ item.time }}</span><strong>{{ item.clientName }}</strong><span>{{ item.propertyTitle }}</span>
          </a>
        </div>
        <div class="pocket">
          <p><span class="big">{{ overview.arrivingToday.length }}</span> {{ t('planning_arrivals') }}
             · <span class="big">{{ overview.leavingToday.length }}</span> {{ t('planning_departures') }}</p>
        </div>
      </section>

      <section class="colors" *ngIf="houses.length">
        <header><span>{{ t('planning_colors') }}</span><span>{{ periodLabel }}</span></header>
        <ul>
          <li *ngFor="let house of houses" [style.--house]="house.color">
            <i class="swatch"></i><span class="name">{{ house.title }}</span><span class="count">{{ counts[house.id] || 0 }}</span>
          </li>
        </ul>
      </section>
    </aside>
  `,
  styles: [`
    .side { display: flex; flex-direction: column; gap: 1.5rem; }
    .big { font-family: var(--display-font); font-size: 2rem; font-weight: 700; line-height: 1; }

    .note {
      position: relative; padding: 1.4rem 1.1rem 1rem; background: var(--note-bg); color: var(--note-text);
      border-radius: 4px 4px 14px 4px; box-shadow: var(--shadow-md); transform: rotate(-0.6deg);
    }
    .pin { position: absolute; top: -7px; left: 50%; width: 14px; height: 14px; margin-left: -7px; border-radius: 50%; background: var(--accent-gold); box-shadow: 0 2px 3px rgba(0,0,0,0.25); }
    .note h2 { margin: 0 0 0.75rem; display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.4rem; font-size: 1rem; font-weight: 700; }
    .note h2 small { font-size: 0.75rem; font-weight: 400; opacity: 0.85; }
    .note-item { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.55rem 0; border-top: 1px dashed color-mix(in srgb, var(--note-text) 30%, transparent); color: inherit; text-decoration: none; }
    .note-item:hover strong { text-decoration: underline; }
    .who { display: flex; flex-direction: column; min-width: 0; }
    .who strong { color: var(--text-primary); font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .who span { font-size: 0.72rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .in { font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
    .note-more { display: block; margin-top: 0.5rem; font-size: 0.78rem; color: inherit; }
    .calm { margin: 0.25rem 0; font-size: 0.8rem; color: var(--text-secondary); }

    .envelope { position: relative; padding-top: 0.9rem; }
    .letter { position: relative; z-index: 1; margin: 0 0.6rem; padding: 0.75rem 0.9rem 2.4rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 0.35rem; }
    .letter-title { margin: 0; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); }
    .move { display: grid; grid-template-columns: auto 1fr; column-gap: 0.5rem; font-size: 0.8rem; color: var(--text-primary); text-decoration: none; }
    .move span:last-child { grid-column: 2; font-size: 0.72rem; color: var(--text-secondary); }
    .move strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .arrow { grid-row: span 2; font-weight: 700; font-variant-numeric: tabular-nums; }
    .arrow.in { color: var(--primary); }
    .arrow.out { color: var(--accent-gold); }
    .pocket {
      position: relative; z-index: 2; margin-top: -1.9rem; padding: 1.7rem 1rem 0.9rem; border-radius: 6px 6px 14px 14px;
      background: linear-gradient(170deg, var(--envelope-flap) 0 38%, var(--envelope-bg) 38%);
      clip-path: polygon(0 0, 50% 28%, 100% 0, 100% 100%, 0 100%);
    }
    .pocket p { margin: 0; font-size: 0.85rem; color: var(--note-text); }

    .colors header { display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; }
    .colors ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.45rem; }
    .colors li { display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; }
    .swatch { width: 10px; height: 10px; border-radius: 3px; background: var(--house); flex-shrink: 0; }
    .name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .count { color: var(--text-secondary); font-variant-numeric: tabular-nums; }
  `]
})
export class PlanningSideComponent {
  @Input({ required: true }) overview!: PlanningOverview;
  @Input() houses: PlanningHouse[] = [];
  /** Stays per house in the period shown. */
  @Input() counts: Record<number, number> = {};
  @Input() periodLabel = '';

  constructor(private uiPrefs: UiPreferencesService) {}

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  short(iso: string): string {
    return shortDate(iso);
  }

  /** "in 3 d", "today", "tomorrow". */
  inDays(item: PlanningItem): string {
    const days = Math.round((parseIsoDate(item.startDate).getTime() - parseIsoDate(todayIso()).getTime()) / 86400000);
    if (days <= 0) return this.t('today');
    if (days === 1) return this.t('planning_tomorrow');
    return this.t('planning_in_days').replace('{{n}}', String(days));
  }
}
