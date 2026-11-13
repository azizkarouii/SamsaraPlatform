import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';

/**
 * A date filter shaped like the search bar: a pill that opens the calendar, shows the chosen day in words
 * ("Free on Fri 14 Nov"), with one-click days beside it and a cross to drop the filter.
 */
@Component({
  selector: 'app-date-pill',
  standalone: true,
  imports: [CommonModule, MatDatepickerModule, MatIconModule],
  template: `
    <div class="wrap">
      <button type="button" class="pill" [class.set]="!!value" [class.open]="opened" (click)="picker.open()"
              [attr.aria-label]="value ? label + ' ' + shown : emptyLabel" aria-haspopup="dialog">
        <mat-icon class="icon" aria-hidden="true">{{ value ? 'event_available' : 'calendar_month' }}</mat-icon>
        <span class="text" *ngIf="!value">{{ emptyLabel }}</span>
        <span class="text" *ngIf="value"><small>{{ label }}</small> <b>{{ shown }}</b></span>
        <mat-icon class="chevron" *ngIf="!value" aria-hidden="true">expand_more</mat-icon>
        <!-- Anchors the calendar under the pill; the pill itself is what is clicked -->
        <input class="anchor" [matDatepicker]="picker" [value]="value" [min]="min" (dateChange)="pick($event.value)" tabindex="-1" aria-hidden="true" />
      </button>
      <button type="button" class="clear" *ngIf="value" (click)="pick(null)" [attr.aria-label]="clearLabel"><mat-icon>close</mat-icon></button>
      <mat-datepicker #picker (opened)="opened = true" (closed)="opened = false"></mat-datepicker>
      <div class="quick" *ngIf="!value && quick.length">
        <button type="button" *ngFor="let q of quick; trackBy: trackIndex" (click)="pick(q.date)">{{ q.label }}</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .wrap { position: relative; display: flex; align-items: center; gap: 0.4rem; }
    .pill {
      position: relative; display: inline-flex; align-items: center; gap: 0.45rem; height: 48px; padding: 0 1rem 0 0.9rem;
      border: 1px solid var(--border-color); border-radius: 999px; background: var(--bg-card); color: var(--text-primary);
      font: inherit; font-size: 0.92rem; cursor: pointer; white-space: nowrap; box-shadow: var(--shadow-sm);
      transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease;
    }
    .pill:hover { border-color: color-mix(in srgb, var(--primary) 45%, var(--border-color)); }
    .pill:focus-visible, .pill.open { outline: 0; border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-soft), var(--shadow-md); transform: translateY(-1px); }
    .pill.set { background: var(--primary-soft); border-color: var(--primary-strong); padding-inline-end: 2.6rem; }
    .icon { color: var(--text-secondary); transition: color 0.2s ease, transform 0.3s ease; }
    .pill:hover .icon, .pill.open .icon { color: var(--primary); transform: rotate(-8deg) scale(1.1); }
    .pill.set .icon { color: var(--primary-strong); }
    .text { color: var(--text-secondary); }
    .pill.set .text { color: var(--text-primary); }
    .text small { font-size: 0.78rem; color: var(--text-secondary); }
    .text b { display: inline-block; margin-inline-start: 0.3em; }
    .text b::first-letter { text-transform: uppercase; }
    .chevron { font-size: 20px; width: 20px; height: 20px; color: var(--text-secondary); transition: transform 0.2s ease; }
    .pill.open .chevron { transform: rotate(180deg); }
    .anchor { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; pointer-events: none; border: 0; padding: 0; }
    .clear { position: absolute; inset-inline-start: calc(100% - 2.4rem); top: 8px; width: 32px; height: 32px; border: 0; border-radius: 50%; display: grid; place-items: center; cursor: pointer; background: var(--bg-card); color: var(--text-secondary); animation: grow 0.18s ease; }
    .clear:hover { color: var(--primary); }
    .clear mat-icon { font-size: 18px; width: 18px; height: 18px; }
    @keyframes grow { from { transform: scale(0.4); opacity: 0; } }
    .quick { display: flex; gap: 0.3rem; }
    .quick button { height: 32px; padding: 0 0.75rem; border-radius: 999px; border: 1px dashed var(--border-color); background: transparent; color: var(--text-secondary); font: inherit; font-size: 0.78rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
    .quick button:hover { border-style: solid; border-color: var(--primary); color: var(--primary); background: var(--primary-soft); }
    @media (max-width: 600px) { .quick { display: none; } }
    @media (prefers-reduced-motion: reduce) { .pill, .icon, .chevron { transition: none; } .clear { animation: none; } }
  `]
})
export class DatePillComponent {
  @Input() value: Date | null = null;
  /** Said before the chosen day ("Free on"). */
  @Input() label = '';
  /** Said while no day is chosen ("Free on…"). */
  @Input() emptyLabel = '';
  @Input() clearLabel = '';
  @Input() min: Date | null = null;
  @Input() locale = 'fr-FR';
  /** Days in one click beside the pill (today, this weekend…). */
  @Input() quick: { label: string; date: Date }[] = [];
  @Output() valueChange = new EventEmitter<Date | null>();

  @ViewChild('picker', { static: true }) picker!: MatDatepicker<Date>;
  opened = false;

  /** "ven. 14 nov." in the reader's language. */
  get shown(): string {
    return this.value ? new Intl.DateTimeFormat(this.locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(this.value) : '';
  }

  /** The quick days are rebuilt by the page at each check: keeping their buttons means a click is never lost. */
  trackIndex(index: number): number {
    return index;
  }

  pick(date: Date | null): void {
    this.value = date;
    this.valueChange.emit(date);
  }
}
