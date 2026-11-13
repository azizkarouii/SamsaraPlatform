import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';
import { ReservationService } from '../../../services/reservation.service';
import { UiPreferencesService } from '../../../services/ui-preferences.service';
import { Reservation, normalizeReservationStatus, statusKey } from '../../../models/reservation.model';
import { t } from '../../../shared/translations';
import { ReservationKanbanComponent } from './reservation-kanban.component';
import { SearchBarComponent } from '../../../shared/search-bar.component';

import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

const VIEW_KEY = 'samsara-reservations-view';

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
    MatTooltipModule,
    MatProgressSpinnerModule,
    ReservationKanbanComponent,
    SearchBarComponent,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ t('reservations') }}</h1>
          <p class="subtitle">{{ isOwner ? t('reservations_owner_subtitle') : t('reservations_samsar_subtitle') }}</p>
        </div>
        <div class="header-actions">
          <div class="segmented" role="group">
            <button type="button" [class.active]="view === 'table'" (click)="setView('table')"><mat-icon>table_rows</mat-icon> {{ t('view_table') }}</button>
            <button type="button" [class.active]="view === 'kanban'" (click)="setView('kanban')"><mat-icon>view_kanban</mat-icon> Kanban</button>
          </div>
          <a mat-raised-button color="primary" routerLink="/reservations/add">
            <mat-icon>add</mat-icon> {{ t('reservation_new_title') }}
          </a>
        </div>
      </div>

      <ng-container *ngIf="view === 'kanban'">
        <app-search-bar class="search-field" [value]="searchValue" (valueChange)="applySearch($event)"
                        [label]="t('search_reservations')" [hints]="hints" [clearLabel]="t('clear_filter')"></app-search-bar>
        <app-reservation-kanban [search]="searchValue" [currentUserId]="currentUserId" (showAll)="showAllOf($event)"></app-reservation-kanban>
      </ng-container>

      <mat-card *ngIf="view === 'table'">
        <mat-card-content>
          <div class="filter-tabs">
            <div class="segmented" role="tablist">
              <button type="button" role="tab" *ngFor="let tab of tabs" [class.active]="activeTab === tab"
                      [attr.aria-selected]="activeTab === tab" (click)="filterByStatus(tab)">
                <i class="tab-dot" [ngClass]="'bg-' + tab" *ngIf="tab !== 'all'"></i>{{ tab === 'all' ? t('all') : t(statusKey(tab)) }}
                <span class="count">{{ countFor(tab) }}</span>
              </button>
            </div>
          </div>

          <app-search-bar class="search-field" [value]="searchValue" (valueChange)="applySearch($event)"
                          [label]="t('search_reservations')" [hints]="hints" [count]="total" [countLabel]="t('result_bookings')" [countLabelOne]="t('result_booking_one')"
                          [clearLabel]="t('clear_filter')" [busy]="loading"></app-search-bar>

          <div *ngIf="loading" class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <div *ngIf="!loading && rows.length === 0" class="empty-state">
            <mat-icon>event_busy</mat-icon>
            <p>{{ t('no_reservations') }}</p>
            <a mat-raised-button color="primary" routerLink="/reservations/add" *ngIf="!countFor('all')">{{ t('reservation_new_title') }}</a>
          </div>

          <div class="table-wrap" [hidden]="rows.length === 0">
            <table mat-table [dataSource]="rows" matSort matSortActive="startDate" matSortDirection="desc" (matSortChange)="onSort($event)" class="reservation-table">
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

          <mat-paginator [length]="total" [pageIndex]="page" [pageSize]="pageSize" [pageSizeOptions]="[10, 25, 50]" (page)="onPage($event)"
                         showFirstLastButtons [hidden]="total === 0"></mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .filter-tabs { margin-bottom: 1rem; overflow-x: auto; }
    .filter-tabs .segmented { white-space: nowrap; }
    .tab-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-inline-end: 0.4rem; vertical-align: 1px; }
    .tab-dot.bg-pending { background: var(--status-pending); }
    .tab-dot.bg-confirmed { background: var(--status-confirmed); }
    .tab-dot.bg-in-progress { background: var(--status-in-progress); }
    .tab-dot.bg-completed { background: var(--status-completed); }
    .tab-dot.bg-cancelled { background: var(--status-cancelled); }
    .search-field { width: 100%; margin-bottom: 1rem; }
    .header-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; }
    .segmented mat-icon { font-size: 18px; width: 18px; height: 18px; vertical-align: -4px; margin-inline-end: 0.2rem; }
    .table-wrap { overflow-x: auto; }
    .reservation-table { width: 100%; min-width: 640px; }
    .client { display: flex; flex-direction: column; }
    .client span, .by { font-size: 0.75rem; color: var(--text-secondary); }
    .nowrap { white-space: nowrap; }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: var(--surface-hover); }
  `]
})
export class ReservationListComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['clientName', 'propertyTitle', 'startDate', 'status', 'totalAmount', 'actions'];
  rows: Reservation[] = [];
  counts: Record<string, number> = {};
  total = 0;
  page = 0;
  pageSize = 10;
  loading = true;
  activeTab = 'all';
  view: 'table' | 'kanban' = 'table';
  isOwner = false;
  currentUserId?: number;
  readonly tabs = ['all', 'pending', 'confirmed', 'in-progress', 'completed', 'cancelled'];
  readonly statusKey = statusKey;
  readonly normalize = normalizeReservationStatus;
  searchValue = '';
  private sort = 'startDate';
  private direction = 'desc';
  private readonly searches = new Subject<string>();
  private readonly subscriptions = new Subscription();
  private loadRequest?: Subscription;

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
    const view = this.route.snapshot.queryParamMap.get('view') ?? this.savedView();
    this.view = view === 'kanban' ? 'kanban' : 'table';
    // Spec F7: search by client name, phone or property title, once typing pauses
    this.subscriptions.add(this.searches.pipe(debounceTime(300), distinctUntilChanged()).subscribe(value => {
      this.searchValue = value;
      this.page = 0;
      this.load();
    }));
    this.load();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.loadRequest?.unsubscribe();
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  /** A newer request replaces one still in flight, so an old answer cannot overwrite the current list. */
  private load(): void {
    if (this.view !== 'table') return;
    this.loading = true;
    this.loadRequest?.unsubscribe();
    this.loadRequest = this.reservationService.findPage({
      status: this.activeTab === 'all' ? '' : this.activeTab,
      search: this.searchValue,
      page: this.page,
      size: this.pageSize,
      sort: this.sort,
      direction: this.direction,
    }).subscribe({
      next: (result) => {
        this.rows = result.content;
        this.total = result.totalElements;
        this.counts = result.counts;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  setView(view: 'table' | 'kanban'): void {
    this.view = view;
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      // Not kept: fine
    }
    this.router.navigate([], { queryParams: { view: null }, queryParamsHandling: 'merge', replaceUrl: true });
    if (view === 'table') this.load();
  }

  showAllOf(status: string): void {
    this.setView('table');
    this.filterByStatus(status);
  }

  private savedView(): string | null {
    try {
      return localStorage.getItem(VIEW_KEY);
    } catch {
      return null;
    }
  }

  /** What can be typed: clients, houses and a phone number seen in the list. */
  get hints(): string[] {
    const names = this.rows.slice(0, 3).map(r => r.clientName);
    const houses = [...new Set(this.rows.map(r => r.property?.title).filter((t): t is string => !!t))].slice(0, 2);
    const phone = this.rows.find(r => r.clientPhone)?.clientPhone;
    return [...names, ...houses, ...(phone ? [phone] : [])];
  }

  countFor(tab: string): number {
    return tab === 'all'
      ? Object.values(this.counts).reduce((sum, count) => sum + count, 0)
      : this.counts[tab] ?? 0;
  }

  filterByStatus(status: string): void {
    this.activeTab = status;
    this.page = 0;
    this.router.navigate([], { queryParams: { tab: status === 'all' ? null : status }, replaceUrl: true });
    this.load();
  }

  applySearch(value: string): void {
    this.searches.next(value.trim());
  }

  onSort(sort: Sort): void {
    this.sort = sort.direction ? sort.active : 'startDate';
    this.direction = sort.direction || 'desc';
    this.page = 0;
    this.load();
  }

  onPage(event: PageEvent): void {
    this.page = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
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
