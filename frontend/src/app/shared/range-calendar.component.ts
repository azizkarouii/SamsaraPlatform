import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CalendarDay, CalendarLanguage, CalendarMonth, DayStatus, buildCalendarMonths, getWeekdayLabels, isDayBookable, parseIsoDate, todayIso } from './calendar-utils';

/**
 * Two months to pick a stay: a first click sets the arrival, a second the departure.
 * Booked and blocked days cannot be picked; days holding a pending request show in orange.
 */
@Component({
  selector: 'app-range-calendar',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="cal-toolbar">
      <span class="step">{{ !start || end ? labels.pickStart : labels.pickEnd }}</span>
      <div class="cal-nav">
        <button mat-icon-button type="button" (click)="shift(-1)" [disabled]="!canGoBack" [attr.aria-label]="labels.previous"><mat-icon class="flip-rtl">chevron_left</mat-icon></button>
        <button mat-stroked-button type="button" (click)="goTo(today)">{{ labels.today }}</button>
        <button mat-icon-button type="button" (click)="shift(1)" [attr.aria-label]="labels.next"><mat-icon class="flip-rtl">chevron_right</mat-icon></button>
      </div>
    </div>
    <div class="cal-months">
      <div class="cal-month" *ngFor="let month of months">
        <h4>{{ month.monthLabel }} {{ month.year }}</h4>
        <div class="cal-weekdays"><span *ngFor="let label of weekdays">{{ label }}</span></div>
        <div class="cal-days">
          <button type="button" *ngFor="let day of month.days" class="cal-day"
                  [class.empty]="!day.dayNumber" [class.past]="isPast(day)"
                  [class.pending]="day.status === 'pending'" [class.reserved]="day.status === 'reserved'" [class.blocked]="day.status === 'blocked'"
                  [class.today]="day.date === today"
                  [class.selected]="!!day.date && (day.date === start || day.date === end)"
                  [class.in-range]="inRange(day.date)"
                  [disabled]="!day.dayNumber || isPast(day) || !bookable(day)"
                  [attr.aria-pressed]="!!day.date && (day.date === start || day.date === end)" [attr.data-date]="day.date || null"
                  (click)="pick(day)">
            {{ day.dayNumber }}
          </button>
        </div>
      </div>
    </div>
    <div class="cal-legend">
      <span><i class="dot selected"></i>{{ labels.selected }}</span>
      <span><i class="dot pending"></i>{{ labels.pending }}</span>
      <span><i class="dot reserved"></i>{{ labels.reserved }}</span>
      <span><i class="dot blocked"></i>{{ labels.blocked }}</span>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .step { font-size: 0.85rem; font-weight: 600; color: var(--accent-gold); }
    .cal-legend { margin-top: 0.75rem; }
  `]
})
export class RangeCalendarComponent implements OnChanges {
  /** yyyy-MM-dd, or '' */
  @Input() start = '';
  @Input() end = '';
  @Input() statuses: Record<string, DayStatus> = {};
  /** Days before it cannot be picked (today for a new booking); null lets the past be shown. */
  @Input() minDate: string | null = todayIso();
  @Input() language: CalendarLanguage = 'fr';
  @Input() labels = { pickStart: '', pickEnd: '', previous: '', next: '', today: '', selected: '', pending: '', reserved: '', blocked: '' };
  @Output() rangeChange = new EventEmitter<{ start: string; end: string }>();

  readonly today = todayIso();
  months: CalendarMonth[] = [];
  weekdays: string[] = [];
  /** First month shown, as months from the current one. */
  private offset = 0;
  private placed = false;

  ngOnChanges(): void {
    this.weekdays = getWeekdayLabels(this.language);
    if (!this.placed && this.start) {
      // Open on the stay already chosen (an edited booking, dates passed from another page)
      this.placed = true;
      this.offset = this.monthsFromNow(this.start);
    }
    this.rebuild();
  }

  get canGoBack(): boolean {
    return this.minDate === null || this.offset > 0;
  }

  shift(step: number): void {
    this.offset += step;
    if (this.minDate !== null) this.offset = Math.max(0, this.offset);
    this.rebuild();
  }

  goTo(iso: string): void {
    this.offset = this.monthsFromNow(iso);
    this.rebuild();
  }

  isPast(day: CalendarDay): boolean {
    return !!day.date && this.minDate !== null && day.date < this.minDate;
  }

  bookable(day: CalendarDay): boolean {
    return isDayBookable(day.status);
  }

  inRange(date: string): boolean {
    return !!date && !!this.start && !!this.end && date > this.start && date < this.end;
  }

  pick(day: CalendarDay): void {
    if (!day.date) return;
    if (!this.start || this.end) {
      this.rangeChange.emit({ start: day.date, end: '' });
    } else if (day.date < this.start) {
      this.rangeChange.emit({ start: day.date, end: this.start });
    } else {
      this.rangeChange.emit({ start: this.start, end: day.date });
    }
  }

  private monthsFromNow(iso: string): number {
    const date = parseIsoDate(iso);
    const now = new Date();
    return (date.getFullYear() - now.getFullYear()) * 12 + date.getMonth() - now.getMonth();
  }

  private rebuild(): void {
    const now = new Date();
    this.months = buildCalendarMonths(now.getFullYear(), now.getMonth() + this.offset, 2, this.statuses, this.language);
  }
}
