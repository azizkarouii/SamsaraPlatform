import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { AvailabilityService } from '../../services/availability.service';
import { PropertySamsarService } from '../../services/property-samsar.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { Property } from '../../models/property.model';
import { countReservationDays } from '../../models/reservation.model';
import { CalendarDay, CalendarMonth, buildCalendarMonths, formatIsoDate, getWeekdayLabels, todayIso } from '../../shared/calendar-utils';
import { t } from '../../shared/translations';

import { PropertyThumbComponent } from '../../shared/property-thumb.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { PriceStretch, priceStretches, stretchesTotal } from '../../shared/pricing';
import { HOUSE_TYPES } from '../../shared/house-types';
@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatFormFieldModule, MatSelectModule, PropertyThumbComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ t('availability_section') }}</h1>
          <p class="subtitle">{{ t('availability_subtitle') }}</p>
        </div>
      </div>

      <div class="layout">
        <mat-card>
          <mat-card-content>
            <div class="cal-toolbar">
              <div class="range">
                <mat-icon>date_range</mat-icon>
                <span *ngIf="!startDate">{{ t('choose_start_date') }}</span>
                <span *ngIf="startDate && !endDate"><strong>{{ startDate | date:'dd/MM/yyyy' }}</strong> → {{ t('choose_end_date') }}</span>
                <span *ngIf="startDate && endDate"><strong>{{ startDate | date:'dd/MM/yyyy' }}</strong> → <strong>{{ endDate | date:'dd/MM/yyyy' }}</strong> ({{ days }} {{ t('days_short') }})</span>
              </div>
              <div class="cal-nav">
                <button mat-icon-button (click)="shift(-1)" [disabled]="offset === 0" [attr.aria-label]="t('previous')"><mat-icon class="flip-rtl">chevron_left</mat-icon></button>
                <button mat-stroked-button (click)="offset = 0; rebuild()">{{ t('today') }}</button>
                <button mat-icon-button (click)="shift(1)" [attr.aria-label]="t('next')"><mat-icon class="flip-rtl">chevron_right</mat-icon></button>
              </div>
            </div>

            <div class="presets" role="group" [attr.aria-label]="t('quick_periods')">
              <button type="button" *ngFor="let p of presets" class="preset" [class.active]="activePreset === p.id" (click)="applyPreset(p.id)">
                <mat-icon>{{ p.icon }}</mat-icon>{{ t(p.label) }}
              </button>
            </div>

            <div class="cal-months">
              <div class="cal-month" *ngFor="let month of months">
                <h4>{{ month.monthLabel }} {{ month.year }}</h4>
                <div class="cal-weekdays"><span *ngFor="let label of weekdayLabels">{{ label }}</span></div>
                <div class="cal-days">
                  <button type="button" class="cal-day" *ngFor="let day of month.days"
                          [class.empty]="!day.dayNumber"
                          [class.past]="day.isPast"
                          [class.today]="day.date === today"
                          [class.selected]="day.date && (day.date === startDate || day.date === endDate)"
                          [class.in-range]="isInRange(day.date)"
                          [disabled]="!day.dayNumber || day.isPast"
                          (click)="selectDay(day)">
                    {{ day.dayNumber }}
                  </button>
                </div>
              </div>
            </div>

            <mat-form-field appearance="outline" class="type-filter" subscriptSizing="dynamic">
              <mat-label>{{ t('house_type') }}</mat-label>
              <mat-select [(ngModel)]="houseType" (selectionChange)="onHouseTypeChange()">
                <mat-option value="">{{ t('all_types') }}</mat-option>
                <mat-option *ngFor="let type of houseTypes" [value]="type">{{ type }}</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="actions">
              <button mat-button (click)="resetRange()" [disabled]="!startDate && !houseType">{{ t('clear_filter') }}</button>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="results">
          <mat-card-content>
            <h3>{{ t('available_houses') }} <span class="pill" *ngIf="searched">{{ results.length }}</span></h3>
            <div *ngIf="loading" class="loading-container"><mat-spinner diameter="36"></mat-spinner></div>

            <div *ngIf="!loading && !searched" class="empty-state">
              <mat-icon>touch_app</mat-icon>
              <p>{{ t('availability_hint') }}</p>
            </div>
            <div *ngIf="!loading && searched && !results.length" class="empty-state">
              <mat-icon>home_work</mat-icon>
              <p>{{ t('no_available_houses') }}</p>
            </div>

            <div class="result-list" *ngIf="!loading && results.length">
              <div class="result" *ngFor="let property of results; let i = index" [style.--i]="i">
                <app-property-thumb class="result-photo" [path]="property.coverImage"></app-property-thumb>
                <a class="result-main" [routerLink]="['/properties', property.id]">
                  <strong>{{ property.title }}<span class="pill type-pill" *ngIf="property.configuration">{{ property.configuration | uppercase }}</span></strong>
                  <span>{{ property.address || '-' }}</span>
                </a>
                <div class="result-side">
                  <span class="price" *ngIf="property.pricePerDay">
                    <ng-container *ngIf="singleRate(property) as rate">{{ rate | number:'1.0-0' }} TND <small>· </small></ng-container>
                    <small>{{ totalFor(property) | number:'1.0-0' }} TND {{ t('total_short') }}</small>
                    <small *ngIf="!singleRate(property)"> · {{ t('price_varies') }}</small>
                  </span>
                  <a mat-stroked-button color="primary" [routerLink]="['/reservations/add']"
                     [queryParams]="{ propertyId: property.id, start: startDate, end: endDate || startDate }">
                    {{ t('book') }}
                  </a>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .layout { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(300px, 1fr); gap: 1.25rem; align-items: start; }
    .range { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; }
    .presets { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.9rem; }
    .preset { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.35rem 0.75rem; border-radius: 999px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); font: inherit; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
    .preset mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--accent-gold); }
    .preset:hover { border-color: var(--primary); }
    .preset.active { background: var(--primary-strong); border-color: var(--primary-strong); color: #fff; }
    .preset.active mat-icon { color: inherit; }
    .result-photo { --thumb-w: 72px; --thumb-radius: 12px; }
    @keyframes result-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    .range mat-icon { color: var(--primary); }
    .actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
    h3 { margin: 0 0 0.75rem; display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; }
    .type-filter { display: block; margin-top: 1rem; }
    .type-pill { margin-inline-start: 0.5rem; font-size: 0.72rem; font-weight: 600; padding: 0.05rem 0.5rem; }
    .results { position: sticky; top: 72px; }
    .result-list { display: grid; gap: 0.6rem; }
    .result {
      display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;
      padding: 0.75rem; border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-card); box-shadow: var(--shadow-sm);
      animation: result-in 0.3s ease both; animation-delay: calc(var(--i, 0) * 40ms); transition: border-color 0.15s ease, transform 0.15s ease;
    }
    .result:hover { border-color: var(--primary); transform: translateY(-1px); }
    @media (prefers-reduced-motion: reduce) { .result { animation: none; transition: none; } }
    .result-main { display: flex; flex-direction: column; min-width: 0; flex: 1; color: inherit; text-decoration: none; }
    .result-main span { font-size: 0.8rem; color: var(--text-secondary); }
    .result-side { display: flex; align-items: center; gap: 0.6rem; }
    .price { font-weight: 700; font-size: 0.9rem; display: flex; flex-direction: column; align-items: flex-end; }
    .price small { font-weight: 400; color: var(--text-secondary); }
    @media (max-width: 960px) {
      .layout { grid-template-columns: 1fr; }
      .results { position: static; }
    }
  `]
})
export class AvailabilityComponent implements OnInit, OnDestroy {
  months: CalendarMonth[] = [];
  offset = 0;
  startDate = '';
  endDate = '';
  loading = false;
  searched = false;
  results: Property[] = [];
  /** Optional filter: empty means every type. */
  houseType = '';
  readonly houseTypes = HOUSE_TYPES;
  readonly today = todayIso();
  /** Periods asked for again and again, in one click instead of two dates. */
  readonly presets: { id: 'weekend' | 'week' | 'next_week' | 'next_month'; label: string; icon: string }[] = [
    { id: 'weekend', label: 'preset_weekend', icon: 'weekend' },
    { id: 'week', label: 'preset_seven_days', icon: 'date_range' },
    { id: 'next_week', label: 'preset_next_week', icon: 'event_repeat' },
    { id: 'next_month', label: 'preset_next_month', icon: 'calendar_month' },
  ];
  activePreset: string | null = null;
  private margins = new Map<number, number>();
  private search?: Subscription;

  constructor(
    private authService: AuthService,
    private availabilityService: AvailabilityService,
    private propertySamsarService: PropertySamsarService,
    private uiPrefs: UiPreferencesService,
  ) {}

  ngOnInit(): void {
    this.rebuild();
    if (this.authService.getCurrentUser()?.role === 'SAMSAR') {
      this.propertySamsarService.findMine().subscribe(rels =>
        rels.forEach(r => this.margins.set(r.propertyId, r.priceIncreaseTnd || 0)));
    }
  }

  ngOnDestroy(): void {
    this.search?.unsubscribe();
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  get weekdayLabels(): string[] {
    return getWeekdayLabels(this.uiPrefs.getLanguage());
  }

  get days(): number {
    return countReservationDays(this.startDate, this.endDate || this.startDate);
  }

  private stretchesOf(property: Property): PriceStretch[] {
    return priceStretches(property.pricePerDay, property.seasonalPrices, this.startDate, this.endDate);
  }

  /** Nightly price when the whole stay has the same one; null when it covers several price periods. */
  singleRate(property: Property): number | null {
    const stretches = this.stretchesOf(property);
    return stretches.length === 1 ? stretches[0].pricePerDay + (this.margins.get(property.id) || 0) : null;
  }

  totalFor(property: Property): number {
    return stretchesTotal(this.stretchesOf(property)) + this.days * (this.margins.get(property.id) || 0);
  }

  rebuild(): void {
    const now = new Date();
    this.months = buildCalendarMonths(now.getFullYear(), now.getMonth() + this.offset, 2, {}, this.uiPrefs.getLanguage());
  }

  shift(delta: number): void {
    this.offset = Math.max(0, this.offset + delta * 2);
    this.rebuild();
  }

  /** Friday to Sunday of this weekend (from today when it has begun), 7 days from today, next week, next month. */
  applyPreset(id: 'weekend' | 'week' | 'next_week' | 'next_month'): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const plus = (date: Date, days: number) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
    const weekday = (today.getDay() + 6) % 7; // 0 = Monday
    let start: Date;
    let end: Date;
    if (id === 'weekend') {
      start = weekday >= 4 ? today : plus(today, 4 - weekday);
      end = plus(today, 6 - weekday);
    } else if (id === 'week') {
      start = today;
      end = plus(today, 6);
    } else if (id === 'next_week') {
      start = plus(today, 7 - weekday);
      end = plus(start, 6);
    } else {
      start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    }
    this.startDate = formatIsoDate(start);
    this.endDate = formatIsoDate(end);
    this.activePreset = id;
    // Show the month where the period starts
    this.offset = Math.max(0, (start.getFullYear() - today.getFullYear()) * 12 + start.getMonth() - today.getMonth());
    this.offset -= this.offset % 2;
    this.rebuild();
    this.searchAvailable();
  }

  selectDay(day: CalendarDay): void {
    if (!day.dayNumber || day.isPast) return;
    this.activePreset = null;
    if (!this.startDate || this.endDate) {
      this.startDate = day.date;
      this.endDate = '';
      this.clearResults();
      return;
    }
    if (day.date < this.startDate) {
      this.endDate = this.startDate;
      this.startDate = day.date;
    } else {
      this.endDate = day.date;
    }
    this.searchAvailable();
  }

  isInRange(date: string): boolean {
    return !!date && !!this.startDate && !!this.endDate && date > this.startDate && date < this.endDate;
  }

  /** Once the period is chosen, the results follow the type right away. */
  onHouseTypeChange(): void {
    if (this.startDate && this.endDate) {
      this.searchAvailable();
    }
  }

  private clearResults(): void {
    this.search?.unsubscribe();
    this.loading = false;
    this.searched = false;
    this.results = [];
  }

  resetRange(): void {
    this.activePreset = null;
    this.startDate = '';
    this.endDate = '';
    this.houseType = '';
    this.clearResults();
  }

  /** Runs as soon as both dates are chosen; a newer search replaces one still in flight. */
  private searchAvailable(): void {
    this.search?.unsubscribe();
    this.loading = true;
    this.search = this.availabilityService.findAvailable(this.startDate, this.endDate, this.houseType).subscribe({
      next: (properties) => {
        this.results = properties;
        this.loading = false;
        this.searched = true;
      },
      error: () => {
        this.results = [];
        this.loading = false;
        this.searched = true;
      },
    });
  }
}
