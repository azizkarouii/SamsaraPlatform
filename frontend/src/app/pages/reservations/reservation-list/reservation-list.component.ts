import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';
import { ReservationService } from '../../../services/reservation.service';
import { UiPreferencesService } from '../../../services/ui-preferences.service';
import { Reservation, normalizeReservationStatus, statusKey } from '../../../models/reservation.model';
import { t } from '../../../shared/translations';

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
    MatTabsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ t('reservations') }}</h1>
          <p class="subtitle">{{ isOwner ? t('reservations_owner_subtitle') : t('reservations_samsar_subtitle') }}</p>
        </div>
        <a mat-raised-button color="primary" routerLink="/reservations/add">
          <mat-icon>add</mat-icon> {{ t('reservation_new_title') }}
        </a>
      </div>

      <mat-card>
        <mat-card-content>
          <nav mat-tab-nav-bar [tabPanel]="tabPanel" class="filter-tabs">
            <a mat-tab-link *ngFor="let tab of tabs" [active]="activeTab === tab" (click)="filterByStatus(tab)">
              {{ tab === 'all' ? t('all') : t(statusKey(tab)) }}
              <span class="tab-count">{{ countFor(tab) }}</span>
            </a>
          </nav>
          <mat-tab-nav-panel #tabPanel></mat-tab-nav-panel>

          <mat-form-field appearance="outline" class="search-field">
            <mat-label>{{ t('search_reservations') }}</mat-label>
            <input matInput (input)="applySearch($any($event.target).value)" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <div *ngIf="loading" class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <div *ngIf="!loading && dataSource.filteredData.length === 0" class="empty-state">
            <mat-icon>event_busy</mat-icon>
            <p>{{ t('no_reservations') }}</p>
            <a mat-raised-button color="primary" routerLink="/reservations/add" *ngIf="!allReservations.length">{{ t('reservation_new_title') }}</a>
          </div>

          <div class="table-wrap" [hidden]="loading || dataSource.filteredData.length === 0">
            <table mat-table [dataSource]="dataSource" matSort matSortActive="startDate" matSortDirection="desc" class="reservation-table">
              <ng-container matColumnDef="clientName">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ t('client') }}</th>
                <td mat-cell *matCellDef="let res">
                  <div class="client">
                    <strong>{{ res.clientName }}</strong>
                    <span *ngIf="res.clientPhone">{{ res.clientPhone }}</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="propertyTitle">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ t('property_label') }}</th>
                <td mat-cell *matCellDef="let res">
                  {{ res.property?.title || '#' + res.propertyId }}
                  <div class="by" *ngIf="res.samsar && res.samsarId !== currentUserId">{{ t('by') }} {{ res.samsar.name }}</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="startDate">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ t('dates') }}</th>
                <td mat-cell *matCellDef="let res" class="nowrap">{{ res.startDate | date:'dd/MM/yyyy' }} → {{ res.endDate | date:'dd/MM/yyyy' }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ t('reservation_status_label') }}</th>
                <td mat-cell *matCellDef="let res">
                  <span class="status-chip" [ngClass]="'status-' + normalize(res.status)">{{ t(statusKey(res.status)) }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="totalAmount">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ t('amount') }}</th>
                <td mat-cell *matCellDef="let res" class="nowrap">
                  {{ res.totalAmount | number:'1.0-0' }} TND
                  <div class="by" *ngIf="res.samsarGain">{{ isOwner ? t('samsar_gain') : t('your_gain') }} : {{ res.samsarGain | number:'1.0-2' }} TND</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let res" class="nowrap">
                  <button mat-icon-button [routerLink]="['/reservations', res.id]" [matTooltip]="t('view')" (click)="$event.stopPropagation()">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button *ngIf="canEdit(res)" [routerLink]="['/reservations', res.id, 'edit']" [matTooltip]="t('edit')" (click)="$event.stopPropagation()">
                    <mat-icon>edit</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="clickable-row" (click)="open(row)"></tr>
            </table>
          </div>

          <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons [hidden]="loading || dataSource.filteredData.length === 0"></mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .filter-tabs { margin-bottom: 1rem; }
    .tab-count {
      margin-inline-start: 0.4rem; font-size: 0.7rem; padding: 0 0.45rem; border-radius: 999px;
      background: var(--surface-subtle); color: var(--text-secondary);
    }
    .search-field { width: 100%; }
    .table-wrap { overflow-x: auto; }
    .reservation-table { width: 100%; min-width: 640px; }
    .client { display: flex; flex-direction: column; }
    .client span, .by { font-size: 0.75rem; color: var(--text-secondary); }
    .nowrap { white-space: nowrap; }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: var(--surface-hover); }
  `]
})
export class ReservationListComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['clientName', 'propertyTitle', 'startDate', 'status', 'totalAmount', 'actions'];
  dataSource = new MatTableDataSource<Reservation>([]);
  allReservations: Reservation[] = [];
  loading = true;
  activeTab = 'all';
  searchValue = '';
  isOwner = false;
  currentUserId?: number;
  readonly tabs = ['all', 'pending', 'confirmed', 'in-progress', 'completed', 'cancelled'];
  readonly statusKey = statusKey;
  readonly normalize = normalizeReservationStatus;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private reservationService: ReservationService,
    private uiPrefs: UiPreferencesService,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.isOwner = user?.role === 'PROPRIETAIRE';
    this.currentUserId = user?.id;
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab && this.tabs.includes(tab)) {
      this.activeTab = tab;
    }
    this.loadReservations();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.dataSource.sortingDataAccessor = (item, column) => {
      switch (column) {
        case 'propertyTitle': return item.property?.title?.toLowerCase() ?? '';
        case 'clientName': return item.clientName.toLowerCase();
        default: return (item as any)[column];
      }
    };
    // Spec F7: search by client name, phone or property title
    this.dataSource.filterPredicate = (data: Reservation, filter: string) =>
      [data.clientName, data.clientPhone, data.property?.title]
        .some(value => (value ?? '').toLowerCase().includes(filter));
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  private loadReservations(): void {
    const obs = this.isOwner ? this.reservationService.findByOwner() : this.reservationService.findMine();
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

  countFor(tab: string): number {
    return tab === 'all'
      ? this.allReservations.length
      : this.allReservations.filter(r => normalizeReservationStatus(r.status) === tab).length;
  }

  filterByStatus(status: string): void {
    this.activeTab = status;
    this.router.navigate([], { queryParams: { tab: status === 'all' ? null : status }, replaceUrl: true });
    this.applyFilter();
  }

  applySearch(value: string): void {
    this.searchValue = value;
    this.dataSource.filter = value.toLowerCase().trim();
    this.paginator?.firstPage();
  }

  private applyFilter(): void {
    this.dataSource.data = this.activeTab === 'all'
      ? this.allReservations
      : this.allReservations.filter(r => normalizeReservationStatus(r.status) === this.activeTab);
    this.dataSource.filter = this.searchValue.toLowerCase().trim();
  }

  canEdit(res: Reservation): boolean {
    const status = normalizeReservationStatus(res.status);
    const manager = res.samsarId === this.currentUserId || res.property?.createdBy === this.currentUserId;
    return manager && status !== 'completed' && status !== 'cancelled';
  }

  open(res: Reservation): void {
    this.router.navigate(['/reservations', res.id]);
  }
}
