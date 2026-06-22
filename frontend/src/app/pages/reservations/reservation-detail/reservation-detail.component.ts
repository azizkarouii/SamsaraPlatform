import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReservationService } from '../../../services/reservation.service';
import { Reservation } from '../../../models/reservation.model';

@Component({
  selector: 'app-reservation-detail',
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
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="detail-container" *ngIf="!loading; else loadingSpinner">
      <div class="header">
        <button mat-stroked-button routerLink="/reservations">
          <mat-icon>arrow_back</mat-icon> Back to List
        </button>
        <div class="header-actions">
          <button mat-raised-button color="accent" [routerLink]="['/reservations', reservation?.id, 'edit']">
            <mat-icon>edit</mat-icon> Edit
          </button>
          <button mat-raised-button color="warn" (click)="deleteReservation()">
            <mat-icon>delete</mat-icon> Delete
          </button>
        </div>
      </div>

      <div *ngIf="reservation">
        <mat-card class="detail-card">
          <mat-card-header>
            <mat-card-title>Reservation #{{ reservation.id }}</mat-card-title>
            <mat-card-subtitle>
              <mat-chip [color]="getStatusColor(reservation.status)" selected>{{ reservation.status }}</mat-chip>
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <h3>Client Information</h3>
            <mat-divider></mat-divider>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Name</span>
                <span class="value">{{ reservation.clientName }}</span>
              </div>
              <div class="info-item">
                <span class="label">Phone</span>
                <span class="value">{{ reservation.clientPhone || '-' }}</span>
              </div>
            </div>

            <h3>Property</h3>
            <mat-divider></mat-divider>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Property</span>
                <span class="value">{{ reservation.property?.title || 'Property #' + reservation.propertyId }}</span>
              </div>
            </div>

            <h3>Dates & Times</h3>
            <mat-divider></mat-divider>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Check-in</span>
                <span class="value">{{ reservation.startDate | date:'mediumDate' }} at {{ reservation.checkInTime }}</span>
              </div>
              <div class="info-item">
                <span class="label">Check-out</span>
                <span class="value">{{ reservation.endDate | date:'mediumDate' }} at {{ reservation.checkOutTime }}</span>
              </div>
            </div>

            <h3>Financial Details</h3>
            <mat-divider></mat-divider>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Total Amount</span>
                <span class="value price">{{ reservation.totalAmount | currency:'TND':'symbol':'1.0-0' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Advance Paid</span>
                <span class="value">{{ reservation.advanceAmount | currency:'TND':'symbol':'1.0-0' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Balance Due</span>
                <span class="value">{{ reservation.totalAmount - reservation.advanceAmount | currency:'TND':'symbol':'1.0-0' }}</span>
              </div>
            </div>

            <div *ngIf="reservation.notes" class="notes-section">
              <h3>Notes</h3>
              <mat-divider></mat-divider>
              <p>{{ reservation.notes }}</p>
            </div>

            <div class="dates">
              <span class="date-label">Created: {{ reservation.createdAt | date:'medium' }}</span>
              <span class="date-label">Updated: {{ reservation.updatedAt | date:'medium' }}</span>
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
      max-width: 800px;
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
    .price {
      font-size: 1.25rem;
      color: #4caf50;
    }
    .notes-section p {
      color: rgba(0,0,0,0.7);
      margin: 1rem 0;
    }
    .dates {
      display: flex;
      gap: 1.5rem;
      margin-top: 1.5rem;
      font-size: 0.8rem;
      color: rgba(0,0,0,0.5);
    }
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
  `]
})
export class ReservationDetailComponent implements OnInit {
  reservation?: Reservation;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reservationService: ReservationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadReservation(+id);
    }
  }

  private loadReservation(id: number): void {
    this.reservationService.findOne(id).subscribe({
      next: (reservation) => {
        this.reservation = reservation;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load reservation', 'Close', { duration: 3000 });
        this.router.navigate(['/reservations']);
      },
    });
  }

  deleteReservation(): void {
    if (confirm('Are you sure you want to delete this reservation?')) {
      this.reservationService.remove(this.reservation!.id).subscribe({
        next: () => {
          this.snackBar.open('Reservation deleted successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/reservations']);
        },
        error: (err) => {
          const msg = err.error?.message || 'Failed to delete reservation';
          this.snackBar.open(msg, 'Close', { duration: 5000 });
        },
      });
    }
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'primary';
      case 'pending': return 'accent';
      case 'cancelled': return 'warn';
      default: return '';
    }
  }
}
