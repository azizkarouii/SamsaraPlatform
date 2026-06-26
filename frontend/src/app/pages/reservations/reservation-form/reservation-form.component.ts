import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';
import { PropertyService } from '../../../services/property.service';
import { PropertySamsarService } from '../../../services/property-samsar.service';
import { ReservationService, CreateReservationDto } from '../../../services/reservation.service';
import { Property } from '../../../models/property.model';
import { Reservation } from '../../../models/reservation.model';

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
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="form-container">
      <div class="header">
        <h1>{{ isEdit ? 'Edit' : 'New' }} Reservation</h1>
        <button mat-stroked-button routerLink="/reservations">
          <mat-icon>arrow_back</mat-icon> Back to List
        </button>
      </div>

      <mat-card>
        <mat-card-content>
          <form [formGroup]="reservationForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Property *</mat-label>
              <mat-select formControlName="propertyId" (selectionChange)="onPropertyChange($event.value)">
                <mat-option *ngFor="let prop of properties" [value]="prop.id">
                  {{ prop.title }} - {{ prop.pricePerDay | currency:'TND':'symbol':'1.0-0' }}/day
                </mat-option>
              </mat-select>
              <mat-error *ngIf="reservationForm.get('propertyId')?.hasError('required')">Property is required</mat-error>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Client Name *</mat-label>
                <input matInput formControlName="clientName" placeholder="Client name" />
                <mat-error *ngIf="reservationForm.get('clientName')?.hasError('required')">Client name is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Client Phone</mat-label>
                <input matInput formControlName="clientPhone" placeholder="Phone number" />
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Start Date *</mat-label>
                <input matInput [matDatepicker]="startPicker" formControlName="startDate" (dateChange)="calculateTotal()" />
                <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
                <mat-datepicker #startPicker></mat-datepicker>
                <mat-error *ngIf="reservationForm.get('startDate')?.hasError('required')">Start date is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>End Date *</mat-label>
                <input matInput [matDatepicker]="endPicker" formControlName="endDate" (dateChange)="calculateTotal()" />
                <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
                <mat-datepicker #endPicker></mat-datepicker>
                <mat-error *ngIf="reservationForm.get('endDate')?.hasError('required')">End date is required</mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Check-in Time</mat-label>
                <input matInput type="time" formControlName="checkInTime" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Check-out Time</mat-label>
                <input matInput type="time" formControlName="checkOutTime" />
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Status</mat-label>
                <mat-select formControlName="status">
                  <mat-option value="Pending">Pending</mat-option>
                  <mat-option value="Confirmed">Confirmed</mat-option>
                  <mat-option value="Cancelled">Cancelled</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Total Nights</mat-label>
                <input matInput [value]="totalNights" readonly />
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Total Amount (€) *</mat-label>
                <input matInput type="number" formControlName="totalAmount" />
                <mat-error *ngIf="reservationForm.get('totalAmount')?.hasError('required')">Total amount is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Advance Amount (€)</mat-label>
                <input matInput type="number" formControlName="advanceAmount" />
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Notes</mat-label>
              <textarea matInput formControlName="notes" rows="3" placeholder="Additional notes..."></textarea>
            </mat-form-field>

            <div class="form-actions">
              <button mat-stroked-button type="button" routerLink="/reservations">Cancel</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="reservationForm.invalid || loading">
                <mat-spinner *ngIf="loading" diameter="20" class="spinner"></mat-spinner>
                <span *ngIf="!loading">{{ isEdit ? 'Update' : 'Create' }} Reservation</span>
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
      max-width: 800px;
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
export class ReservationFormComponent implements OnInit {
  isEdit = false;
  reservationId?: number;
  loading = false;
  properties: Property[] = [];
  totalNights = 0;

  reservationForm = this.fb.group({
    propertyId: [0, Validators.required],
    clientName: ['', Validators.required],
    clientPhone: [''],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    checkInTime: ['14:00'],
    checkOutTime: ['10:00'],
    status: ['Pending'],
    totalAmount: [0, Validators.required],
    advanceAmount: [0],
    notes: [''],
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private reservationService: ReservationService,
    private propertyService: PropertyService,
    private propertySamsarService: PropertySamsarService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadProperties();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.reservationId = +id;
      this.loadReservation(this.reservationId);
    }
  }

  private loadProperties(): void {
    const user = this.authService.getCurrentUser();
    if (user?.role === 'SAMSAR') {
      this.propertySamsarService.findMine().subscribe({
        next: (rels) => {
          this.properties = rels.map(r => r.property).filter((p): p is Property => !!p);
        },
      });
    } else {
      this.propertyService.findMine().subscribe({
        next: (props) => {
          this.properties = props;
        },
      });
    }
  }

  private loadReservation(id: number): void {
    this.reservationService.findOne(id).subscribe({
      next: (reservation) => {
        this.reservationForm.patchValue({
          propertyId: reservation.propertyId,
          clientName: reservation.clientName,
          clientPhone: reservation.clientPhone || '',
          startDate: reservation.startDate,
          endDate: reservation.endDate,
          checkInTime: reservation.checkInTime,
          checkOutTime: reservation.checkOutTime,
          status: reservation.status,
          totalAmount: reservation.totalAmount,
          advanceAmount: reservation.advanceAmount,
          notes: reservation.notes || '',
        });
        this.calculateTotal();
      },
      error: () => {
        this.snackBar.open('Failed to load reservation', 'Close', { duration: 3000 });
        this.router.navigate(['/reservations']);
      },
    });
  }

  onPropertyChange(propertyId: number): void {
    this.calculateTotal();
  }

  calculateTotal(): void {
    const start = this.reservationForm.get('startDate')?.value;
    const end = this.reservationForm.get('endDate')?.value;
    const propertyId = this.reservationForm.get('propertyId')?.value;

    if (start && end && propertyId) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      this.totalNights = nights > 0 ? nights : 0;

      const property = this.properties.find(p => p.id === propertyId);
      if (property?.pricePerDay && this.totalNights > 0) {
        const total = property.pricePerDay * this.totalNights;
        if (!this.isEdit) {
          this.reservationForm.patchValue({ totalAmount: total });
        }
      }
    }
  }

  onSubmit(): void {
    if (this.reservationForm.invalid) return;

    this.loading = true;
    const dto = this.reservationForm.value as unknown as CreateReservationDto;

    const obs = this.isEdit
      ? this.reservationService.update(this.reservationId!, dto)
      : this.reservationService.create(dto);

    obs.subscribe({
      next: () => {
        this.snackBar.open(
          `Reservation ${this.isEdit ? 'updated' : 'created'} successfully!`,
          'Close',
          { duration: 3000 }
        );
        this.router.navigate(['/reservations']);
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || `Failed to ${this.isEdit ? 'update' : 'create'} reservation`;
        this.snackBar.open(msg, 'Close', { duration: 5000 });
      },
    });
  }
}
