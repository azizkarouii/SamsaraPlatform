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
import { PropertyService } from '../../../services/property.service';
import { Property } from '../../../models/property.model';

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
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  template: `
    <div class="form-container">
      <div class="header">
        <h1>{{ isEdit ? 'Edit' : 'Add' }} Property</h1>
        <button mat-stroked-button routerLink="/properties">
          <mat-icon>arrow_back</mat-icon> Back to List
        </button>
      </div>

      <mat-card>
        <mat-card-content>
          <form [formGroup]="propertyForm" (ngSubmit)="onSubmit()">
            <h2>Basic Information</h2>
            <mat-divider class="section-divider"></mat-divider>

            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-2">
                <mat-label>Title *</mat-label>
                <input matInput formControlName="title" placeholder="Property title" />
                <mat-error *ngIf="propertyForm.get('title')?.hasError('required')">Title is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Configuration</mat-label>
                <input matInput formControlName="configuration" placeholder="e.g. 2BR Apartment" />
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <textarea matInput formControlName="description" rows="3" placeholder="Describe the property"></textarea>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Address</mat-label>
                <input matInput formControlName="address" placeholder="Property address" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Owner Contact</mat-label>
                <input matInput formControlName="ownerContact" placeholder="Phone or email" />
              </mat-form-field>
            </div>

            <h2>Pricing</h2>
            <mat-divider class="section-divider"></mat-divider>

            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Price per Day (€)</mat-label>
                <input matInput type="number" formControlName="pricePerDay" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Price per Week (€)</mat-label>
                <input matInput type="number" formControlName="pricePerWeek" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Price per Month (€)</mat-label>
                <input matInput type="number" formControlName="pricePerMonth" />
              </mat-form-field>
            </div>

            <h2>Details</h2>
            <mat-divider class="section-divider"></mat-divider>

            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Max Capacity</mat-label>
                <input matInput type="number" formControlName="maxCapacity" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Bathrooms</mat-label>
                <input matInput type="number" formControlName="bathrooms" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Distance to Beach (m)</mat-label>
                <input matInput type="number" formControlName="distanceBeach" />
              </mat-form-field>
            </div>

            <h2>Options</h2>
            <mat-divider class="section-divider"></mat-divider>

            <div class="checkbox-row">
              <mat-checkbox formControlName="hautStanding">High Standing</mat-checkbox>
              <mat-checkbox formControlName="appartientResidence">Part of Residence</mat-checkbox>
            </div>

            <h3>Equipment</h3>
            <div class="checkbox-row">
              <mat-checkbox formControlName="wifi">WiFi</mat-checkbox>
              <mat-checkbox formControlName="airCondition">Air Conditioning</mat-checkbox>
              <mat-checkbox formControlName="pool">Pool</mat-checkbox>
              <mat-checkbox formControlName="garage">Garage</mat-checkbox>
              <mat-checkbox formControlName="kitchen">Kitchen</mat-checkbox>
              <mat-checkbox formControlName="seaView">Sea View</mat-checkbox>
              <mat-checkbox formControlName="terrace">Terrace</mat-checkbox>
            </div>

            <div class="form-actions">
              <button mat-stroked-button type="button" routerLink="/properties">Cancel</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="propertyForm.invalid || loading">
                <mat-spinner *ngIf="loading" diameter="20" class="spinner"></mat-spinner>
                <span *ngIf="!loading">{{ isEdit ? 'Update' : 'Create' }} Property</span>
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .form-container {
      padding: 1.5rem;
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
      display: flex;
      gap: 1rem;
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
    ownerContact: [''],
    pricePerDay: [null],
    pricePerWeek: [null],
    pricePerMonth: [null],
    maxCapacity: [null],
    bathrooms: [null],
    distanceBeach: [null],
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
    private snackBar: MatSnackBar
  ) {}

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
        this.snackBar.open('Failed to load property', 'Close', { duration: 3000 });
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
      next: () => {
        this.snackBar.open(
          `Property ${this.isEdit ? 'updated' : 'created'} successfully!`,
          'Close',
          { duration: 3000 }
        );
        this.router.navigate(['/properties']);
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || `Failed to ${this.isEdit ? 'update' : 'create'} property`;
        this.snackBar.open(msg, 'Close', { duration: 5000 });
      },
    });
  }
}
