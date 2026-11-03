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
import { CalendarDay, CalendarMonth, buildCalendarMonths, getWeekdayLabels, todayIso } from '../../shared/calendar-utils';
import { t } from '../../shared/translations';

import { PropertyThumbComponent } from '../../shared/property-thumb.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
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
              <div class="result" *ngFor="let property of results">
                <app-property-thumb [path]="property.coverImage"></app-property-thumb>
                <a class="result-main" [routerLink]="['/properties', property.id]">
                  <strong>{{ property.title }}<span class="pill type-pill" *ngIf="property.configuration">{{ property.configuration | uppercase }}</span></strong>
                  <span>{{ property.address || '-' }}</span>
                </a>
                <div class="result-side">
                  <span class="price" *ngIf="property.pricePerDay">
                    {{ priceFor(property) | number:'1.0-0' }} TND
                    <small *ngIf="days">· {{ priceFor(property) * days | number:'1.0-0' }} TND {{ t('total_short') }}</small>
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
    .range mat-icon { color: var(--primary); }
    .actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
    h3 { margin: 0 0 0.75rem; display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; }
    .type-filter { display: block; margin-top: 1rem; }
    .type-pill { margin-inline-start: 0.5rem; font-size: 0.72rem; font-weight: 600; padding: 0.05rem 0.5rem; }
    .results { position: sticky; top: 72px; }
    .result-list { display: grid; gap: 0.6rem; }
    .result {
      display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;
      padding: 0.75rem; border-radius: 12px; border: 1px solid var(--border-color); background: var(--surface-subtle);
    }
    .result-main { display: flex; flex-direction: column; min-width: 0; flex: 1; color: inherit; text-decoration: none; }
    .result-main span { font-size: 0.8rem; color: var(--text-secondary); }
    .result-side { display: flex; align-items: center; gap: 0.6rem; }
    .price { font-weight: 700; font-size: 0.9rem; display: flex; flex-direction: column; align-items: flex-end; }
    .price small { font-weight: 400; color: var(--text-secondary); }
    :host-context(html[dir='rtl']) .flip-rtl { transform: scaleX(-1); }
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
  readonly houseTypes = ['S+1', 'S+2', 'S+3', 'S+4'];
  readonly today = todayIso();
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

  priceFor(property: Property): number {
    return (property.pricePerDay || 0) + (this.margins.get(property.id) || 0);
  }

  rebuild(): void {
    const now = new Date();
    this.months = buildCalendarMonths(now.getFullYear(), now.getMonth() + this.offset, 2, {}, this.uiPrefs.getLanguage());
  }

  shift(delta: number): void {
    this.offset = Math.max(0, this.offset + delta * 2);
    this.rebuild();
  }

  selectDay(day: CalendarDay): void {
    if (!day.dayNumber || day.isPast) return;
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
