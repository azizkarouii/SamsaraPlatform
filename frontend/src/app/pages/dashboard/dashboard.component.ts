import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
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
    MatDatepickerModule,
    MatNativeDateModule,
    FormsModule,
  ],
  template: `
    <div class="dashboard-container">
      <div class="page-header d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
        <div>
          <h1 class="page-title">Tableau de bord analytique</h1>
          <p class="page-subtitle">Lecture commerciale de l'activité de réservation.</p>
        </div>
        <div class="d-flex flex-wrap gap-2 align-items-end">
          <div>
            <label class="filter-label">Début</label>
            <input type="date" class="form-control" [(ngModel)]="dateDebut" />
          </div>
          <div>
            <label class="filter-label">Fin</label>
            <input type="date" class="form-control" [(ngModel)]="dateFin" />
          </div>
          <button class="btn-refresh" (click)="loadData()">
            <mat-icon>refresh</mat-icon> Actualiser
          </button>
        </div>
      </div>

      <ng-container *ngIf="!loading; else loadingSpinner">
        <div class="metrics-grid mb-4">
          <div class="metric-card metric-primary">
            <div class="metric-body">
              <div class="metric-label">Revenu total</div>
              <div class="metric-value">{{ totalRevenue | currency:'TND':'symbol':'1.0-0' }}</div>
            </div>
          </div>
          <div class="metric-card metric-secondary">
            <div class="metric-body">
              <div class="metric-label">Réservations</div>
              <div class="metric-value">{{ filteredReservations.length }}</div>
            </div>
          </div>
          <div class="metric-card metric-tertiary">
            <div class="metric-body">
              <div class="metric-label">Propriétés actives</div>
              <div class="metric-value">{{ properties.length }}</div>
            </div>
          </div>
          <div class="metric-card metric-quaternary">
            <div class="metric-body">
              <div class="metric-label">Taux de réservation</div>
              <div class="metric-value">{{ bookingRate }}%</div>
            </div>
          </div>
        </div>

        <div class="charts-grid mb-4">
          <mat-card class="chart-card">
            <mat-card-header><mat-card-title>Revenu par propriété</mat-card-title></mat-card-header>
            <mat-card-content>
              <div class="bar-chart" *ngIf="revenueByProperty.length; else noData">
                <div class="bar-item" *ngFor="let item of revenueByProperty">
                  <span class="bar-label">{{ item.title }}</span>
                  <div class="bar-track">
                    <div class="bar-fill revenue-fill" [style.width.%]="(item.amount / maxRevProp) * 100"></div>
                  </div>
                  <span class="bar-value">{{ item.amount | currency:'TND':'symbol':'1.0-0' }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card class="chart-card">
            <mat-card-header><mat-card-title>Tendance revenu</mat-card-title></mat-card-header>
            <mat-card-content>
              <div class="line-chart" *ngIf="revenueByMonth.length; else noData">
                <svg viewBox="0 0 400 180" class="line-svg">
                  <polyline [attr.points]="trendPoints" fill="none" stroke="#2563eb" stroke-width="2.5" />
                  <circle *ngFor="let p of trendCoords" [attr.cx]="p.x" [attr.cy]="p.y" r="3" fill="#2563eb" />
                </svg>
                <div class="line-labels">
                  <span *ngFor="let m of revenueByMonth" class="line-label">{{ m.month.slice(5) }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <div class="charts-grid mb-4">
          <mat-card class="chart-card">
            <mat-card-header><mat-card-title>Réservations par période</mat-card-title></mat-card-header>
            <mat-card-content>
              <div class="bar-chart" *ngIf="reservationsByPeriod.length; else noData">
                <div class="bar-item" *ngFor="let item of reservationsByPeriod">
                  <span class="bar-label">{{ item.period }}</span>
                  <div class="bar-track">
                    <div class="bar-fill res-fill" [style.width.%]="(item.count / maxResPeriod) * 100"></div>
                  </div>
                  <span class="bar-value">{{ item.count }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card class="chart-card">
            <mat-card-header><mat-card-title>Répartition par statut</mat-card-title></mat-card-header>
            <mat-card-content>
              <div class="donut-chart">
                <div class="donut-segment" *ngFor="let s of statusLabels" [style.background]="s.color" [style.width.%]="filteredReservations.length ? (s.count / filteredReservations.length) * 100 : 0">
                  <span *ngIf="s.count" class="donut-label">{{ s.count }}</span>
                </div>
              </div>
              <div class="donut-legend">
                <span *ngFor="let s of statusLabels" class="legend-item">
                  <span class="legend-dot" [style.background]="s.color"></span>
                  {{ s.label }} ({{ s.count }})
                </span>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <ng-template #noData>
          <div class="empty-state">Aucune donnée pour la période sélectionnée</div>
        </ng-template>
      </ng-container>

      <ng-template #loadingSpinner>
        <div class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>
      </ng-template>
    </div>
  `,
  styles: [`
    .dashboard-container { padding: 0; }
    .page-header h1 { font-size: 1.75rem; font-weight: 700; margin: 0; }
    .page-subtitle { color: rgba(0,0,0,0.5); margin: 0; font-size: 0.9rem; }
    .filter-label { font-size: 0.75rem; color: rgba(0,0,0,0.5); margin-bottom: 2px; display: block; }
    .form-control {
      border: 1px solid rgba(0,0,0,0.15); border-radius: 6px; padding: 6px 10px;
      font-size: 0.85rem; background: white; outline: none;
    }
    .form-control:focus { border-color: #3C91E6; }
    .btn-refresh {
      display: inline-flex; align-items: center; gap: 4px;
      background: #3C91E6; color: white; border: none; border-radius: 6px;
      padding: 6px 16px; font-size: 0.85rem; cursor: pointer;
      margin-top: 16px; white-space: nowrap;
    }
    .btn-refresh:hover { background: #2563eb; }
    .btn-refresh mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
    }
    .mb-4 { margin-bottom: 1.5rem; }

    .metric-card {
      border-radius: 10px; padding: 1.25rem; min-height: 100px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }
    .metric-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .metric-secondary { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    .metric-tertiary { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    .metric-quaternary { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
    .metric-body { color: white; }
    .metric-label { text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; opacity: 0.85; margin-bottom: 4px; }
    .metric-value { font-size: 1.75rem; font-weight: 700; }

    .chart-card { border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .chart-card mat-card-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1rem 0; }
    .chart-card mat-card-title { font-size: 0.95rem; font-weight: 600; }
    .header-badge {
      font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.03em;
      padding: 2px 8px; border-radius: 10px; background: #e8f0fe; color: #3C91E6;
    }
    .chart-card mat-card-content { padding: 1rem; }

    .bar-chart { display: flex; flex-direction: column; gap: 0.6rem; }
    .bar-item { display: flex; align-items: center; gap: 0.6rem; }
    .bar-label {
      width: 100px; font-size: 0.8rem; color: rgba(0,0,0,0.7);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0;
    }
    .bar-track { flex: 1; height: 20px; background: rgba(0,0,0,0.06); border-radius: 10px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 10px; transition: width 0.6s ease; min-width: 2px; }
    .revenue-fill { background: linear-gradient(90deg, #667eea, #764ba2); }
    .res-fill { background: linear-gradient(90deg, #4facfe, #00f2fe); }
    .bar-value { width: 80px; text-align: right; font-size: 0.8rem; font-weight: 500; flex-shrink: 0; }

    .line-chart { padding: 0.5rem 0; }
    .line-svg { width: 100%; height: auto; }
    .line-labels { display: flex; justify-content: space-between; padding: 0 8px; margin-top: -4px; }
    .line-label { font-size: 0.65rem; color: rgba(0,0,0,0.5); }

    .donut-chart { display: flex; height: 24px; border-radius: 12px; overflow: hidden; margin-bottom: 0.75rem; }
    .donut-segment { display: flex; align-items: center; justify-content: center; transition: width 0.5s ease; min-width: 0; }
    .donut-label { color: white; font-size: 0.75rem; font-weight: 600; }
    .donut-legend { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    .legend-item { display: flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; }

    .table-wrap { padding: 0 1rem 1rem !important; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .data-table th { text-align: left; padding: 0.6rem 0.4rem; border-bottom: 2px solid rgba(0,0,0,0.06); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; color: rgba(0,0,0,0.5); }
    .data-table td { padding: 0.5rem 0.4rem; border-bottom: 1px solid rgba(0,0,0,0.04); }
    .data-table tbody tr:hover { background: rgba(60, 145, 230, 0.04); }
    .text-end { text-align: right; }
    .text-center { text-align: center; }
    .text-muted { color: rgba(0,0,0,0.4); }
    .py-3 { padding-top: 1rem; padding-bottom: 1rem; }

    .empty-state { text-align: center; padding: 2rem; color: rgba(0,0,0,0.4); font-size: 0.9rem; }
    .loading-container { display: flex; justify-content: center; padding: 3rem; }
  `]
})
export class DashboardComponent implements OnInit {
  properties: Property[] = [];
  allReservations: Reservation[] = [];
  loading = false;
  dateDebut = '';
  dateFin = '';
  private pendingLoads = 0;

  get filteredReservations(): Reservation[] {
    let list = this.allReservations;
    if (this.dateDebut) {
      list = list.filter(r => r.startDate >= this.dateDebut);
    }
    if (this.dateFin) {
      list = list.filter(r => r.endDate <= this.dateFin);
    }
    return list;
  }

  get totalRevenue(): number {
    return this.filteredReservations
      .filter(r => r.status === 'confirmed' || r.status === 'in-progress' || r.status === 'in_progress' || r.status === 'in progress')
      .reduce((sum, r) => sum + r.totalAmount, 0);
  }

  get pendingReservations(): number {
    return this.filteredReservations.filter(r => r.status === 'pending').length;
  }

  get confirmedReservations(): number {
    return this.filteredReservations.filter(r => r.status === 'confirmed').length;
  }

  get inProgressReservations(): number {
    return this.filteredReservations.filter(r => r.status === 'in-progress' || r.status === 'in_progress' || r.status === 'in progress').length;
  }

  get cancelledReservations(): number {
    return this.filteredReservations.filter(r => r.status === 'cancelled').length;
  }

  get bookingRate(): number {
    if (!this.filteredReservations.length) return 0;
    const active = this.confirmedReservations + this.inProgressReservations;
    return Math.round((active / this.filteredReservations.length) * 100);
  }

  get statusLabels(): { label: string; count: number; color: string }[] {
    return [
      { label: 'Pending', count: this.pendingReservations, color: '#ff9800' },
      { label: 'Confirmed', count: this.confirmedReservations, color: '#2196f3' },
      { label: 'In Progress', count: this.inProgressReservations, color: '#4caf50' },
      { label: 'Cancelled', count: this.cancelledReservations, color: '#f44336' },
    ];
  }

  get revenueByProperty(): { title: string; amount: number }[] {
    const active = this.filteredReservations.filter(r => r.status === 'confirmed' || r.status === 'in-progress' || r.status === 'in_progress' || r.status === 'in progress');
    const map = new Map<string, number>();
    for (const r of active) {
      const key = r.property?.title || '#' + r.propertyId;
      map.set(key, (map.get(key) || 0) + r.totalAmount);
    }
    return Array.from(map.entries())
      .map(([title, amount]) => ({ title, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }

  get maxRevProp(): number {
    return Math.max(...this.revenueByProperty.map(i => i.amount), 1);
  }

  private monthUpToSept(m: string): boolean {
    const monthNum = parseInt(m.split('-')[1], 10);
    return monthNum <= 9;
  }

  get revenueByMonth(): { month: string; amount: number }[] {
    const active = this.filteredReservations.filter(r => r.status === 'confirmed' || r.status === 'in-progress' || r.status === 'in_progress' || r.status === 'in progress');
    const map = new Map<string, number>();
    for (const r of active) {
      const d = new Date(r.startDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + r.totalAmount);
    }
    return Array.from(map.entries())
      .map(([month, amount]) => ({ month, amount }))
      .filter(({ month }) => this.monthUpToSept(month))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  get trendCoords(): { x: number; y: number }[] {
    const data = this.revenueByMonth;
    if (!data.length) return [];
    const max = Math.max(...data.map(d => d.amount), 1);
    const w = 400, h = 180, padX = 10, padY = 10;
    const stepX = (data.length > 1) ? (w - padX * 2) / (data.length - 1) : 0;
    return data.map((d, i) => ({
      x: padX + (data.length > 1 ? i * stepX : w / 2),
      y: h - padY - ((d.amount / max) * (h - padY * 2)),
    }));
  }

  get trendPoints(): string {
    return this.trendCoords.map(p => `${p.x},${p.y}`).join(' ');
  }

  get reservationsByPeriod(): { period: string; count: number }[] {
    const map = new Map<string, number>();
    for (const r of this.filteredReservations) {
      const d = new Date(r.startDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!this.monthUpToSept(key)) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  get maxResPeriod(): number {
    return Math.max(...this.reservationsByPeriod.map(i => i.count), 1);
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

  loadData(): void {
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
        next: (props) => { this.properties = props; this.markLoaded(); },
        error: () => this.markLoaded(),
      });
    }

    const resObs = user?.role === 'SAMSAR'
      ? this.reservationService.findMine()
      : this.reservationService.findByOwner();
    resObs.subscribe({
      next: (res) => { this.allReservations = res; this.markLoaded(); },
      error: () => this.markLoaded(),
    });
  }

  private markLoaded(): void {
    this.pendingLoads = Math.max(0, this.pendingLoads - 1);
    if (this.pendingLoads === 0) this.loading = false;
  }
}
