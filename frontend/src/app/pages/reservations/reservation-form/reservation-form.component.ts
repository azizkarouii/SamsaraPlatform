import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { map } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { PropertyService } from '../../../services/property.service';
import { PropertySamsarService } from '../../../services/property-samsar.service';
import { ReservationService, CreateReservationDto } from '../../../services/reservation.service';
import { AvailabilityService } from '../../../services/availability.service';
import { UiPreferencesService } from '../../../services/ui-preferences.service';
import { Property } from '../../../models/property.model';
import { countReservationDays, normalizeReservationStatus } from '../../../models/reservation.model';
import { DayStatus, createDayStatusMap, formatIsoDate, isDayBookable, isRangeFree, parseIsoDate, rangeHasPending, todayIso } from '../../../shared/calendar-utils';
import { MatCalendarCellClassFunction } from '@angular/material/datepicker';
import { t } from '../../../shared/translations';

interface BookableProperty { property: Property; margin: number; }

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value as Date | null;
  const end = group.get('endDate')?.value as Date | null;
  if (start && end && end < start) {
    return { dateRange: true };
  }
  const total = Number(group.get('totalAmount')?.value ?? 0);
  const advance = Number(group.get('advanceAmount')?.value ?? 0);
  if (advance > total) {
    return { advanceTooHigh: true };
  }
  return null;
}

@Component({
  selector: 'app-reservation-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ isEdit ? t('reservation_edit_title') : t('reservation_new_title') }}</h1>
          <p class="subtitle">{{ t('reservation_form_subtitle') }}</p>
        </div>
        <button mat-stroked-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon> {{ t('back') }}
        </button>
      </div>

      <form class="layout" [formGroup]="form" (ngSubmit)="onSubmit()">
        <mat-card>
          <mat-card-content>
            <h3>{{ t('property_details') }}</h3>
            <mat-form-field appearance="outline">
              <mat-label>{{ t('property_label') }}</mat-label>
              <mat-select formControlName="propertyId" (selectionChange)="onPropertyChange()">
                <mat-option *ngFor="let item of properties" [value]="item.property.id">
                  {{ item.property.title }}
                  <span class="option-price" *ngIf="item.property.pricePerDay">· {{ unitPriceOf(item) | number:'1.0-0' }} TND/{{ t('day') }}</span>
                </mat-option>
              </mat-select>
              <mat-hint *ngIf="!properties.length && propertiesLoaded">{{ t('no_bookable_property') }}</mat-hint>
              <mat-error>{{ t('property_required') }}</mat-error>
            </mat-form-field>

            <h3>{{ t('dates_times') }}</h3>
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>{{ t('start_date_label') }}</mat-label>
                <input matInput [matDatepicker]="startPicker" [matDatepickerFilter]="dateFilter" [min]="minDate" formControlName="startDate" />
                <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
                <mat-datepicker #startPicker [dateClass]="dateClass"></mat-datepicker>
                <mat-error>{{ t('start_date_required') }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ t('end_date_label') }}</mat-label>
                <input matInput [matDatepicker]="endPicker" [matDatepickerFilter]="dateFilter" [min]="form.value.startDate ?? minDate" formControlName="endDate" />
                <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
                <mat-datepicker #endPicker [startAt]="form.value.startDate ?? null" [dateClass]="dateClass"></mat-datepicker>
                <mat-error>{{ t('end_date_required') }}</mat-error>
              </mat-form-field>
            </div>
            <div class="inline-error" *ngIf="form.hasError('dateRange')"><mat-icon>error</mat-icon>{{ t('end_before_start') }}</div>
            <div class="inline-error" *ngIf="rangeConflict"><mat-icon>event_busy</mat-icon>{{ t('dates_unavailable') }}</div>
            <div class="inline-warning" *ngIf="!rangeConflict && rangeOverridesPending"><mat-icon>hourglass_top</mat-icon>{{ t('dates_have_pending') }}</div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>{{ t('checkin_time') }}</mat-label>
                <input matInput type="time" formControlName="checkInTime" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ t('checkout_time') }}</mat-label>
                <input matInput type="time" formControlName="checkOutTime" />
              </mat-form-field>
            </div>

            <h3>{{ t('client_information') }}</h3>
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>{{ t('client_name_label') }}</mat-label>
                <input matInput formControlName="clientName" autocomplete="off" />
                <mat-error>{{ t('client_name_required') }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ t('client_phone_label') }}</mat-label>
                <span matTextPrefix>+216&nbsp;</span>
                <input matInput formControlName="clientPhone" inputmode="tel" />
                <mat-error>{{ t('phone_invalid') }}</mat-error>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('notes_label') }}</mat-label>
              <textarea matInput formControlName="notes" rows="3"></textarea>
            </mat-form-field>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary">
          <mat-card-content>
            <h3>{{ t('financial_details') }}</h3>
            <div class="summary-line">
              <span>{{ t('days_count') }}</span>
              <strong>{{ days }}</strong>
            </div>
            <div class="summary-line" *ngIf="selected?.property?.pricePerDay">
              <span>{{ t('price_per_day') }}</span>
              <strong>{{ selected!.property.pricePerDay | number:'1.0-0' }} TND<span *ngIf="selected!.margin"> + {{ selected!.margin }}</span></strong>
            </div>
            <div class="summary-line suggested" *ngIf="suggestedTotal">
              <span>{{ t('suggested_total') }}</span>
              <strong>{{ suggestedTotal | number:'1.0-0' }} TND</strong>
            </div>
            <p class="hint" *ngIf="selected?.margin">{{ t('margin_hint').replace('{{margin}}', '' + selected!.margin) }}</p>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('total_amount_label') }}</mat-label>
              <input matInput type="number" min="0" formControlName="totalAmount" (input)="totalTouched = true" />
              <span matTextSuffix>TND</span>
              <mat-error>{{ t('total_amount_required') }}</mat-error>
            </mat-form-field>
            <div class="inline-error" *ngIf="exceedsMax">
              <mat-icon>error</mat-icon>{{ t('total_above_max').replace('{{max}}', '' + maxTotal) }}
            </div>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('advance_amount_label') }}</mat-label>
              <input matInput type="number" min="0" formControlName="advanceAmount" />
              <span matTextSuffix>TND</span>
              <mat-hint *ngIf="!isEdit || editedStatus === 'pending'">{{ t('advance_confirms_hint') }}</mat-hint>
            </mat-form-field>
            <div class="inline-error" *ngIf="form.hasError('advanceTooHigh')"><mat-icon>error</mat-icon>{{ t('advance_above_total') }}</div>

            <div class="summary-line balance">
              <span>{{ t('balance_due') }}</span>
              <strong>{{ balance | number:'1.0-0' }} TND</strong>
            </div>

            <button mat-raised-button color="primary" type="submit" class="submit" [disabled]="form.invalid || loading || rangeConflict || exceedsMax">
              <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
              <span *ngIf="!loading">{{ isEdit ? t('update_reservation') : t('create_reservation') }}</span>
            </button>
            <p class="hint" *ngIf="!isEdit">{{ t('reservation_pending_hint') }}</p>
          </mat-card-content>
        </mat-card>
      </form>
    </div>
  `,
  styles: [`
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 1.25rem; align-items: start; }
    h3 { margin: 0.5rem 0 0.75rem; font-size: 0.95rem; font-weight: 600; color: var(--text-secondary); }
    .summary { position: sticky; top: 72px; }
    .summary-line { display: flex; justify-content: space-between; align-items: baseline; padding: 0.4rem 0; font-size: 0.9rem; }
    .summary-line.suggested { color: var(--primary); }
    .summary-line.balance { border-top: 1px solid var(--border-color); margin: 0.25rem 0 1rem; padding-top: 0.75rem; font-size: 1rem; }
    .option-price { color: var(--text-secondary); font-size: 0.85em; }
    .hint { font-size: 0.78rem; color: var(--text-secondary); margin: 0.25rem 0 0.75rem; }
    .submit { width: 100%; height: 44px; }
    .submit mat-spinner { margin: 0 auto; }
    .inline-error { display: flex; align-items: center; gap: 0.35rem; color: var(--status-cancelled); font-size: 0.82rem; margin: -0.5rem 0 0.75rem; }
    .inline-warning { display: flex; align-items: flex-start; gap: 0.35rem; color: var(--status-pending); font-size: 0.82rem; margin: -0.5rem 0 0.75rem; }
    .inline-warning mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    .inline-error mat-icon { font-size: 18px; width: 18px; height: 18px; }
    @media (max-width: 960px) {
      .layout { grid-template-columns: 1fr; }
      .summary { position: static; }
    }
  `]
})
export class ReservationFormComponent implements OnInit {
  isEdit = false;
  reservationId?: number;
  loading = false;
  properties: BookableProperty[] = [];
  propertiesLoaded = false;
  totalTouched = false;
  minDate: Date | null = new Date();
  private dayStatuses: Record<string, DayStatus> = {};
  private ownRange?: { startDate: string; endDate: string };
  /** Status of the reservation being edited: a pending one gets confirmed once an advance is entered. */
  editedStatus?: string;
  private pendingPropertyId?: number;

  form = this.fb.group({
    propertyId: [null as number | null, Validators.required],
    clientName: ['', [Validators.required, Validators.minLength(2)]],
    clientPhone: ['', Validators.pattern(/^[\d\s+]{8,15}$/)],
    startDate: [null as Date | null, Validators.required],
    endDate: [null as Date | null, Validators.required],
    checkInTime: ['14:00'],
    checkOutTime: ['12:00'],
    totalAmount: [0, [Validators.required, Validators.min(0)]],
    advanceAmount: [0, Validators.min(0)],
    notes: [''],
  }, { validators: dateRangeValidator });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private reservationService: ReservationService,
    private propertyService: PropertyService,
    private propertySamsarService: PropertySamsarService,
    private availabilityService: AvailabilityService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private uiPrefs: UiPreferencesService,
  ) {}

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  ngOnInit(): void {
    // Dates may be picked in the calendar or typed: recompute the suggested total either way
    let lastRange = '';
    this.form.valueChanges.subscribe(() => {
      const range = `${this.startIso}|${this.endIso}`;
      if (range !== lastRange) {
        lastRange = range;
        this.recalculate();
      }
    });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.minDate = null;
      this.reservationId = +id;
      this.loadReservation(this.reservationId);
    } else {
      // Prefill from the property calendar ("Reserve these dates")
      const query = this.route.snapshot.queryParamMap;
      const propertyId = Number(query.get('propertyId'));
      if (propertyId) {
        this.pendingPropertyId = propertyId;
      }
      const start = query.get('start');
      const end = query.get('end');
      if (start) this.form.patchValue({ startDate: parseIsoDate(start) });
      if (end) this.form.patchValue({ endDate: parseIsoDate(end) });
    }
    this.loadProperties();
  }

  private loadProperties(): void {
    const isSamsar = this.authService.getCurrentUser()?.role === 'SAMSAR';
    const source$ = isSamsar
      ? this.propertySamsarService.findMine().pipe(map(rels => rels
          .filter(r => !!r.property)
          .map(r => ({ property: r.property!, margin: r.priceIncreaseTnd || 0 }))))
      : this.propertyService.findMine().pipe(map(props => props.map(property => ({ property, margin: 0 }))));

    source$.subscribe({
      next: (items) => {
        this.properties = items;
        this.propertiesLoaded = true;
        if (this.pendingPropertyId && items.some(i => i.property.id === this.pendingPropertyId)) {
          this.form.patchValue({ propertyId: this.pendingPropertyId });
          this.pendingPropertyId = undefined;
        }
        this.onPropertyChange();
      },
      error: () => this.propertiesLoaded = true,
    });
  }

  private loadReservation(id: number): void {
    this.reservationService.findOne(id).subscribe({
      next: (reservation) => {
        this.ownRange = { startDate: reservation.startDate, endDate: reservation.endDate };
        this.editedStatus = normalizeReservationStatus(reservation.status);
        this.totalTouched = true;
        this.pendingPropertyId = reservation.propertyId;
        this.form.patchValue({
          propertyId: reservation.propertyId,
          clientName: reservation.clientName,
          clientPhone: reservation.clientPhone || '',
          startDate: parseIsoDate(reservation.startDate),
          endDate: parseIsoDate(reservation.endDate),
          checkInTime: reservation.checkInTime,
          checkOutTime: reservation.checkOutTime,
          totalAmount: reservation.totalAmount,
          advanceAmount: reservation.advanceAmount,
          notes: reservation.notes || '',
        });
        // The property cannot be changed once the reservation exists
        this.form.get('propertyId')?.disable();
        this.onPropertyChange();
      },
      error: () => {
        this.snackBar.open(this.t('reservation_failed_load'), this.t('close'), { duration: 3000 });
        this.router.navigate(['/reservations']);
      },
    });
  }

  get selected(): BookableProperty | undefined {
    const id = this.form.getRawValue().propertyId;
    return this.properties.find(p => p.property.id === id);
  }

  unitPriceOf(item: BookableProperty): number {
    return (item.property.pricePerDay || 0) + item.margin;
  }

  get startIso(): string {
    const value = this.form.value.startDate;
    return value ? formatIsoDate(value) : '';
  }

  get endIso(): string {
    const value = this.form.value.endDate;
    return value ? formatIsoDate(value) : '';
  }

  get days(): number {
    return countReservationDays(this.startIso, this.endIso);
  }

  get suggestedTotal(): number {
    return this.selected?.property.pricePerDay ? this.days * this.unitPriceOf(this.selected) : 0;
  }

  /** A samsar may not sell above price + margin granted by the owner. */
  get maxTotal(): number {
    return this.selected?.margin ? this.suggestedTotal : 0;
  }

  get exceedsMax(): boolean {
    return this.maxTotal > 0 && Number(this.form.value.totalAmount ?? 0) > this.maxTotal;
  }

  get balance(): number {
    return Math.max(0, Number(this.form.value.totalAmount || 0) - Number(this.form.value.advanceAmount || 0));
  }

  get rangeConflict(): boolean {
    return !!this.startIso && !!this.endIso && this.endIso >= this.startIso
      && !isRangeFree(this.startIso, this.endIso, this.dayStatuses);
  }

  /** Selected dates cover a pending request: allowed, it is overridden if this booking is confirmed first. */
  get rangeOverridesPending(): boolean {
    return !!this.startIso && !!this.endIso && this.endIso >= this.startIso
      && rangeHasPending(this.startIso, this.endIso, this.dayStatuses);
  }

  dateFilter = (date: Date | null): boolean => {
    if (!date) return true;
    return isDayBookable(this.dayStatuses[formatIsoDate(date)]);
  };

  /** Pending requests stay visible (orange) in the pickers even though their dates remain bookable. */
  dateClass: MatCalendarCellClassFunction<Date> = (date, view) =>
    view === 'month' && this.dayStatuses[formatIsoDate(date)] === 'pending' ? 'date-pending' : '';

  onPropertyChange(): void {
    const propertyId = this.form.getRawValue().propertyId;
    this.dayStatuses = {};
    if (!propertyId) {
      return;
    }
    this.availabilityService.getOccupancy(propertyId).subscribe({
      next: (occupancy) => {
        const statuses = createDayStatusMap(occupancy.reservations, occupancy.blockedDates);
        if (this.ownRange) {
          // The reservation being edited must not block its own dates
          const own = createDayStatusMap([{ ...this.ownRange, status: 'confirmed' }]);
          Object.keys(own).forEach(day => {
            if (statuses[day] !== 'blocked') delete statuses[day];
          });
        }
        this.dayStatuses = statuses;
      },
    });
    this.recalculate();
  }

  recalculate(): void {
    if (!this.totalTouched && this.suggestedTotal) {
      this.form.patchValue({ totalAmount: this.suggestedTotal });
    }
  }

  goBack(): void {
    if (this.isEdit) {
      this.router.navigate(['/reservations', this.reservationId]);
    } else {
      this.router.navigate(['/reservations']);
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.rangeConflict) return;
    const value = this.form.getRawValue();
    const dto: CreateReservationDto = {
      propertyId: value.propertyId!,
      clientName: value.clientName!.trim(),
      clientPhone: value.clientPhone?.trim() || undefined,
      startDate: this.startIso,
      endDate: this.endIso,
      checkInTime: value.checkInTime || '14:00',
      checkOutTime: value.checkOutTime || '12:00',
      totalAmount: Number(value.totalAmount),
      advanceAmount: Number(value.advanceAmount || 0),
      notes: value.notes || undefined,
    };

    this.loading = true;
    const obs = this.isEdit
      ? this.reservationService.update(this.reservationId!, dto)
      : this.reservationService.create(dto);

    obs.subscribe({
      next: (saved) => {
        const message = this.isEdit ? this.t('reservation_update_success') : this.t('reservation_create_success');
        this.snackBar.open(message, this.t('close'), { duration: 3000 });
        this.router.navigate(['/reservations', saved.id]);
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.message || this.t('error_generic'), this.t('close'), { duration: 5000 });
      },
    });
  }
}
