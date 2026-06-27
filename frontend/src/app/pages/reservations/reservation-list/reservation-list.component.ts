import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';
import { ReservationService } from '../../../services/reservation.service';
import { Reservation } from '../../../models/reservation.model';

@Component({
  selector: 'app-reservation-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatTabsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="reservation-list-container">
      <div class="header">
        <h1>Reservations</h1>
        <button mat-raised-button color="primary" routerLink="/reservations/add">
          <mat-icon>add</mat-icon> Add Reservation
        </button>
      </div>

      <mat-card>
        <mat-card-content>
          <nav mat-tab-nav-bar class="filter-tabs">
            <a mat-tab-link *ngFor="let tab of tabs" [active]="activeTab === tab.value" (click)="filterByStatus(tab.value)">
              {{ tab.label }}
            </a>
          </nav>

          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search by client name</mat-label>
            <input matInput (input)="applySearch($any($event.target).value)" placeholder="Search..." />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <div *ngIf="loading; else loadedContent" class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <ng-template #loadedContent>
            <div *ngIf="dataSource.data.length === 0" class="empty-state">
              <mat-icon class="empty-icon">book_online</mat-icon>
              <p>No reservations found</p>
              <button mat-raised-button color="primary" routerLink="/reservations/add">Add your first reservation</button>
            </div>

            <table mat-table [dataSource]="dataSource" matSort class="reservation-table" *ngIf="dataSource.data.length > 0">
              <ng-container matColumnDef="clientName">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Client</th>
                <td mat-cell *matCellDef="let res">{{ res.clientName }}</td>
              </ng-container>

              <ng-container matColumnDef="propertyTitle">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Property</th>
                <td mat-cell *matCellDef="let res">{{ res.property?.title || 'Property #' + res.propertyId }}</td>
              </ng-container>

              <ng-container matColumnDef="startDate">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Start Date</th>
                <td mat-cell *matCellDef="let res">{{ res.startDate | date:'shortDate' }}</td>
              </ng-container>

              <ng-container matColumnDef="endDate">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>End Date</th>
                <td mat-cell *matCellDef="let res">{{ res.endDate | date:'shortDate' }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
                <td mat-cell *matCellDef="let res">
                  <mat-chip [color]="getStatusColor(res.status)" selected>{{ res.status }}</mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="totalAmount">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Amount</th>
                <td mat-cell *matCellDef="let res">{{ res.totalAmount | currency:'TND':'symbol':'1.0-0' }}</td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let res">
                  <button mat-icon-button color="primary" [routerLink]="['/reservations', res.id]" matTooltip="View">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button color="accent" [routerLink]="['/reservations', res.id, 'edit']" matTooltip="Edit">
                    <mat-icon>edit</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="clickable-row" [routerLink]="['/reservations', row.id]"></tr>
            </table>

            <mat-paginator [pageSizeOptions]="[5, 10, 25]" showFirstLastButtons *ngIf="dataSource.data.length > 0"></mat-paginator>
          </ng-template>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .reservation-list-container {
      padding: 1.5rem;
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
    .filter-tabs {
      margin-bottom: 1rem;
    }
    .search-field {
      width: 100%;
      margin-bottom: 1rem;
    }
    .reservation-table {
      width: 100%;
    }
    .clickable-row {
      cursor: pointer;
    }
    .clickable-row:hover {
      background: rgba(0,0,0,0.04);
    }
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
      color: rgba(0,0,0,0.5);
    }
    .empty-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      margin-bottom: 1rem;
    }
  `]
})
export class ReservationListComponent implements OnInit {
  displayedColumns: string[] = ['clientName', 'propertyTitle', 'startDate', 'endDate', 'status', 'totalAmount', 'actions'];
  dataSource = new MatTableDataSource<Reservation>([]);
  allReservations: Reservation[] = [];
  loading = true;
  activeTab = 'all';
  searchValue = '';

  tabs = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Confirmed', value: 'confirmed' },
  ];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private reservationService: ReservationService
  ) {}

  ngOnInit(): void {
    this.loadReservations();
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab && this.tabs.some(t => t.value === tab)) {
      this.activeTab = tab;
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.dataSource.filterPredicate = (data: Reservation, filter: string) => {
      const lower = filter.toLowerCase();
      return data.clientName.toLowerCase().includes(lower);
    };
  }

  private loadReservations(): void {
    const user = this.authService.getCurrentUser();
    const obs = user?.role === 'SAMSAR'
      ? this.reservationService.findMine()
      : this.reservationService.findByOwner();

    obs.subscribe({
      next: (reservations) => {
        this.allReservations = reservations;
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  filterByStatus(status: string): void {
    this.activeTab = status;
    this.applyFilter();
  }

  applySearch(value: string): void {
    this.searchValue = value;
    this.dataSource.filter = value.toLowerCase().trim();
  }

  private applyFilter(): void {
    if (this.activeTab === 'all') {
      this.dataSource.data = this.allReservations;
    } else {
      this.dataSource.data = this.allReservations.filter(r => r.status === this.activeTab);
    }
    this.dataSource.filter = this.searchValue.toLowerCase().trim();
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'primary';
      case 'pending': return 'accent';
      case 'in_progress': return 'primary';
      case 'cancelled': return 'warn';
      default: return '';
    }
  }
}
