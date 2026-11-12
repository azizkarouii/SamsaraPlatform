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

interface BookableProperty { property: Property; margin: number;
  commissionPercent: number; }

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

import { PriceStretch, priceStretches, stretchesTotal } from '../../../shared/pricing';
import { PropertyThumbComponent } from '../../../shared/property-thumb.component';
import { RangeCalendarComponent } from '../../../shared/range-calendar.component';
import { getMonthLabel, getWeekdayLabels } from '../../../shared/calendar-utils';
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
    PropertyThumbComponent,
    RangeCalendarComponent,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ isEdit ? t('reservation_edit_title') : t('reservation_new_title') }}</h1>
          <p class="subtitle">{{ t('reservation_form_subtitle') }}</p>
        </div>
        <button mat-stroked-button type="button" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon> {{ t('back') }}
        </button>
      </div>

      <form class="layout" [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="steps">
          <!-- 1. House -->
          <section class="step-card">
            <h2 class="step-title"><span class="num" [class.done]="!!selected">1</span>{{ t('property_label') }}</h2>
            <p class="hint" *ngIf="!properties.length && propertiesLoaded">{{ t('no_bookable_property') }}</p>
            <div class="houses" role="radiogroup" [attr.aria-label]="t('property_label')">
              <button type="button" role="radio" class="house-pick" *ngFor="let item of shownProperties"
                      [class.active]="item.property.id === form.getRawValue().propertyId"
                      [attr.aria-checked]="item.property.id === form.getRawValue().propertyId"
                      [disabled]="isEdit" (click)="selectProperty(item.property.id)">
                <app-property-thumb class="pick-photo" [path]="item.property.coverImage"></app-property-thumb>
                <span class="pick-body">
                  <strong>{{ item.property.title }}</strong>
                  <span>{{ item.property.configuration || '' }}<ng-container *ngIf="item.property.address"> · {{ item.property.address }}</ng-container></span>
                  <b class="pick-price" *ngIf="item.property.pricePerDay">{{ unitPriceOf(item) | number:'1.0-0' }} TND <small>/ {{ t('day') }}</small></b>
                </span>
                <mat-icon class="check" aria-hidden="true">check_circle</mat-icon>
              </button>
            </div>
          </section>

          <!-- 2. Dates -->
          <section class="step-card" [class.locked]="!selected">
            <h2 class="step-title"><span class="num" [class.done]="!!startIso && !!endIso && !rangeConflict">2</span>{{ t('dates_times') }}</h2>
            <app-range-calendar *ngIf="selected; else pickHouseFirst" [start]="startIso" [end]="endIso" [statuses]="statuses"
                                [minDate]="isEdit ? null : today" [language]="language" [labels]="calendarLabels"
                                (rangeChange)="onRange($event)"></app-range-calendar>
            <ng-template #pickHouseFirst><p class="hint">{{ t('pick_house_first') }}</p></ng-template>
            <div class="inline-error" *ngIf="form.hasError('dateRange')"><mat-icon>error</mat-icon>{{ t('end_before_start') }}</div>
            <div class="inline-error" *ngIf="rangeConflict"><mat-icon>event_busy</mat-icon>{{ t('dates_unavailable') }}</div>
            <div class="inline-warning" *ngIf="!rangeConflict && rangeOverridesPending"><mat-icon>hourglass_top</mat-icon>{{ t('dates_have_pending') }}</div>
            <div class="form-row times">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>{{ t('checkin_time') }}</mat-label>
                <input matInput type="time" formControlName="checkInTime" />
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>{{ t('checkout_time') }}</mat-label>
                <input matInput type="time" formControlName="checkOutTime" />
              </mat-form-field>
            </div>
          </section>

          <!-- 3. Client -->
          <section class="step-card">
            <h2 class="step-title"><span class="num" [class.done]="form.get('clientName')?.valid">3</span>{{ t('client_information') }}</h2>
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
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ t('notes_label') }}</mat-label>
              <textarea matInput formControlName="notes" rows="2"></textarea>
            </mat-form-field>
          </section>

          <!-- 4. Price -->
          <section class="step-card">
            <h2 class="step-title"><span class="num" [class.done]="Number(form.value.totalAmount) > 0 && !exceedsMax">4</span>{{ t('financial_details') }}</h2>
            <button mat-button type="button" color="primary" class="negotiate-toggle"
                    *ngIf="!showNegotiated && selected?.property?.pricePerDay" (click)="openNegotiated()">
              <mat-icon>add</mat-icon> {{ t('add_negotiated_price') }}
            </button>
            <mat-form-field appearance="outline" class="field-with-hint" subscriptSizing="dynamic" *ngIf="showNegotiated">
              <mat-label>{{ t('negotiated_price') }}</mat-label>
              <input matInput type="number" min="1" formControlName="negotiatedPrice" (input)="applyNegotiatedTotal()" />
              <span matTextSuffix>TND</span>
              <button mat-icon-button matSuffix type="button" (click)="closeNegotiated()"
                      [attr.aria-label]="t('remove_negotiated_price')"><mat-icon>close</mat-icon></button>
              <mat-hint>{{ negotiatedHint }}</mat-hint>
            </mat-form-field>
            <div class="inline-error" *ngIf="negotiatedTooHigh"><mat-icon>error</mat-icon>{{ t('negotiated_too_high') }}</div>
            <p class="hint" *ngIf="deal.margin">{{ t('margin_hint').replace('{{margin}}', '' + deal.margin) }}</p>
            <p class="hint" *ngIf="deal.commissionPercent">{{ t('commission_hint').replace('{{percent}}', '' + deal.commissionPercent) }}</p>
            <div class="form-row">
              <mat-form-field appearance="outline" class="field-with-hint" subscriptSizing="dynamic">
                <mat-label>{{ t('total_amount_label') }}</mat-label>
                <input matInput type="number" min="0" formControlName="totalAmount" (input)="totalTouched = true" />
                <span matTextSuffix>TND</span>
                <mat-hint *ngIf="suggestedTotal && totalTouched && Number(form.value.totalAmount) !== suggestedTotal">
                  <button type="button" class="link-btn" (click)="useSuggested()">{{ t('suggested_total') }} : {{ suggestedTotal | number:'1.0-0' }} TND</button>
                </mat-hint>
                <mat-error>{{ t('total_amount_required') }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline" class="field-with-hint" subscriptSizing="dynamic">
                <mat-label>{{ t('advance_amount_label') }}</mat-label>
                <input matInput type="number" min="0" formControlName="advanceAmount" />
                <span matTextSuffix>TND</span>
                <mat-hint *ngIf="!isEdit || editedStatus === 'pending'">{{ t('advance_confirms_hint') }}</mat-hint>
              </mat-form-field>
            </div>
            <div class="advance-quick" *ngIf="Number(form.value.totalAmount) > 0">
              <span>{{ t('advance_quick') }}</span>
              <button type="button" *ngFor="let share of [0, 25, 30, 50, 100]" (click)="setAdvance(share)"
                      [class.active]="advanceShare === share">{{ share }} %</button>
            </div>
            <div class="inline-error" *ngIf="exceedsMax"><mat-icon>error</mat-icon>{{ t('total_above_max').replace('{{max}}', '' + maxTotal) }}</div>
            <div class="inline-error" *ngIf="form.hasError('advanceTooHigh')"><mat-icon>error</mat-icon>{{ t('advance_above_total') }}</div>
          </section>
        </div>

        <!-- The ticket: what the client will pay, updated while typing -->
        <aside class="ticket">
          <div class="ticket-cover">
            <app-property-thumb class="ticket-photo" [path]="selected?.property?.coverImage"></app-property-thumb>
            <span class="shade" aria-hidden="true"></span>
            <div class="ticket-house">
              <strong>{{ selected?.property?.title || t('summary_no_house') }}</strong>
              <span *ngIf="selected?.property?.address">{{ selected?.property?.address }}</span>
            </div>
          </div>
          <div class="ticket-body">
            <div class="leaves" *ngIf="startIso; else noDates">
              <div class="leaf">
                <span class="leaf-label">{{ t('arrival') }}</span>
                <strong>{{ leaf(startIso).day }}</strong>
                <span class="leaf-month">{{ leaf(startIso).weekday }} · {{ leaf(startIso).month }}</span>
                <span class="leaf-time">{{ form.value.checkInTime }}</span>
              </div>
              <div class="nights"><b>{{ endIso ? days : '…' }}</b><span>{{ t('days_short') }}</span></div>
              <div class="leaf" [class.empty]="!endIso">
                <span class="leaf-label">{{ t('departure') }}</span>
                <ng-container *ngIf="endIso; else noEnd">
                  <strong>{{ leaf(endIso).day }}</strong>
                  <span class="leaf-month">{{ leaf(endIso).weekday }} · {{ leaf(endIso).month }}</span>
                  <span class="leaf-time">{{ form.value.checkOutTime }}</span>
                </ng-container>
                <ng-template #noEnd><span class="leaf-month">{{ t('choose_end_date') }}</span></ng-template>
              </div>
            </div>
            <ng-template #noDates><p class="hint center">{{ t('summary_pick_dates') }}</p></ng-template>

            <div class="lines" *ngIf="selected?.property?.pricePerDay && endIso">
              <div class="line" *ngIf="stretches.length < 2">
                <span>{{ days }} × {{ dayPrice | number:'1.0-0' }} TND</span>
                <strong>{{ suggestedTotal && !negotiated ? (suggestedTotal | number:'1.0-0') + ' TND' : '' }}</strong>
              </div>
              <div class="line" *ngFor="let stretch of stretches.length > 1 ? stretches : []">
                <span>{{ stretch.days }} × {{ stretch.pricePerDay + deal.margin | number:'1.0-0' }} TND</span>
                <strong>{{ stretch.days * (stretch.pricePerDay + deal.margin) | number:'1.0-0' }} TND</strong>
              </div>
              <div class="line" *ngIf="negotiated"><span>{{ t('negotiated_price') }} · {{ days }} × {{ negotiated | number:'1.0-0' }}</span><strong>{{ negotiated * days | number:'1.0-0' }} TND</strong></div>
            </div>

            <div class="total">
              <span>{{ t('total_amount_label') }}</span>
              <b>{{ Number(form.value.totalAmount || 0) | number:'1.0-0' }} <small>TND</small></b>
            </div>
            <div class="line"><span>{{ t('advance_amount_label') }}</span><strong>{{ Number(form.value.advanceAmount || 0) | number:'1.0-0' }} TND</strong></div>
            <div class="line balance"><span>{{ t('balance_due') }}</span><strong>{{ balance | number:'1.0-0' }} TND</strong></div>
            <div class="line gain" *ngIf="showsGain"><span>{{ t('your_gain') }}</span><strong>{{ estimatedGain | number:'1.0-2' }} TND</strong></div>

            <p class="status-hint" *ngIf="!isEdit">
              <mat-icon>{{ Number(form.value.advanceAmount) > 0 ? 'event_available' : 'hourglass_top' }}</mat-icon>
              {{ t(Number(form.value.advanceAmount) > 0 ? 'summary_will_confirm' : 'reservation_pending_hint') }}
            </p>

            <button mat-raised-button color="primary" type="submit" class="submit" [disabled]="form.invalid || loading || rangeConflict || exceedsMax || negotiatedTooHigh">
              <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
              <span *ngIf="!loading">{{ isEdit ? t('update_reservation') : t('create_reservation') }}</span>
            </button>
            <p class="missing" *ngIf="form.invalid && !loading">{{ missingLabel }}</p>
          </div>
        </aside>
      </form>
    </div>
  `,
  styles: [`
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 1.25rem; align-items: start; }
    .steps { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
    .hint { font-size: 0.8rem; color: var(--text-secondary); margin: 0.25rem 0 0.75rem; }
    .hint.center { text-align: center; margin: 1rem 0; }

    .houses { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 0.6rem; max-height: 340px; overflow-y: auto; padding: 2px; }
    .house-pick { position: relative; display: flex; align-items: center; gap: 0.7rem; padding: 0.55rem; border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); font: inherit; text-align: start; cursor: pointer; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .house-pick:hover:not(:disabled) { border-color: var(--primary); }
    .house-pick.active { border-color: var(--primary-strong); box-shadow: inset 0 0 0 1px var(--primary-strong); background: var(--primary-soft); }
    .house-pick:disabled:not(.active) { display: none; }
    .house-pick:disabled { cursor: default; }
    .pick-photo { --thumb-w: 64px; --thumb-radius: 10px; }
    .pick-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .pick-body strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pick-body span { font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pick-price { font-size: 0.85rem; margin-top: 2px; }
    .pick-price small { font-weight: 400; color: var(--text-secondary); }
    .check { position: absolute; top: 6px; inset-inline-end: 6px; font-size: 20px; width: 20px; height: 20px; color: var(--primary-strong); opacity: 0; transition: opacity 0.15s ease; }
    .house-pick.active .check { opacity: 1; }
    .times { margin-top: 1rem; }

    .negotiate-toggle { display: block; margin: 0 0 0.5rem; }
    .link-btn { border: 0; background: none; padding: 0; font: inherit; color: var(--primary); cursor: pointer; text-decoration: underline; }
    .advance-quick { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; margin: 0.75rem 0 0.25rem; font-size: 0.8rem; color: var(--text-secondary); }
    .advance-quick button { border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); border-radius: 999px; padding: 2px 10px; font: inherit; font-size: 0.78rem; font-weight: 600; cursor: pointer; }
    .advance-quick button:hover { border-color: var(--primary); }
    .advance-quick button.active { background: var(--primary-strong); border-color: var(--primary-strong); color: #fff; }

    .ticket { position: sticky; top: 72px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 18px; box-shadow: var(--shadow-md); overflow: hidden; }
    .ticket-cover { position: relative; }
    .ticket-photo { --thumb-w: 100%; --thumb-ratio: 16 / 7; --thumb-radius: 0; display: grid; }
    .shade { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.6)); pointer-events: none; }
    .ticket-house { position: absolute; bottom: 10px; inset-inline: 14px; display: flex; flex-direction: column; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.4); }
    .ticket-house strong { font-family: var(--display-font); font-size: 1.5rem; line-height: 1.1; }
    .ticket-house span { font-size: 0.78rem; opacity: 0.9; }
    .ticket-body { padding: 1rem 1.1rem 1.1rem; display: flex; flex-direction: column; gap: 0.3rem; border-top: 2px dashed var(--border-color); }
    .leaves { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .leaf { display: flex; flex-direction: column; align-items: center; padding: 0.5rem 0.25rem; border: 1px solid var(--border-color); border-radius: 12px; text-align: center; min-height: 92px; justify-content: center; }
    .leaf.empty { border-style: dashed; }
    .leaf strong { font-family: var(--display-font); font-size: 2rem; line-height: 1; }
    .leaf-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-secondary); }
    .leaf-month { font-size: 0.72rem; color: var(--accent-gold); font-weight: 600; }
    .leaf-time { margin-top: 2px; font-size: 0.72rem; font-weight: 700; padding: 0 6px; border-radius: 6px; background: var(--surface-subtle); }
    .nights { display: flex; flex-direction: column; align-items: center; color: var(--text-secondary); font-size: 0.7rem; }
    .nights b { font-family: var(--display-font); font-size: 1.4rem; color: var(--text-primary); }
    .lines { border-bottom: 1px solid var(--border-color); padding-bottom: 0.4rem; margin-bottom: 0.2rem; }
    .line { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; font-size: 0.85rem; padding: 0.15rem 0; }
    .line span { color: var(--text-secondary); }
    .total { display: flex; justify-content: space-between; align-items: baseline; padding: 0.3rem 0; }
    .total b { font-family: var(--display-font); font-size: 2.2rem; line-height: 1; color: var(--primary-strong); }
    .total small { font-size: 0.9rem; color: var(--text-secondary); }
    .line.balance { border-top: 1px solid var(--border-color); padding-top: 0.45rem; }
    .line.balance strong { font-size: 1rem; }
    .line.gain strong { color: var(--accent-gold); }
    .status-hint { display: flex; align-items: flex-start; gap: 0.4rem; margin: 0.5rem 0; font-size: 0.78rem; color: var(--text-secondary); }
    .status-hint mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--accent-gold); flex-shrink: 0; }
    .submit { width: 100%; height: 46px; }
    .submit mat-spinner { margin: 0 auto; }
    .missing { margin: 0.4rem 0 0; font-size: 0.75rem; color: var(--text-secondary); text-align: center; }

    @media (max-width: 1000px) {
      .layout { grid-template-columns: 1fr; }
      .ticket { position: static; }
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
  private frozenDeal?: { margin: number; commissionPercent: number };
  private frozenBaseAmount?: number | null;

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
    negotiatedPrice: [null as number | null, Validators.min(1)],
  }, { validators: dateRangeValidator });
  showNegotiated = false;

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
          .map(r => ({ property: r.property!, margin: r.priceIncreaseTnd || 0, commissionPercent: r.commissionPercent || 0 }))))
      : this.propertyService.findMine().pipe(map(props => props.map(property => ({ property, margin: 0, commissionPercent: 0 }))));

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
        this.frozenDeal = {
          margin: reservation.samsarMarginTnd || 0,
          commissionPercent: reservation.samsarCommissionPercent || 0,
        };
        this.frozenBaseAmount = reservation.baseAmount;
        this.showNegotiated = !!reservation.negotiatedPricePerDay;
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
          negotiatedPrice: reservation.negotiatedPricePerDay ?? null,
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

  readonly today = todayIso();
  readonly Number = Number;

  get language() {
    return this.uiPrefs.getLanguage();
  }

  /** Day statuses of the selected house, for the calendar. */
  get statuses(): Record<string, DayStatus> {
    return this.dayStatuses;
  }

  /** When editing, only the booked house is listed (it cannot change). */
  get shownProperties(): BookableProperty[] {
    return this.isEdit ? this.properties.filter(p => p.property.id === this.form.getRawValue().propertyId) : this.properties;
  }

  get calendarLabels() {
    return {
      pickStart: this.t('choose_start_date'), pickEnd: this.t('choose_end_date'), previous: this.t('previous'), next: this.t('next'),
      today: this.t('today'), selected: this.t('summary_selected'), pending: this.t('status_pending'), reserved: this.t('reserved'),
      blocked: this.t('planning_blocked'),
    };
  }

  selectProperty(id: number): void {
    if (this.isEdit) return;
    this.form.patchValue({ propertyId: id });
    this.onPropertyChange();
  }

  /** A day picked in the calendar: the arrival, then the departure. */
  onRange(range: { start: string; end: string }): void {
    this.form.patchValue({
      startDate: range.start ? parseIsoDate(range.start) : null,
      endDate: range.end ? parseIsoDate(range.end) : null,
    });
    this.form.get('startDate')?.markAsTouched();
  }

  leaf(iso: string): { day: number; weekday: string; month: string } {
    const date = parseIsoDate(iso);
    return {
      day: date.getDate(),
      weekday: getWeekdayLabels(this.language)[(date.getDay() + 6) % 7],
      month: getMonthLabel(date.getMonth(), this.language),
    };
  }

  /** Nightly price charged when the whole stay has one price (house price, or its period, plus the margin). */
  get dayPrice(): number {
    return (this.stretches[0]?.pricePerDay ?? this.selected?.property.pricePerDay ?? 0) + this.deal.margin;
  }

  useSuggested(): void {
    this.form.patchValue({ totalAmount: this.suggestedTotal });
  }

  /** Share of the total paid as advance, when it is one of the quick choices. */
  get advanceShare(): number | null {
    const total = Number(this.form.value.totalAmount || 0);
    if (!total) return null;
    const share = Math.round(Number(this.form.value.advanceAmount || 0) * 100 / total);
    return [0, 25, 30, 50, 100].includes(share) ? share : null;
  }

  setAdvance(share: number): void {
    const total = Number(this.form.value.totalAmount || 0);
    this.form.patchValue({ advanceAmount: Math.round(total * share / 100) });
  }

  /** What is still missing before the booking can be saved, said plainly under the button. */
  get missingLabel(): string {
    const missing: string[] = [];
    if (this.form.get('propertyId')?.invalid) missing.push(this.t('property_label'));
    if (this.form.get('startDate')?.invalid || this.form.get('endDate')?.invalid) missing.push(this.t('dates_times'));
    if (this.form.get('clientName')?.invalid) missing.push(this.t('client_name_label'));
    if (this.form.get('totalAmount')?.invalid) missing.push(this.t('total_amount_label'));
    return missing.length ? this.t('summary_missing') + ' ' + missing.join(', ') : '';
  }

  get selected(): BookableProperty | undefined {
    const id = this.form.getRawValue().propertyId;
    return this.properties.find(p => p.property.id === id);
  }

  /** The deal in force: the one frozen on a booking being edited, otherwise the one of the selected house. */
  get deal(): { margin: number; commissionPercent: number } {
    return this.frozenDeal ?? {
      margin: this.selected?.margin || 0,
      commissionPercent: this.selected?.commissionPercent || 0,
    };
  }

  unitPriceOf(item: BookableProperty): number {
    return (item.property.pricePerDay || 0) + (item === this.selected ? this.deal.margin : item.margin);
  }

  get isSamsar(): boolean {
    return this.authService.getCurrentUser()?.role === 'SAMSAR';
  }

  get showsGain(): boolean {
    return this.isSamsar && !!(this.deal.margin || this.deal.commissionPercent);
  }

  get negotiated(): number {
    return this.showNegotiated ? Number(this.form.value.negotiatedPrice || 0) : 0;
  }

  get negotiatedHint(): string {
    if (!this.isSamsar) return this.t('negotiated_hint_owner');
    return this.deal.commissionPercent
      ? this.t('negotiated_hint_commission').replace('{{percent}}', '' + this.deal.commissionPercent)
      : this.t('negotiated_hint_samsar').replace('{{margin}}', '' + this.deal.margin);
  }

  /** Must stay below the usual price of the stay, like on the server. */
  get negotiatedTooHigh(): boolean {
    return this.negotiated > 0 && this.baseAmount > 0 && this.negotiated * this.days >= this.baseAmount;
  }

  openNegotiated(): void {
    this.showNegotiated = true;
  }

  closeNegotiated(): void {
    this.showNegotiated = false;
    this.form.patchValue({ negotiatedPrice: null });
    this.applyNegotiatedTotal();
  }

  /** Choosing or removing a negotiated price is an explicit change of the amount to pay. */
  applyNegotiatedTotal(): void {
    if (this.suggestedTotal) {
      this.form.patchValue({ totalAmount: this.suggestedTotal });
    }
  }

  /** Mirrors the server: a commission on the total, or what is charged above the house price (on a negotiated price, the margin per day still applies). */
  get estimatedGain(): number {
    const total = Number(this.form.value.totalAmount || 0);
    if (this.deal.commissionPercent) {
      return Math.round(total * this.deal.commissionPercent) / 100;
    }
    if (this.negotiated) {
      return Math.min(total, this.days * this.deal.margin);
    }
    return Math.max(0, total - this.baseAmount);
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

  /** The stay split by nightly price, for the selected house and dates. */
  get stretches(): PriceStretch[] {
    const property = this.selected?.property;
    return priceStretches(property?.pricePerDay, property?.seasonalPrices, this.startIso, this.endIso);
  }

  /** Price at the house rates; a booking edited without changing its dates keeps its original price. */
  get baseAmount(): number {
    const sameDates = this.ownRange?.startDate === this.startIso && this.ownRange?.endDate === this.endIso;
    return sameDates && this.frozenBaseAmount != null ? this.frozenBaseAmount : stretchesTotal(this.stretches);
  }

  get suggestedTotal(): number {
    if (this.negotiated) {
      return this.negotiated * this.days;
    }
    return this.selected?.property.pricePerDay ? this.baseAmount + this.days * this.deal.margin : 0;
  }

  /** A samsar may not sell above price + margin granted by the owner (the house price with a commission). */
  get maxTotal(): number {
    return this.deal.margin || this.deal.commissionPercent ? this.suggestedTotal : 0;
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
    if (this.form.invalid || this.rangeConflict || this.negotiatedTooHigh) return;
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
      negotiatedPricePerDay: this.negotiated,
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
