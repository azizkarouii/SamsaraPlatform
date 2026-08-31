import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../services/auth.service';
import { AvailabilityService } from '../../services/availability.service';
import { PropertyService } from '../../services/property.service';
import { PropertySamsarService } from '../../services/property-samsar.service';
import { Property } from '../../models/property.model';
import { PropertySamsar } from '../../models/property-samsar.model';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { TRANSLATIONS, AppLanguage } from '../../shared/translations';
import { CalendarDay, CalendarMonth, buildCalendarMonth, getMonthLabel, getWeekdayLabels } from '../../shared/calendar-utils';

interface MonthOption {
  value: string;
  year: number;
  monthIndex: number;
  label: string;
}

const MAX_SUMMER_MONTH_INDEX = 8;

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  template: `
    <div class="availability-page">
      <div class="page-head">
        <div>
          <p class="eyebrow">{{ t('availability_section') }}</p>
          <h1>{{ t('availability_section') }}</h1>
        </div>
        <div class="range-pill">
          <span>{{ t('selected_period') }}:</span>
          <strong>{{ rangeLabel }}</strong>
        </div>
      </div>

      <div class="controls-row">
        <mat-form-field appearance="outline" class="month-field">
          <mat-label>{{ t('select_month') }}</mat-label>
          <mat-select [value]="selectedMonthValue" (selectionChange)="onMonthChange($event.value)">
            <mat-option *ngFor="let month of monthOptions" [value]="month.value">{{ month.label }}</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="range-actions">
          <button mat-stroked-button type="button" (click)="resetRange()">{{ t('cancel') }}</button>
          <button mat-raised-button color="primary" type="button" (click)="searchAvailable()" [disabled]="!startDate || !endDate || loadingAvailable">
            {{ t('search_available_houses') }}
          </button>
        </div>
      </div>

      <div class="calendar-grid">
        <div class="calendar-strip">
          <mat-card class="calendar-card" *ngFor="let month of visibleMonths; let index = index">
            <mat-card-header>
              <mat-card-title>{{ month.monthLabel }} {{ month.year }}</mat-card-title>
              <mat-card-subtitle>{{ index === 0 ? t('choose_period') : index === 2 ? t('selected_period') : t('choose_period') }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="weekdays compact">
                <span *ngFor="let label of weekdayLabels">{{ label }}</span>
              </div>
              <div class="days-grid compact">
                <button
                  type="button"
                  class="day-cell"
                  *ngFor="let day of month.days"
                  [class.empty]="!day.dayNumber"
                  [class.selected]="day.date === startDate || day.date === endDate"
                  [class.in-range]="isInRange(day.date)"
                  (click)="selectDay(day)"
                >
                  <span>{{ day.dayNumber }}</span>
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <mat-card class="results-card">
          <mat-card-header>
            <mat-card-title>{{ t('available_houses') }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="!accessibleLoaded" class="loading-state">
              <mat-spinner diameter="36"></mat-spinner>
            </div>
            <div *ngIf="loadingAvailable" class="loading-state">
              <mat-spinner diameter="36"></mat-spinner>
            </div>

            <div *ngIf="accessibleLoaded && !loadingAvailable && availableProperties.length === 0" class="empty-state">
              <mat-icon>home_work</mat-icon>
              <p>{{ t('no_available_houses') }}</p>
            </div>

            <div class="result-list" *ngIf="availableProperties.length">
              <a class="result-item" *ngFor="let property of availableProperties" [routerLink]="['/public/properties', property.id]">
                <div>
                  <h3>{{ property.title }}</h3>
                  <p>{{ property.address || '-' }}</p>
                </div>
                <mat-chip-set>
                  <mat-chip color="primary" selected>{{ property.pricePerDay | currency:'TND':'symbol':'1.0-0' }}/day</mat-chip>
                </mat-chip-set>
              </a>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="legend-card">
        <mat-card-content>
          <div class="legend-line">
            <span class="legend-dot outline"></span>
            <span>{{ t('choose_period') }}</span>
          </div>
          <div class="legend-line">
            <span class="legend-dot primary"></span>
            <span>{{ t('selected_period') }}</span>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .availability-page {
      display: grid;
      gap: 1.25rem;
      padding: 1.5rem;
    }
    .page-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .eyebrow {
      margin: 0 0 0.25rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.75rem;
      opacity: 0.65;
    }
    h1 {
      margin: 0;
      font-size: 1.8rem;
    }
    .range-pill {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      padding: 0.75rem 1rem;
      border-radius: 16px;
      background: var(--bg-card);
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    }
    .controls-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .month-field {
      min-width: 240px;
      flex: 1;
    }
    .range-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .calendar-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.8fr);
      gap: 1rem;
    }
    .calendar-strip {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
      align-items: start;
    }
    .calendar-card, .results-card, .legend-card {
      border-radius: 20px;
    }
    .weekdays, .days-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 0.5rem;
    }
    .weekdays.compact span {
      font-size: 0.68rem;
    }
    .weekdays {
      margin-bottom: 0.5rem;
    }
    .weekdays span {
      text-align: center;
      font-size: 0.75rem;
      opacity: 0.7;
    }
    .day-cell {
      aspect-ratio: 1 / 1;
      border: 1px solid var(--border-color);
      border-radius: 14px;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      transition: transform 0.15s ease, background 0.15s ease;
    }
    .day-cell:hover {
      transform: translateY(-1px);
      background: var(--surface-hover);
    }
    .day-cell.empty {
      border: none;
      background: transparent;
      cursor: default;
    }
    .day-cell.selected {
      outline: 2px solid var(--blue);
      outline-offset: 1px;
    }
    .day-cell.in-range {
      box-shadow: inset 0 0 0 999px rgba(59, 130, 246, 0.08);
    }
    .result-list {
      display: grid;
      gap: 0.75rem;
    }
    .result-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.9rem 1rem;
      border-radius: 16px;
      text-decoration: none;
      color: inherit;
      background: var(--surface-subtle);
      border: 1px solid var(--border-color);
    }
    .result-item h3 {
      margin: 0 0 0.25rem;
      font-size: 1rem;
    }
    .result-item p {
      margin: 0;
      opacity: 0.75;
      font-size: 0.85rem;
    }
    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 220px;
      gap: 0.75rem;
    }
    .empty-state mat-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      opacity: 0.5;
    }
    .legend-line {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.25rem 0;
    }
    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid var(--border-color);
      display: inline-block;
    }
    .legend-dot.primary {
      background: rgba(60, 145, 230, 0.2);
      border-color: rgba(60, 145, 230, 0.5);
    }
    .hint {
      opacity: 0.7;
    }
    @media (max-width: 960px) {
      .calendar-grid {
        grid-template-columns: 1fr;
      }
      .calendar-strip {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AvailabilityComponent implements OnInit {
  language: AppLanguage = 'fr';
  monthOptions: MonthOption[] = [];
  selectedMonthValue = '';
  calendar!: CalendarMonth;
  visibleMonths: CalendarMonth[] = [];
  weekdayLabels = getWeekdayLabels('fr');
  startDate = '';
  endDate = '';
  rangeLabel = '';
  loadingAvailable = false;
  accessibleLoaded = false;
  availableProperties: Property[] = [];
  private accessiblePropertyIds = new Set<number>();

  constructor(
    private authService: AuthService,
    private availabilityService: AvailabilityService,
    private propertyService: PropertyService,
    private propertySamsarService: PropertySamsarService,
    private uiPrefs: UiPreferencesService,
  ) {
    this.language = this.uiPrefs.getLanguage() as AppLanguage;
    const year = new Date().getFullYear();
    this.monthOptions = [5, 6, 7, 8].map(monthIndex => ({
      value: `${year}-${monthIndex}`,
      year,
      monthIndex,
      label: getMonthLabel(monthIndex, this.language),
    }));
    this.selectedMonthValue = this.monthOptions[1].value;
    this.rebuildVisibleMonths();
    this.weekdayLabels = getWeekdayLabels(this.language);
    this.rangeLabel = this.t('choose_period');
  }

  ngOnInit(): void {
    this.loadAccessibleProperties();
  }

  t(key: string): string {
    return TRANSLATIONS[key]?.[this.language] ?? key;
  }

  onMonthChange(value: string): void {
    this.selectedMonthValue = value;
    this.rebuildVisibleMonths();
    this.startDate = '';
    this.endDate = '';
    this.rangeLabel = this.t('choose_period');
    this.availableProperties = [];
  }

  selectDay(day: CalendarDay): void {
    if (!day.dayNumber) {
      return;
    }
    if (!this.startDate || this.endDate) {
      this.startDate = day.date;
      this.endDate = '';
      this.rangeLabel = day.date;
      return;
    }
    if (day.date < this.startDate) {
      this.endDate = this.startDate;
      this.startDate = day.date;
    } else {
      this.endDate = day.date;
    }
    this.rangeLabel = `${this.startDate} → ${this.endDate}`;
    this.rebuildVisibleMonths();
  }

  resetRange(): void {
    this.startDate = '';
    this.endDate = '';
    this.availableProperties = [];
    this.rangeLabel = this.t('choose_period');
  }

  searchAvailable(): void {
    if (!this.startDate || !this.endDate) {
      return;
    }
    this.loadingAvailable = true;
    this.availabilityService.findAvailable(this.startDate, this.endDate).subscribe({
      next: (properties) => {
        this.availableProperties = properties.filter(property => this.accessiblePropertyIds.has(property.id));
        this.loadingAvailable = false;
      },
      error: () => {
        this.availableProperties = [];
        this.loadingAvailable = false;
      },
    });
  }

  private resolveMonthValue(value: string): { year: number; monthIndex: number } {
    const [year, monthIndex] = value.split('-').map(Number);
    return { year, monthIndex };
  }

  private loadAccessibleProperties(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.accessibleLoaded = true;
      return;
    }

    if (user.role === 'PROPRIETAIRE') {
      this.propertyService.findMine().subscribe({
        next: (properties) => {
          this.accessiblePropertyIds = new Set(properties.map(property => property.id));
          this.accessibleLoaded = true;
        },
        error: () => {
          this.accessibleLoaded = true;
        },
      });
      return;
    }

    this.propertySamsarService.findMine().subscribe({
      next: (relations: PropertySamsar[]) => {
        this.accessiblePropertyIds = new Set(relations.map(relation => relation.propertyId));
        this.accessibleLoaded = true;
      },
      error: () => {
        this.accessibleLoaded = true;
      },
    });
  }

  private rebuildVisibleMonths(): void {
    const base = this.resolveMonthValue(this.selectedMonthValue);
    const remainingMonths = Math.max(1, MAX_SUMMER_MONTH_INDEX - base.monthIndex + 1);
    this.visibleMonths = Array.from({ length: Math.min(3, remainingMonths) }, (_, offset) => {
      const date = new Date(base.year, base.monthIndex + offset, 1);
      return buildCalendarMonth(date.getFullYear(), date.getMonth(), {}, this.language);
    });
    this.calendar = this.visibleMonths[0];
  }

  isInRange(date: string): boolean {
    if (!this.startDate || !this.endDate || !date) {
      return false;
    }
    return date > this.startDate && date < this.endDate;
  }
}
