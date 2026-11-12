import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { ReservationService } from '../../../services/reservation.service';
import { UiPreferencesService } from '../../../services/ui-preferences.service';
import { Reservation, ReservationPage, statusKey } from '../../../models/reservation.model';
import { t } from '../../../shared/translations';
import { parseIsoDate, todayIso } from '../../../shared/calendar-utils';

/** total: of every card of the column, only known when they are all loaded. */
interface Column { status: string; hint: string; total: number | null; count: number; cards: Reservation[] }

/** Upcoming first where it matters (requests, bookings, stays), latest first for what is over. */
const COLUMNS: { status: string; hint: string; direction: 'asc' | 'desc' }[] = [
  { status: 'pending', hint: 'kanban_pending_hint', direction: 'asc' },
  { status: 'confirmed', hint: 'kanban_confirmed_hint', direction: 'asc' },
  { status: 'in-progress', hint: 'kanban_in_progress_hint', direction: 'asc' },
  { status: 'completed', hint: 'kanban_completed_hint', direction: 'desc' },
  { status: 'cancelled', hint: 'kanban_cancelled_hint', direction: 'desc' },
];
const PER_COLUMN = 30;

/** The bookings as a board, one column per step of the workflow. */
@Component({
  selector: 'app-reservation-kanban',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="board">
      <section *ngFor="let column of columns" class="column" [class]="'column ' + column.status">
        <header>
          <div class="top">
            <span class="name"><i class="dot"></i>{{ t(statusKey(column.status)) }}</span>
            <span class="count">{{ column.count }}</span>
          </div>
          <div class="sub">
            <span>{{ t(column.hint) }}</span>
            <span *ngIf="column.total !== null">{{ column.total | number:'1.0-0' }} TND</span>
          </div>
        </header>
        <div class="cards">
          <p class="empty" *ngIf="!column.cards.length">—</p>
          <a *ngFor="let res of column.cards" class="card" [routerLink]="['/reservations', res.id]">
            <div class="card-top">
              <span class="house">{{ res.property?.title || '#' + res.propertyId }}</span>
              <span class="when">{{ when(res) }}</span>
            </div>
            <strong class="client">{{ res.clientName }}</strong>
            <div class="card-bottom">
              <span class="amount">{{ res.totalAmount | number:'1.0-0' }} <small>TND</small></span>
              <span class="dates">{{ res.startDate | date:'dd/MM' }} → {{ res.endDate | date:'dd/MM' }}</span>
            </div>
            <span class="by" *ngIf="res.samsar && res.samsarId !== currentUserId">{{ t('by') }} {{ res.samsar.name }}</span>
          </a>
          <button type="button" class="more" *ngIf="column.count > column.cards.length" (click)="showAll.emit(column.status)">
            + {{ column.count - column.cards.length }}
          </button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .board { display: grid; grid-template-columns: repeat(5, minmax(200px, 1fr)); gap: 0.9rem; overflow-x: auto; padding-bottom: 0.5rem; }
    .column { display: flex; flex-direction: column; min-width: 0; background: var(--surface-subtle); border-radius: 14px; padding: 0.75rem; }
    .column.pending { --tone: var(--status-pending); }
    .column.confirmed { --tone: var(--status-confirmed); }
    .column.in-progress { --tone: var(--status-in-progress); }
    .column.completed { --tone: var(--status-completed); }
    .column.cancelled { --tone: var(--status-cancelled); }
    header { padding: 0 0.25rem 0.6rem; }
    .top { display: flex; align-items: baseline; justify-content: space-between; }
    .name { display: inline-flex; align-items: center; gap: 0.45rem; font-weight: 700; }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--tone); }
    .count { font-family: var(--display-font); font-size: 1.6rem; font-weight: 700; line-height: 1; }
    .sub { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.75rem; color: var(--text-secondary); }
    .cards { display: flex; flex-direction: column; gap: 0.55rem; max-height: 640px; overflow-y: auto; }
    .empty { text-align: center; color: var(--text-secondary); margin: 1rem 0; }
    .card {
      display: flex; flex-direction: column; gap: 0.3rem; padding: 0.7rem 0.8rem; background: var(--bg-card); color: var(--text-primary);
      border: 1px solid var(--border-color); border-radius: 10px; text-decoration: none; box-shadow: var(--shadow-sm);
      transition: border-color 0.12s ease, transform 0.12s ease;
    }
    .card:hover { border-color: var(--tone); transform: translateY(-1px); }
    .card-top, .card-bottom { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
    .house { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .when { font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 6px; background: var(--surface-subtle); white-space: nowrap; }
    .client { font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .amount { font-weight: 700; font-variant-numeric: tabular-nums; }
    .amount small { font-size: 0.7rem; color: var(--text-secondary); font-weight: 600; }
    .dates, .by { font-size: 0.72rem; color: var(--text-secondary); }
    .more { border: 0; background: transparent; font: inherit; cursor: pointer; text-align: center; font-size: 0.8rem; color: var(--primary); padding: 0.25rem; }
  `]
})
export class ReservationKanbanComponent implements OnChanges, OnDestroy {
  @Input() search = '';
  @Input() currentUserId?: number;
  /** Every booking of a status: the list shows them as a table. */
  @Output() showAll = new EventEmitter<string>();

  readonly statusKey = statusKey;
  columns: Column[] = COLUMNS.map(c => ({ status: c.status, hint: c.hint, total: 0, count: 0, cards: [] }));
  private request?: Subscription;

  constructor(private reservationService: ReservationService, private uiPrefs: UiPreferencesService) {}

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  ngOnChanges(): void {
    this.request?.unsubscribe();
    this.request = forkJoin(COLUMNS.map(c => this.reservationService.findPage({
      status: c.status, search: this.search, page: 0, size: PER_COLUMN, sort: 'startDate', direction: c.direction,
    }))).subscribe((pages: ReservationPage[]) => {
      this.columns = COLUMNS.map((c, i) => ({
        status: c.status,
        hint: c.hint,
        count: pages[i].totalElements,
        cards: pages[i].content,
        total: pages[i].totalElements <= pages[i].content.length ? pages[i].content.reduce((sum, r) => sum + (r.totalAmount || 0), 0) : null,
      }));
    });
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }

  /** "in 3 d" before the arrival, "today", "3 d ago" once it is over. */
  when(res: Reservation): string {
    const today = parseIsoDate(todayIso()).getTime();
    const status = res.status;
    const reference = status === 'completed' || status === 'cancelled' ? res.endDate : status === 'in-progress' ? res.endDate : res.startDate;
    const days = Math.round((parseIsoDate(reference).getTime() - today) / 86400000);
    if (days === 0) return this.t('today');
    return days > 0 ? this.t('planning_in_days').replace('{{n}}', String(days)) : this.t('kanban_days_ago').replace('{{n}}', String(-days));
  }
}
