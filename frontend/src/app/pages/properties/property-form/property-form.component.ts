import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
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

@Component({
  selector: 'app-property-form',
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
    MatCheckboxModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  template: `
    <div class="form-container">
      <div class="header">
        <h1>{{ isEdit ? t('edit_property_title') : t('add_property') }}</h1>
        <button mat-stroked-button routerLink="/properties">
          <mat-icon>arrow_back</mat-icon> {{ t('back_to_list') }}
        </button>
      </div>

      <mat-card>
        <mat-card-content>
          <form [formGroup]="propertyForm" (ngSubmit)="onSubmit()">
            <h2>{{ t('basic_information') }}</h2>
            <mat-divider class="section-divider"></mat-divider>

            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-2">
                <mat-label>{{ t('title_col') }} *</mat-label>
                <input matInput formControlName="title" placeholder="{{ t('title_col') }}" />
                <mat-error *ngIf="propertyForm.get('title')?.hasError('required')">{{ t('property_title_required') }}</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>{{ t('configuration') }}</mat-label>
                <input matInput formControlName="configuration" placeholder="S+1, S+2..." />
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

            <h2>{{ t('pricing') }}</h2>
            <mat-divider class="section-divider"></mat-divider>

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

            <h2>{{ t('details') }}</h2>
            <mat-divider class="section-divider"></mat-divider>

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

            <h2>{{ t('options') }}</h2>
            <mat-divider class="section-divider"></mat-divider>

            <div class="checkbox-row">
              <mat-checkbox formControlName="hautStanding">{{ t('high_standing') }}</mat-checkbox>
              <mat-checkbox formControlName="appartientResidence">{{ t('residence') }}</mat-checkbox>
            </div>

            <h3>{{ t('equipment') }}</h3>
            <div class="checkbox-row">
              <mat-checkbox formControlName="wifi">{{ t('wifi') }}</mat-checkbox>
              <mat-checkbox formControlName="airCondition">{{ t('air_condition') }}</mat-checkbox>
              <mat-checkbox formControlName="pool">{{ t('pool') }}</mat-checkbox>
              <mat-checkbox formControlName="garage">{{ t('garage') }}</mat-checkbox>
              <mat-checkbox formControlName="kitchen">{{ t('kitchen') }}</mat-checkbox>
              <mat-checkbox formControlName="seaView">{{ t('sea_view') }}</mat-checkbox>
              <mat-checkbox formControlName="terrace">{{ t('terrace') }}</mat-checkbox>
            </div>

            <div class="form-actions">
              <button mat-stroked-button type="button" routerLink="/properties">{{ t('cancel') }}</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="propertyForm.invalid || loading">
                <mat-spinner *ngIf="loading" diameter="20" class="spinner"></mat-spinner>
                <span *ngIf="!loading">{{ isEdit ? t('save_changes') : t('add_property') }}</span>
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .form-container {
      max-width: 900px;
    }
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
  isEdit = false;
  propertyId?: number;
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
  });

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
    const dto = this.propertyForm.value;

    const obs = this.isEdit
      ? this.propertyService.update(this.propertyId!, dto)
      : this.propertyService.create(dto);

    obs.subscribe({
      next: (saved) => {
        const message = this.isEdit ? this.t('property_update_success') : this.t('property_create_success');
        this.snackBar.open(message, this.t('close'), { duration: 3000 });
        this.router.navigate(saved?.id ? ['/properties', saved.id] : ['/properties']);
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || this.t('error_generic');
        this.snackBar.open(msg, this.t('close'), { duration: 5000 });
      },
    });
  }
}
