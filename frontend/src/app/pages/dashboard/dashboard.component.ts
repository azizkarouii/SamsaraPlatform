import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { PropertyService } from '../../services/property.service';
import { ReservationService } from '../../services/reservation.service';
import { PropertySamsarService } from '../../services/property-samsar.service';
import { Property } from '../../models/property.model';
import { Reservation } from '../../models/reservation.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="dashboard-container">
      <h1>Dashboard</h1>

      <div class="stats-grid" *ngIf="!loading; else loadingSpinner">
        <mat-card class="stat-card properties-card">
          <mat-card-content>
            <mat-icon class="stat-icon">home</mat-icon>
            <div class="stat-info">
              <span class="stat-value">{{ properties.length }}</span>
              <span class="stat-label">Total Properties</span>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" routerLink="/properties">View All</button>
          </mat-card-actions>
        </mat-card>

        <mat-card class="stat-card reservations-card">
          <mat-card-content>
            <mat-icon class="stat-icon">book_online</mat-icon>
            <div class="stat-info">
              <span class="stat-value">{{ reservations.length }}</span>
              <span class="stat-label">Total Reservations</span>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" routerLink="/reservations">View All</button>
          </mat-card-actions>
        </mat-card>

        <mat-card class="stat-card revenue-card">
          <mat-card-content>
            <mat-icon class="stat-icon">payments</mat-icon>
            <div class="stat-info">
              <span class="stat-value">{{ totalRevenue | currency:'TND':'symbol':'1.0-0' }}</span>
              <span class="stat-label">Total Revenue</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card pending-card">
          <mat-card-content>
            <mat-icon class="stat-icon">pending_actions</mat-icon>
            <div class="stat-info">
              <span class="stat-value">{{ pendingReservations }}</span>
              <span class="stat-label">Pending</span>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" routerLink="/reservations" [queryParams]="{tab: 'pending'}">View</button>
          </mat-card-actions>
        </mat-card>

        <mat-card class="stat-card confirmed-card">
          <mat-card-content>
            <mat-icon class="stat-icon">check_circle</mat-icon>
            <div class="stat-info">
              <span class="stat-value">{{ confirmedReservations }}</span>
              <span class="stat-label">Confirmed</span>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" routerLink="/reservations" [queryParams]="{tab: 'confirmed'}">View</button>
          </mat-card-actions>
        </mat-card>

        <mat-card class="stat-card progress-card">
          <mat-card-content>
            <mat-icon class="stat-icon">play_circle</mat-icon>
            <div class="stat-info">
              <span class="stat-value">{{ inProgressReservations }}</span>
              <span class="stat-label">In Progress</span>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" routerLink="/reservations" [queryParams]="{tab: 'in_progress'}">View</button>
          </mat-card-actions>
        </mat-card>

        <mat-card class="stat-card cancelled-card">
          <mat-card-content>
            <mat-icon class="stat-icon">cancel</mat-icon>
            <div class="stat-info">
              <span class="stat-value">{{ cancelledReservations }}</span>
              <span class="stat-label">Cancelled</span>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" routerLink="/reservations" [queryParams]="{tab: 'cancelled'}">View</button>
          </mat-card-actions>
        </mat-card>
      </div>

      <div class="quick-actions" *ngIf="!loading">
        <h2>Quick Actions</h2>
        <div class="actions-row">
          <button mat-raised-button color="primary" routerLink="/properties/add">
            <mat-icon>add</mat-icon> Add Property
          </button>
          <button mat-raised-button color="accent" routerLink="/reservations/add">
            <mat-icon>add</mat-icon> New Reservation
          </button>
        </div>
      </div>

      <div class="chart-section" *ngIf="!loading && reservations.length">
        <h2>Reservation Status Distribution</h2>
        <div class="bar-chart">
          <div class="bar-item">
            <span class="bar-label">Pending</span>
            <div class="bar-track">
              <div class="bar-fill pending-fill" [style.width.%]="(pendingReservations / reservations.length) * 100"></div>
            </div>
            <span class="bar-value">{{ pendingReservations }}</span>
          </div>
          <div class="bar-item">
            <span class="bar-label">Confirmed</span>
            <div class="bar-track">
              <div class="bar-fill confirmed-fill" [style.width.%]="(confirmedReservations / reservations.length) * 100"></div>
            </div>
            <span class="bar-value">{{ confirmedReservations }}</span>
          </div>
          <div class="bar-item">
            <span class="bar-label">In Progress</span>
            <div class="bar-track">
              <div class="bar-fill progress-fill" [style.width.%]="(inProgressReservations / reservations.length) * 100"></div>
            </div>
            <span class="bar-value">{{ inProgressReservations }}</span>
          </div>
          <div class="bar-item">
            <span class="bar-label">Cancelled</span>
            <div class="bar-track">
              <div class="bar-fill cancelled-fill" [style.width.%]="(cancelledReservations / reservations.length) * 100"></div>
            </div>
            <span class="bar-value">{{ cancelledReservations }}</span>
          </div>
        </div>
      </div>

      <ng-template #loadingSpinner>
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 1.5rem;
    }
    h1 {
      margin-bottom: 1.5rem;
      font-weight: 500;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
    }
    .stat-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
    }
    .stat-info {
      display: flex;
      flex-direction: column;
    }
    .stat-value {
      font-size: 2rem;
      font-weight: 500;
    }
    .stat-label {
      font-size: 0.875rem;
      color: rgba(0,0,0,0.6);
    }
    .properties-card .stat-icon { color: #3f51b5; }
    .reservations-card .stat-icon { color: #ff4081; }
    .revenue-card .stat-icon { color: #4caf50; }
    .pending-card .stat-icon { color: #ff9800; }
    .confirmed-card .stat-icon { color: #2196f3; }
    .progress-card .stat-icon { color: #4caf50; }
    .cancelled-card .stat-icon { color: #f44336; }
    .quick-actions h2 {
      margin-bottom: 1rem;
      font-weight: 500;
    }
    .actions-row {
      display: flex;
      gap: 1rem;
    }
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
    .chart-section {
      margin-top: 2rem;
    }
    .chart-section h2 {
      margin-bottom: 1rem;
      font-weight: 500;
    }
    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .bar-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .bar-label {
      width: 100px;
      font-size: 0.85rem;
      color: rgba(0,0,0,0.7);
    }
    .bar-track {
      flex: 1;
      height: 24px;
      background: rgba(0,0,0,0.08);
      border-radius: 12px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      border-radius: 12px;
      transition: width 0.5s ease;
    }
    .pending-fill { background: #ff9800; }
    .confirmed-fill { background: #2196f3; }
    .progress-fill { background: #4caf50; }
    .cancelled-fill { background: #f44336; }
    .bar-value {
      width: 30px;
      text-align: right;
      font-weight: 500;
    }
  `]
})
export class DashboardComponent implements OnInit {
  properties: Property[] = [];
  reservations: Reservation[] = [];
  loading = true;
  private pendingLoads = 0;

  get totalRevenue(): number {
    return this.reservations.reduce((sum, r) => sum + r.totalAmount, 0);
  }

  get pendingReservations(): number {
    return this.reservations.filter(r => r.status === 'pending').length;
  }

  get confirmedReservations(): number {
    return this.reservations.filter(r => r.status === 'confirmed').length;
  }

  get inProgressReservations(): number {
    return this.reservations.filter(r => r.status === 'in_progress').length;
  }

  get cancelledReservations(): number {
    return this.reservations.filter(r => r.status === 'cancelled').length;
  }

  constructor(
    private authService: AuthService,
    private propertyService: PropertyService,
    private reservationService: ReservationService,
    private propertySamsarService: PropertySamsarService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    this.pendingLoads = 2;

    const user = this.authService.getCurrentUser();

    if (user?.role === 'SAMSAR') {
      this.propertySamsarService.findMine().subscribe({
        next: (rels) => {
          this.properties = rels.map(r => r.property).filter((p): p is Property => !!p);
          this.markLoaded();
        },
        error: () => this.markLoaded(),
      });
    } else {
      this.propertyService.findMine().subscribe({
        next: (props) => {
          this.properties = props;
          this.markLoaded();
        },
        error: () => this.markLoaded(),
      });
    }

    const resObs = user?.role === 'SAMSAR'
      ? this.reservationService.findMine()
      : this.reservationService.findByOwner();

    resObs.subscribe({
      next: (res) => {
        this.reservations = res;
        this.markLoaded();
      },
      error: () => this.markLoaded(),
    });
  }

  private markLoaded(): void {
    this.pendingLoads = Math.max(0, this.pendingLoads - 1);
    if (this.pendingLoads === 0) {
      this.loading = false;
    }
  }
}
