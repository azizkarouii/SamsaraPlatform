import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../../services/auth.service';
import { PropertyService } from '../../../services/property.service';
import { PropertySamsarService } from '../../../services/property-samsar.service';
import { Property } from '../../../models/property.model';
import { Reservation } from '../../../models/reservation.model';
import { PropertySamsar } from '../../../models/property-samsar.model';
import { Clipboard } from '@angular/cdk/clipboard';
import { ReservationService } from '../../../services/reservation.service';
import { AvailabilityService } from '../../../services/availability.service';
import { CalendarMonth, CalendarDay, buildCalendarMonth, createDayStatusMap, getMonthLabel, getWeekdayLabels } from '../../../shared/calendar-utils';
import { PropertyAvailability } from '../../../models/property-availability.model';
import { UiPreferencesService } from '../../../services/ui-preferences.service';
import { TRANSLATIONS, AppLanguage } from '../../../shared/translations';

@Component({
  selector: 'app-property-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  template: `
    <div class="detail-container" *ngIf="!loading; else loadingSpinner">
      <div class="header">
        <button mat-stroked-button [routerLink]="publicView ? '/shared-houses' : '/properties'">
          <mat-icon>arrow_back</mat-icon> {{ t('back_to_list') }}
        </button>
        <div class="header-actions" *ngIf="!publicView">
          <button mat-raised-button color="accent" [routerLink]="['/properties', property?.id, 'edit']">
            <mat-icon>edit</mat-icon> {{ t('edit_property') }}
          </button>
          <button mat-raised-button color="warn" (click)="deleteProperty()">
            <mat-icon>delete</mat-icon> {{ t('delete_property') }}
          </button>
        </div>
      </div>

      <div *ngIf="property">
        <mat-card class="detail-card">
          <mat-card-header>
            <mat-card-title>{{ property.title }}</mat-card-title>
            <mat-card-subtitle>{{ property.configuration || 'No configuration specified' }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="badges">
              <mat-chip-set>
                <mat-chip *ngIf="property.hautStanding" color="primary" selected>High Standing</mat-chip>
                <mat-chip *ngIf="property.appartientResidence" color="accent" selected>Residence</mat-chip>
              </mat-chip-set>
            </div>

            <p class="description" *ngIf="property.description">{{ property.description }}</p>

            <h3>Pricing</h3>
            <mat-divider></mat-divider>
            <div class="info-grid">
              <div class="info-item" *ngIf="property.pricePerDay">
                <span class="label">Price/Day</span>
                <span class="value">{{ property.pricePerDay | currency:'TND':'symbol':'1.0-0' }}</span>
              </div>
              <div class="info-item" *ngIf="property.pricePerWeek">
                <span class="label">Price/Week</span>
                <span class="value">{{ property.pricePerWeek | currency:'TND':'symbol':'1.0-0' }}</span>
              </div>
              <div class="info-item" *ngIf="property.pricePerMonth">
                <span class="label">Price/Month</span>
                <span class="value">{{ property.pricePerMonth | currency:'TND':'symbol':'1.0-0' }}</span>
              </div>
            </div>

            <h3>Details</h3>
            <mat-divider></mat-divider>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Address</span>
                <span class="value">{{ property.address || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Max Capacity</span>
                <span class="value">{{ property.maxCapacity || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Bathrooms</span>
                <span class="value">{{ property.bathrooms || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Distance to Beach</span>
                <span class="value">{{ property.distanceBeach ? property.distanceBeach + 'm' : '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Owner Contact</span>
                <span class="value">{{ formatPhone(property.ownerContact) }}</span>
              </div>
            </div>

            <h3>Equipment</h3>
            <mat-divider></mat-divider>
            <div class="equipment-list">
              <mat-chip-set>
                <mat-chip *ngIf="property.wifi">WiFi</mat-chip>
                <mat-chip *ngIf="property.airCondition">Air Conditioning</mat-chip>
                <mat-chip *ngIf="property.pool">Pool</mat-chip>
                <mat-chip *ngIf="property.garage">Garage</mat-chip>
                <mat-chip *ngIf="property.kitchen">Kitchen</mat-chip>
                <mat-chip *ngIf="property.seaView">Sea View</mat-chip>
                <mat-chip *ngIf="property.terrace">Terrace</mat-chip>
              </mat-chip-set>
              <p *ngIf="!property.wifi && !property.airCondition && !property.pool && !property.garage && !property.kitchen && !property.seaView && !property.terrace" class="no-equipment">No equipment listed</p>
            </div>

            <div class="dates">
              <span class="date-label">Created: {{ property.createdAt | date:'medium' }}</span>
              <span class="date-label">Updated: {{ property.updatedAt | date:'medium' }}</span>
            </div>
            <div class="detail-calendar-section">
              <div class="availability-head">
                <div>
                  <p class="calendar-eyebrow">{{ t('availability_section') }}</p>
                  <h3>{{ t('availability_section') }}</h3>
                </div>
                <div class="calendar-legend-inline">
                  <span><i class="dot reserved"></i>{{ t('reserved') }}</span>
                  <span><i class="dot pending"></i>{{ t('pending') }}</span>
                  <span><i class="dot free"></i>{{ t('free') }}</span>
                </div>
              </div>
              <div class="calendar-strip">
                <mat-card class="calendar-month-card" *ngFor="let month of visibleMonths; let index = index">
                  <mat-card-header>
                    <mat-card-title>{{ month.monthLabel }} {{ month.year }}</mat-card-title>
                    <mat-card-subtitle>{{ index === 0 ? t('select_start') : index === 2 ? t('select_end') : t('choose_period') }}</mat-card-subtitle>
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
                        [class.reserved]="day.status === 'reserved'"
                        [class.pending]="day.status === 'pending'"
                        [class.free]="day.status === 'free'"
                        [class.range-start]="day.date === startDate"
                        [class.range-end]="day.date === endDate"
                        [class.in-range]="isInRange(day.date)"
                        (click)="selectDay(day)"
                      >
                        <span>{{ day.dayNumber }}</span>
                      </button>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>
            </div>

            <div class="share-row" *ngIf="publicLink">
              <button mat-stroked-button color="primary" (click)="copyPublicLink()">
                <mat-icon>link</mat-icon>
                Copy public link
              </button>
              <a mat-button color="primary" [href]="publicLink" target="_blank" rel="noopener noreferrer">
                Open public link
              </a>
            </div>

            <div *ngIf="!publicView && samsars.length" class="samsar-section">
              <h3>Associated Samsars</h3>
              <mat-divider></mat-divider>
              <mat-list>
                <mat-list-item *ngFor="let s of samsars">
                  <mat-icon matListItemIcon>person</mat-icon>
                  <span matListItemTitle>{{ s.samsar?.name || '#' + s.samsarId }}</span>
                  <span matListItemLine>{{ s.samsar?.email || '' }}</span>
                  <div matListItemMeta class="samsar-actions">
                    <span class="pill">+{{ s.priceIncreaseTnd || 0 }} TND</span>
                    <button mat-icon-button (click)="editSamsarPrice(s)" matTooltip="Modifier la marge">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="removeSamsar(s)" matTooltip="Retirer">
                      <mat-icon>remove_circle</mat-icon>
                    </button>
                  </div>
                </mat-list-item>
              </mat-list>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>

    <ng-template #loadingSpinner>
      <div class="loading-container">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    </ng-template>
  `,
  styles: [`
    .detail-container {
      padding: 1.5rem;
      max-width: 900px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .header-actions {
      display: flex;
      gap: 0.5rem;
    }
    .detail-card {
      margin-bottom: 1rem;
    }
    .badges {
      margin-bottom: 1rem;
    }
    .description {
      color: rgba(0,0,0,0.7);
      margin-bottom: 1.5rem;
      line-height: 1.6;
    }
    h3 {
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
    }
    .info-item {
      display: flex;
      flex-direction: column;
    }
    .label {
      font-size: 0.75rem;
      color: rgba(0,0,0,0.6);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .value {
      font-size: 1rem;
      font-weight: 500;
    }
    .equipment-list {
      margin: 1rem 0;
    }
    .no-equipment {
      color: rgba(0,0,0,0.5);
      font-style: italic;
    }
    .dates {
      display: flex;
      gap: 1.5rem;
      margin-top: 1.5rem;
      font-size: 0.8rem;
      color: rgba(0,0,0,0.5);
    }
    .share-row {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    .detail-calendar-section {
      margin-top: 1.75rem;
      padding: 1rem;
      border: 1px solid var(--border-color);
      border-radius: 22px;
      background: linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.94));
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
    }
    :host-context(html.dark-theme) .detail-calendar-section {
      background: linear-gradient(180deg, rgba(19, 24, 32, 0.9), rgba(15, 18, 25, 0.98));
    }
    .calendar-eyebrow {
      margin: 0 0 0.15rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.72rem;
      opacity: 0.6;
    }
    .calendar-strip {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.9rem;
      margin-top: 0.85rem;
    }
    .calendar-month-card {
      border-radius: 18px;
      border: 1px solid var(--border-color);
      background: rgba(255,255,255,0.64);
      overflow: hidden;
    }
    :host-context(html.dark-theme) .calendar-month-card {
      background: rgba(255,255,255,0.04);
    }
    .calendar-legend-inline {
      display: flex;
      flex-wrap: wrap;
      gap: 0.85rem;
      align-items: center;
    }
    .calendar-legend-inline span,
    .legend span {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
    }
    .days-grid.compact {
      gap: 0.35rem;
    }
    .weekdays.compact span {
      font-size: 0.68rem;
    }
    .samsar-section {
      margin-top: 1.5rem;
    }
    .pill {
      background: #e0e0e0;
      padding: 0.2rem 0.6rem;
      border-radius: 12px;
      font-size: 0.8rem;
    }
    .samsar-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
    @media (max-width: 960px) {
      .calendar-strip {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PropertyDetailComponent implements OnInit {
  property?: Property;
  loading = true;
  publicView = false;
  publicLink = '';
  samsars: PropertySamsar[] = [];
  language: AppLanguage = 'fr';
  calendar!: CalendarMonth;
  visibleMonths: CalendarMonth[] = [];
  weekdayLabels = getWeekdayLabels('fr');
  monthOptions: { value: string; label: string; year: number; monthIndex: number }[] = [];
  selectedMonthValue = '';
  startDate = '';
  endDate = '';
  private propertyReservations: Reservation[] = [];
  private propertyAvailabilities: PropertyAvailability[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private propertyService: PropertyService,
    private propertySamsarService: PropertySamsarService,
    private reservationService: ReservationService,
    private availabilityService: AvailabilityService,
    private uiPrefs: UiPreferencesService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private clipboard: Clipboard
  ) {
    this.language = this.uiPrefs.getLanguage() as AppLanguage;
    const current = new Date();
    this.monthOptions = [5, 6, 7].map(monthIndex => ({
      value: `${current.getFullYear()}-${monthIndex}`,
      year: current.getFullYear(),
      monthIndex,
      label: getMonthLabel(monthIndex, this.language),
    }));
    this.selectedMonthValue = this.monthOptions[0].value;
    this.rebuildVisibleMonths({});
    this.weekdayLabels = getWeekdayLabels(this.language);
  }

  ngOnInit(): void {
    this.publicView = this.route.snapshot.data['publicView'] === true;
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProperty(+id);
    }
  }

  private loadProperty(id: number): void {
    this.propertyService.findOne(id).subscribe({
      next: (property) => {
        this.property = property;
        this.publicLink = `${window.location.origin}/public/properties/${property.id}`;
        this.loading = false;
        this.loadSamsars(id);
        this.loadCalendarData(id);
      },
      error: () => {
        this.loading = false;
        this.snackBar.open(this.t('property_load_error'), this.t('close'), { duration: 3000 });
        this.router.navigate(['/properties']);
      },
    });
  }

  t(key: string): string {
    return TRANSLATIONS[key]?.[this.language] ?? key;
  }

  onMonthChange(value: string): void {
    this.selectedMonthValue = value;
    this.rebuildVisibleMonths(this.buildDayStatusMap());
  }

  selectDay(day: CalendarDay): void {
    if (!day.dayNumber) return;
    if (!this.startDate || this.endDate) {
      this.startDate = day.date;
      this.endDate = '';
      return;
    }
    if (day.date < this.startDate) {
      this.endDate = this.startDate;
      this.startDate = day.date;
      return;
    }
    this.endDate = day.date;
    this.rebuildVisibleMonths(this.buildDayStatusMap());
  }

  private loadCalendarData(propertyId: number): void {
    this.reservationService.findByProperty(propertyId).subscribe({
      next: (reservations) => {
        this.propertyReservations = reservations;
        this.applyCalendarState();
      },
      error: () => this.applyCalendarState(),
    });

    this.availabilityService.findByProperty(propertyId).subscribe({
      next: (availabilities) => {
        this.propertyAvailabilities = availabilities;
        this.applyCalendarState();
      },
      error: () => this.applyCalendarState(),
    });
  }

  private applyCalendarState(): void {
    this.rebuildVisibleMonths(this.buildDayStatusMap());
  }

  private buildDayStatusMap(): Record<string, 'free' | 'reserved' | 'pending' | 'blocked'> {
    const month = this.resolveMonth(this.selectedMonthValue);
    const rangeStart = new Date(month.year, month.monthIndex, 1).toISOString().slice(0, 10);
    const rangeEnd = new Date(month.year, month.monthIndex + 3, 0).toISOString().slice(0, 10);
    const reservations = this.propertyReservations.filter(reservation => reservation.startDate <= rangeEnd && reservation.endDate >= rangeStart);
    return createDayStatusMap(
      reservations.map(reservation => ({
        startDate: reservation.startDate,
        endDate: reservation.endDate,
        status: reservation.advanceAmount > 0 ? reservation.status : 'pending',
      })),
      this.propertyAvailabilities.filter(item => item.date >= rangeStart && item.date <= rangeEnd)
    );
  }

  private resolveMonth(value: string): { year: number; monthIndex: number } {
    const [year, monthIndex] = value.split('-').map(Number);
    return { year, monthIndex };
  }

  private rebuildVisibleMonths(dayStatuses: Record<string, 'free' | 'reserved' | 'pending' | 'blocked'>): void {
    const base = this.resolveMonth(this.selectedMonthValue);
    this.visibleMonths = [0, 1, 2].map(offset => {
      const date = new Date(base.year, base.monthIndex + offset, 1);
      return buildCalendarMonth(date.getFullYear(), date.getMonth(), dayStatuses, this.language);
    });
    this.calendar = this.visibleMonths[0];
  }

  isInRange(date: string): boolean {
    if (!this.startDate || !this.endDate || !date) {
      return false;
    }
    return date > this.startDate && date < this.endDate;
  }

  private loadSamsars(propertyId: number): void {
    const user = this.authService.getCurrentUser();
    if (user?.role === 'PROPRIETAIRE') {
      this.propertySamsarService.findByProperty(propertyId).subscribe({
        next: (rels) => {
          this.samsars = rels;
        },
      });
    }
  }

  editSamsarPrice(s: PropertySamsar): void {
    if (this.authService.getCurrentUser()?.role !== 'PROPRIETAIRE') return;
    const current = s.priceIncreaseTnd || 10;
    const result = prompt(this.t('margin_prompt'), String(current));
    if (!result) return;
    const val = parseInt(result, 10);
    if (![10, 20, 30].includes(val)) {
      this.snackBar.open(this.t('invalid_margin'), this.t('close'), { duration: 3000 });
      return;
    }
    this.propertySamsarService.updatePriceIncrease(s.propertyId, s.samsarId, val).subscribe({
      next: () => {
        this.snackBar.open(this.t('update_margin'), this.t('close'), { duration: 2500 });
        this.loadSamsars(this.property!.id);
      },
      error: () => this.snackBar.open(this.t('error_generic'), this.t('close'), { duration: 3000 }),
    });
  }

  removeSamsar(s: PropertySamsar): void {
    if (this.authService.getCurrentUser()?.role !== 'PROPRIETAIRE') return;
    const name = s.samsar?.name || '#' + s.samsarId;
    if (!confirm(this.t('remove_confirm').replace('{{name}}', name))) return;
    this.propertySamsarService.remove(s.propertyId, s.samsarId).subscribe({
      next: () => {
        this.snackBar.open(`${name} ${this.t('access_removed').toLowerCase()}`, this.t('close'), { duration: 2500 });
        this.samsars = this.samsars.filter(item => item !== s);
      },
      error: () => this.snackBar.open(this.t('error_generic'), this.t('close'), { duration: 3000 }),
    });
  }

  deleteProperty(): void {
    if (confirm(this.t('property_delete_confirm'))) {
      this.propertyService.remove(this.property!.id).subscribe({
        next: () => {
          this.snackBar.open(this.t('property_deleted'), this.t('close'), { duration: 3000 });
          this.router.navigate(['/properties']);
        },
        error: (err) => {
          const msg = err.error?.message || this.t('property_delete_error');
          this.snackBar.open(msg, this.t('close'), { duration: 5000 });
        },
      });
    }
  }

  copyPublicLink(): void {
    if (!this.publicLink) {
      return;
    }
    this.clipboard.copy(this.publicLink);
    this.snackBar.open(this.t('public_link_copied'), this.t('close'), { duration: 2500 });
  }

  formatPhone(phone?: string): string {
    return phone ? `+216 ${phone}` : '-';
  }
}
