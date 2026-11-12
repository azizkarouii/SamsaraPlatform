import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormControl, ReactiveFormsModule, FormBuilder, ValidationErrors, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PropertyService } from '../../../services/property.service';
import { AuthService } from '../../../services/auth.service';
import { Property } from '../../../models/property.model';
import { UiPreferencesService } from '../../../services/ui-preferences.service';
import { t } from '../../../shared/translations';

import { PropertyPhotosEditorComponent } from '../../../shared/property-photos-editor.component';
import { periodCovers, toDayMonth, toMonthDay } from '../../../shared/pricing';
import { SeasonalPrice } from '../../../models/property.model';

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** A day of the year written jj/mm, 29/02 included. */
function isDayMonth(value: unknown): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(String(value ?? ''));
  if (!match) return false;
  const [day, month] = [Number(match[1]), Number(match[2])];
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1];
}

function validDayMonth(control: AbstractControl): ValidationErrors | null {
  return !control.value || isDayMonth(control.value) ? null : { dayMonth: true };
}

/** One night cannot have two prices: checks each day of the year, periods may cross the new year. */
function seasonsDoNotOverlap(rows: AbstractControl): ValidationErrors | null {
  const periods = (rows.value as { startDate: string; endDate: string }[])
    .filter(row => isDayMonth(row.startDate) && isDayMonth(row.endDate))
    .map(row => ({ startDate: toMonthDay(row.startDate), endDate: toMonthDay(row.endDate) }));
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= DAYS_IN_MONTH[month - 1]; day++) {
      const monthDay = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (periods.filter(period => periodCovers(period, monthDay)).length > 1) {
        return { overlap: true };
      }
    }
  }
  return null;
}

/** Prices by period complete the main price, which applies on every other day. */
function seasonsNeedMainPrice(form: AbstractControl): ValidationErrors | null {
  return form.value.seasonalPrices?.length && !form.value.pricePerDay ? { mainPriceRequired: true } : null;
}

import { MatSelectModule } from '@angular/material/select';
import { HOUSE_TYPES } from '../../../shared/house-types';
import { PropertyThumbComponent } from '../../../shared/property-thumb.component';
@Component({
  selector: 'app-property-form',
  standalone: true,
  imports: [
    PropertyPhotosEditorComponent,
    PropertyThumbComponent,
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSelectModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ isEdit ? t('edit_property_title') : t('add_property') }}</h1>
          <p class="subtitle">{{ t('property_form_subtitle') }}</p>
        </div>
        <button mat-stroked-button type="button" routerLink="/properties">
          <mat-icon>arrow_back</mat-icon> {{ t('back_to_list') }}
        </button>
      </div>

      <div class="form-layout">
          <form [formGroup]="propertyForm" (ngSubmit)="onSubmit()" class="steps">
            <section class="step-card">
            <h2 class="step-title"><span class="num" [class.done]="propertyForm.get('title')?.valid">1</span>{{ t('basic_information') }}</h2>

            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-2">
                <mat-label>{{ t('title_col') }}</mat-label>
                <input matInput formControlName="title" placeholder="{{ t('title_col') }}" />
                <mat-error *ngIf="propertyForm.get('title')?.hasError('required')">{{ t('property_title_required') }}</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>{{ t('configuration') }}</mat-label>
                <mat-select formControlName="configuration">
                  <mat-option value="">{{ t('not_specified') }}</mat-option>
                  <mat-option *ngFor="let type of houseTypes" [value]="type">{{ type }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ t('description') }}</mat-label>
              <textarea matInput formControlName="description" rows="3"></textarea>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>{{ t('address_col') }}</mat-label>
                <input matInput formControlName="address" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>{{ t('owner_contact') }}</mat-label>
                <span matTextPrefix>+216&nbsp;</span>
                <input matInput formControlName="ownerContact" type="tel" inputmode="tel" autocomplete="tel-national" />
                <button mat-icon-button matSuffix type="button" (click)="fillOwnerContact()"
                        [matTooltip]="t('fill_with_my_phone')" [attr.aria-label]="t('fill_with_my_phone')">
                  <mat-icon>contact_phone</mat-icon>
                </button>
                <mat-error>{{ t('phone_invalid') }}</mat-error>
              </mat-form-field>
            </div>

            </section>

            <section class="step-card">
            <h2 class="step-title"><span class="num" [class.done]="!!propertyForm.value.pricePerDay">2</span>{{ t('pricing') }}</h2>

            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>{{ t('price_per_day') }}</mat-label>
                <input matInput type="number" min="0" formControlName="pricePerDay" />
                <span matTextSuffix>TND</span>
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>{{ t('price_per_week') }}</mat-label>
                <input matInput type="number" min="0" formControlName="pricePerWeek" />
                <span matTextSuffix>TND</span>
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>{{ t('price_per_month') }}</mat-label>
                <input matInput type="number" min="0" formControlName="pricePerMonth" />
                <span matTextSuffix>TND</span>
              </mat-form-field>
            </div>

            <div class="seasons" formArrayName="seasonalPrices">
              <h3>{{ t('seasonal_prices') }}</h3>
              <p class="seasons-hint">{{ t('seasonal_prices_hint') }}</p>
              <div class="season-row" *ngFor="let row of seasonalRows.controls; let i = index" [formGroupName]="i">
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>{{ t('from') }}</mat-label>
                  <input matInput formControlName="startDate" inputmode="numeric" maxlength="5" [placeholder]="t('day_month_placeholder')"
                         (input)="formatDayMonth(row, 'startDate')" />
                  <mat-error>{{ t('day_month_invalid') }}</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>{{ t('to') }}</mat-label>
                  <input matInput formControlName="endDate" inputmode="numeric" maxlength="5" [placeholder]="t('day_month_placeholder')"
                         (input)="formatDayMonth(row, 'endDate')" />
                  <mat-error>{{ t('day_month_invalid') }}</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>{{ t('price_per_night') }}</mat-label>
                  <input matInput type="number" min="1" formControlName="pricePerDay" />
                  <span matTextSuffix>TND</span>
                  <mat-error>{{ t('season_price_required') }}</mat-error>
                </mat-form-field>
                <button mat-icon-button type="button" color="warn" (click)="removeSeasonalRow(i)"
                        [matTooltip]="t('remove_seasonal_price')" [attr.aria-label]="t('remove_seasonal_price')">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
              <p class="season-error" *ngIf="seasonalRows.hasError('overlap')">{{ t('seasons_overlap') }}</p>
              <p class="season-error" *ngIf="propertyForm.hasError('mainPriceRequired')">{{ t('seasons_need_main_price') }}</p>
              <button mat-stroked-button type="button" color="primary" (click)="addSeasonalRow()">
                <mat-icon>add</mat-icon> {{ t('add_seasonal_price') }}
              </button>
            </div>

            </section>

            <section class="step-card">
            <h2 class="step-title"><span class="num" [class.done]="!!propertyForm.value.maxCapacity">3</span>{{ t('details') }}</h2>

            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>{{ t('capacity_col') }}</mat-label>
                <input matInput type="number" formControlName="maxCapacity" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>{{ t('bathrooms') }}</mat-label>
                <input matInput type="number" formControlName="bathrooms" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>{{ t('distance_beach') }} (m)</mat-label>
                <input matInput type="number" formControlName="distanceBeach" />
              </mat-form-field>
            </div>

            </section>

            <section class="step-card">
            <h2 class="step-title"><span class="num" [class.done]="equipmentCount > 0">4</span>{{ t('equipment') }}</h2>
            <p class="seasons-hint">{{ t('equipment_hint') }}</p>
            <div class="toggles" role="group" [attr.aria-label]="t('equipment')">
              <button type="button" *ngFor="let f of features" class="toggle" [class.on]="!!propertyForm.get(f.control)?.value"
                      [attr.aria-pressed]="!!propertyForm.get(f.control)?.value" (click)="toggleFeature(f.control)">
                <mat-icon>{{ f.icon }}</mat-icon>{{ t(f.label) }}
              </button>
            </div>
            </section>

            <section class="step-card">
            <h2 class="step-title"><span class="num">5</span>{{ t('photos') }}</h2>
            <app-property-photos-editor #photos [propertyId]="propertyId"></app-property-photos-editor>

            <div class="links" formArrayName="links">
              <h3>{{ t('external_links') }}</h3>
              <p class="seasons-hint">{{ t('external_links_hint') }}</p>
              <div class="link-row" *ngFor="let link of linkRows.controls; let i = index">
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>{{ t('link_address') }}</mat-label>
                  <input matInput type="url" [formControlName]="i" placeholder="https://www.tiktok.com/..." (blur)="completeLink(i)" />
                  <mat-error>{{ t('link_invalid') }}</mat-error>
                </mat-form-field>
                <button mat-icon-button type="button" color="warn" (click)="linkRows.removeAt(i)"
                        [matTooltip]="t('remove_link')" [attr.aria-label]="t('remove_link')">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
              <button mat-stroked-button type="button" color="primary" *ngIf="linkRows.length < 10" (click)="addLinkRow()">
                <mat-icon>add_link</mat-icon> {{ t('add_link') }}
              </button>
            </div>

            </section>

            <div class="form-actions">
              <span class="missing" *ngIf="propertyForm.invalid">{{ t('summary_missing') }} {{ t('title_col') }}</span>
              <button mat-stroked-button type="button" routerLink="/properties">{{ t('cancel') }}</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="propertyForm.invalid || loading">
                <mat-spinner *ngIf="loading" diameter="20" class="spinner"></mat-spinner>
                <span *ngIf="!loading">{{ isEdit ? t('save_changes') : t('add_property') }}</span>
              </button>
            </div>
          </form>

          <!-- What the house will look like in "My houses" -->
          <aside class="preview">
            <p class="preview-title">{{ t('preview') }}</p>
            <article class="house-card">
              <div class="cover">
                <app-property-thumb class="photo" [path]="coverImage"></app-property-thumb>
                <span class="shade" aria-hidden="true"></span>
                <span class="config" *ngIf="propertyForm.value.configuration">{{ propertyForm.value.configuration }}</span>
                <span class="price" *ngIf="propertyForm.value.pricePerDay"><b>{{ propertyForm.value.pricePerDay | number:'1.0-0' }}</b> TND <small>/ {{ t('day') }}</small></span>
              </div>
              <div class="body">
                <h3>{{ propertyForm.value.title || t('title_col') }}</h3>
                <p class="address"><mat-icon inline>place</mat-icon>{{ propertyForm.value.address || '—' }}</p>
                <div class="preview-features">
                  <span *ngIf="propertyForm.value.maxCapacity"><mat-icon>group</mat-icon>{{ propertyForm.value.maxCapacity }}</span>
                  <ng-container *ngFor="let f of features"><mat-icon *ngIf="propertyForm.get(f.control)?.value" [title]="t(f.label)">{{ f.icon }}</mat-icon></ng-container>
                </div>
              </div>
            </article>
            <p class="seasons-hint">{{ t('preview_hint') }}</p>
          </aside>
      </div>
    </div>
  `,
  styles: [`
    .form-layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 1.25rem; align-items: start; }
    .steps { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
    .toggles { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .toggle { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.9rem; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); font: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease; }
    .toggle mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--text-secondary); }
    .toggle:hover { border-color: var(--primary); }
    .toggle.on { background: var(--primary-soft); border-color: var(--primary-strong); box-shadow: inset 0 0 0 1px var(--primary-strong); }
    .toggle.on mat-icon { color: var(--primary-strong); }
    .preview { position: sticky; top: 72px; display: flex; flex-direction: column; gap: 0.5rem; }
    .preview-title { margin: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-secondary); }
    .preview .house-card { cursor: default; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 18px; box-shadow: var(--shadow-md); }
    .preview-features { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; color: var(--text-secondary); min-height: 20px; }
    .preview-features span { display: inline-flex; align-items: center; gap: 0.15rem; font-size: 0.8rem; font-weight: 600; }
    .preview-features mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .missing { margin-inline-end: auto; font-size: 0.8rem; color: var(--text-secondary); }
    @media (max-width: 1000px) { .form-layout { grid-template-columns: 1fr; } .preview { position: static; order: -1; } }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .header h1 {
      margin: 0;
      font-weight: 500;
    }
    h2, h3 {
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    .links { margin: 1.5rem 0; }
    .links h3 { margin: 0; font-size: 1rem; font-weight: 600; }
    .link-row { display: grid; grid-template-columns: 1fr auto; align-items: start; gap: 0.75rem; margin-bottom: 0.75rem; }
    .seasons { margin-bottom: 1.5rem; }
    .seasons h3 { margin: 0; font-size: 1rem; font-weight: 600; }
    .seasons-hint { margin: 0.25rem 0 0.75rem; font-size: 0.82rem; color: var(--text-secondary); }
    .season-row { display: grid; grid-template-columns: 1fr 1fr 1fr auto; align-items: start; gap: 0.75rem; margin-bottom: 0.75rem; }
    .season-error { grid-column: 1 / -1; margin: 0 0 0.75rem; font-size: 0.82rem; color: var(--status-cancelled); }
    @media (max-width: 640px) { .season-row { grid-template-columns: 1fr auto; } .season-row mat-form-field { grid-column: 1; } .season-row button { grid-column: 2; grid-row: 1; } }
    .section-divider {
      margin-bottom: 1rem;
    }
    .full-width {
      width: 100%;
      margin-bottom: 1rem;
    }
    .form-row {
      margin-bottom: 0.5rem;
    }
    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }
    .checkbox-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .form-actions {
      position: sticky; bottom: 0; z-index: 5; align-items: center; padding: 0.75rem 1rem; border-radius: 14px;
      background: color-mix(in srgb, var(--bg-card) 92%, transparent); backdrop-filter: blur(6px); border: 1px solid var(--border-color); box-shadow: var(--shadow-md);
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 2rem;
    }
    .spinner {
      display: inline-block;
      margin-right: 0.5rem;
    }
  `]
})
export class PropertyFormComponent implements OnInit {
  get linkRows(): FormArray<FormControl<string | null>> {
    return this.propertyForm.get('links') as FormArray<FormControl<string | null>>;
  }

  addLinkRow(url = ''): void {
    this.linkRows.push(this.fb.control(url, [Validators.required, Validators.pattern(/^https?:\/\/\S+\.\S+$/i)]));
  }

  /** People paste "www.tiktok.com/..." without the scheme. */
  completeLink(index: number): void {
    const control = this.linkRows.at(index);
    const value = (control.value ?? '').trim();
    control.setValue(value && !/^[a-z]+:/i.test(value) ? `https://${value}` : value);
  }

  houseTypes = HOUSE_TYPES;

  get seasonalRows(): FormArray<FormGroup> {
    return this.propertyForm.get('seasonalPrices') as FormArray<FormGroup>;
  }

  addSeasonalRow(price?: SeasonalPrice): void {
    this.seasonalRows.push(this.fb.group({
      startDate: [price ? toDayMonth(price.startDate) : '', [Validators.required, validDayMonth]],
      endDate: [price ? toDayMonth(price.endDate) : '', [Validators.required, validDayMonth]],
      pricePerDay: [price?.pricePerDay ?? null as number | null, [Validators.required, Validators.min(1)]],
    }));
  }

  /** Keeps only digits and adds the slash: typing 0106 gives 01/06. */
  formatDayMonth(row: AbstractControl, field: string): void {
    const control = row.get(field)!;
    const digits = String(control.value ?? '').replace(/\D/g, '').slice(0, 4);
    control.setValue(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits, { emitEvent: true });
  }

  removeSeasonalRow(index: number): void {
    this.seasonalRows.removeAt(index);
  }

  @ViewChild('photos') photosEditor?: PropertyPhotosEditorComponent;
  isEdit = false;
  propertyId?: number;
  /** Cover photo of the house being edited, for the preview. */
  coverImage?: string;

  /** Options and equipment, shown as toggles with their icon. */
  readonly features: { control: string; label: string; icon: string }[] = [
    { control: 'wifi', label: 'wifi', icon: 'wifi' },
    { control: 'airCondition', label: 'air_condition', icon: 'ac_unit' },
    { control: 'pool', label: 'pool', icon: 'pool' },
    { control: 'seaView', label: 'sea_view', icon: 'waves' },
    { control: 'terrace', label: 'terrace', icon: 'deck' },
    { control: 'kitchen', label: 'kitchen', icon: 'kitchen' },
    { control: 'garage', label: 'garage', icon: 'garage' },
    { control: 'hautStanding', label: 'high_standing', icon: 'diamond' },
    { control: 'appartientResidence', label: 'residence', icon: 'apartment' },
  ];

  get equipmentCount(): number {
    return this.features.filter(f => this.propertyForm.get(f.control)?.value).length;
  }

  toggleFeature(control: string): void {
    const field = this.propertyForm.get(control);
    field?.setValue(!field.value);
    field?.markAsDirty();
  }
  loading = false;

  propertyForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    configuration: [''],
    description: [''],
    address: [''],
    ownerContact: ['', Validators.pattern(/^[\d\s+]{8,15}$/)],
    pricePerDay: [null, Validators.min(0)],
    pricePerWeek: [null, Validators.min(0)],
    pricePerMonth: [null, Validators.min(0)],
    maxCapacity: [null, Validators.min(0)],
    bathrooms: [null, Validators.min(0)],
    distanceBeach: [null, Validators.min(0)],
    hautStanding: [false],
    appartientResidence: [false],
    wifi: [false],
    airCondition: [false],
    pool: [false],
    garage: [false],
    kitchen: [false],
    seaView: [false],
    terrace: [false],
    seasonalPrices: this.fb.array<FormGroup>([], seasonsDoNotOverlap),
    links: this.fb.array<FormControl<string | null>>([]),
  }, { validators: seasonsNeedMainPrice });

  constructor(
    private fb: FormBuilder,
    private propertyService: PropertyService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private uiPreferencesService: UiPreferencesService,
    private authService: AuthService
  ) {
  }

  /** Fills the owner contact with the phone of the connected account (without the +216 shown as prefix). */
  fillOwnerContact(): void {
    const phone = (this.authService.getCurrentUser()?.phone || '').replace(/\s+/g, '').replace(/^(\+|00)216/, '');
    if (!phone) {
      this.snackBar.open(this.t('no_phone_in_profile'), this.t('close'), { duration: 4000 });
      return;
    }
    const control = this.propertyForm.get('ownerContact');
    control?.setValue(phone);
    control?.markAsDirty();
    control?.markAsTouched();
  }

  t(key: string): string {
    return t(key, this.uiPreferencesService.getLanguage());
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.propertyId = +id;
      this.loadProperty(this.propertyId);
    }
  }

  private loadProperty(id: number): void {
    this.propertyService.findOne(id).subscribe({
      next: (property) => {
        // A type typed before this list existed stays selectable, so saving does not lose it
        if (property.configuration && !this.houseTypes.includes(property.configuration)) {
          this.houseTypes = [...this.houseTypes, property.configuration];
        }
        this.coverImage = property.coverImage ?? property.images?.find(image => image.isMain)?.imagePath ?? property.images?.[0]?.imagePath;
        property.seasonalPrices?.forEach(price => this.addSeasonalRow(price));
        property.links?.forEach(link => this.addLinkRow(link.url));
        this.propertyForm.patchValue({
          title: property.title,
          configuration: property.configuration || '',
          description: property.description || '',
          address: property.address || '',
          ownerContact: property.ownerContact || '',
          pricePerDay: property.pricePerDay || null,
          pricePerWeek: property.pricePerWeek || null,
          pricePerMonth: property.pricePerMonth || null,
          maxCapacity: property.maxCapacity || null,
          bathrooms: property.bathrooms || null,
          distanceBeach: property.distanceBeach || null,
          hautStanding: property.hautStanding,
          appartientResidence: property.appartientResidence,
          wifi: property.wifi,
          airCondition: property.airCondition,
          pool: property.pool,
          garage: property.garage,
          kitchen: property.kitchen,
          seaView: property.seaView,
          terrace: property.terrace,
        });
      },
      error: () => {
        this.snackBar.open(this.t('property_load_error'), this.t('close'), { duration: 3000 });
        this.router.navigate(['/properties']);
      },
    });
  }

  onSubmit(): void {
    if (this.propertyForm.invalid) return;

    this.loading = true;
    const dto = {
      ...this.propertyForm.value,
      links: this.linkRows.getRawValue().map(url => (url ?? '').trim()),
      seasonalPrices: this.seasonalRows.getRawValue().map(row => ({
        startDate: toMonthDay(row['startDate']),
        endDate: toMonthDay(row['endDate']),
        pricePerDay: Number(row['pricePerDay']),
      })),
    };

    const obs = this.isEdit
      ? this.propertyService.update(this.propertyId!, dto)
      : this.propertyService.create(dto);

    obs.subscribe({
      next: (saved) => {
        const message = this.isEdit ? this.t('property_update_success') : this.t('property_create_success');
        // In edit mode photos are already saved one by one; on creation they wait for the new id
        if (this.isEdit || !saved?.id || !this.photosEditor) {
          this.snackBar.open(message, this.t('close'), { duration: 3000 });
          this.router.navigate(saved?.id ? ['/properties', saved.id] : ['/properties']);
          return;
        }
        this.photosEditor.uploadPending(saved.id).subscribe({
          next: () => {
            this.snackBar.open(message, this.t('close'), { duration: 3000 });
            this.router.navigate(['/properties', saved.id]);
          },
          error: (err) => {
            // The house exists: send the owner to its edit page to retry the photos
            this.snackBar.open(err.error?.message || this.t('photos_upload_failed'), this.t('close'), { duration: 6000 });
            this.router.navigate(['/properties', saved.id, 'edit']);
          },
        });
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || this.t('error_generic');
        this.snackBar.open(msg, this.t('close'), { duration: 5000 });
      },
    });
  }
}
