import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PropertyService } from '../../../services/property.service';
import { PropertySamsarService } from '../../../services/property-samsar.service';
import { ReservationService } from '../../../services/reservation.service';
import { Property } from '../../../models/property.model';
import { Planning, statusKey } from '../../../models/reservation.model';
import { UiPreferencesService } from '../../../services/ui-preferences.service';
import { TRANSLATIONS } from '../../../shared/translations';
import { ShareDialogComponent } from './share-dialog.component';
import { PropertyThumbComponent } from '../../../shared/property-thumb.component';
import { OccupancyStripComponent } from '../../../shared/occupancy-strip.component';
import { SearchBarComponent } from '../../../shared/search-bar.component';
import { DatePillComponent } from '../../../shared/date-pill.component';
import { HouseToday, OccupancyDay, houseToday, occupancyOf, occupancyRate, stripRange } from '../../../shared/house-occupancy';
import { formatIsoDate, parseIsoDate } from '../../../shared/calendar-utils';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

const VIEW_KEY = 'samsara-houses-view';

/** What a card shows besides the house itself. */
interface HouseState { days: OccupancyDay[]; today: HouseToday; rate: number; samsars: number }

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [
    PropertyThumbComponent,
    OccupancyStripComponent,
    SearchBarComponent,
    DatePillComponent,
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ t('my_properties') }}</h1>
          <p class="subtitle">{{ t('my_properties_subtitle') }}</p>
        </div>
        <div class="header-actions">
          <div class="segmented" role="group">
            <button type="button" [class.active]="view === 'cards'" (click)="setView('cards')"><mat-icon>grid_view</mat-icon> {{ t('view_cards') }}</button>
            <button type="button" [class.active]="view === 'table'" (click)="setView('table')"><mat-icon>table_rows</mat-icon> {{ t('view_table') }}</button>
          </div>
          <a mat-raised-button color="primary" routerLink="/properties/add"><mat-icon>add</mat-icon> {{ t('add_property') }}</a>
        </div>
      </div>

      <div class="kpis" *ngIf="planning">
        <div class="kpi"><span class="kpi-value">{{ planning.houses.length }}</span><span class="kpi-label">{{ t('kpi_houses') }}</span></div>
        <div class="kpi occupied"><span class="kpi-value">{{ occupiedToday }}</span><span class="kpi-label">{{ t('kpi_occupied_today') }}</span></div>
        <div class="kpi free"><span class="kpi-value">{{ planning.houses.length - occupiedToday }}</span><span class="kpi-label">{{ t('kpi_free_today') }}</span></div>
        <div class="kpi arrivals"><span class="kpi-value">{{ arrivalsThisWeek }}</span><span class="kpi-label">{{ t('kpi_arrivals_week') }}</span></div>
      </div>

      <div class="toolbar">
        <app-search-bar class="search-field" [value]="searchControl.value || ''" (valueChange)="searchControl.setValue($event)"
                        [label]="t('search_houses_label')" [hints]="houseHints" [count]="total" [countLabel]="t('result_houses')" [countLabelOne]="t('result_house_one')"
                        [clearLabel]="t('clear_filter')" [busy]="loading"></app-search-bar>
        <app-date-pill class="date-field" [value]="dateControl.value" (valueChange)="onDatePicked($event)" [min]="today"
                       [label]="t('free_houses_on')" [emptyLabel]="t('free_on_date')" [clearLabel]="t('clear_filter')"
                       [locale]="locale" [quick]="quickDays"></app-date-pill>
        <div class="segmented sort" role="group" *ngIf="view === 'cards'" [attr.aria-label]="t('sort_by')">
          <button type="button" [class.active]="sort === 'createdAt'" (click)="sortBy('createdAt', 'desc')">{{ t('sort_recent') }}</button>
          <button type="button" [class.active]="sort === 'pricePerDay'" (click)="sortBy('pricePerDay', 'asc')">{{ t('sort_price') }}</button>
          <button type="button" [class.active]="sort === 'title'" (click)="sortBy('title', 'asc')">A → Z</button>
        </div>
      </div>

      <div *ngIf="loading" class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>

      <div *ngIf="!loading && !rows.length" class="empty-panel">
        <div class="empty-art" aria-hidden="true"><mat-icon>add_home_work</mat-icon></div>
        <h2>{{ t('no_properties_found') }}</h2>
        <a mat-raised-button color="primary" routerLink="/properties/add">{{ t('add_first_property') }}</a>
      </div>

      <!-- ===== Cards ===== -->
      <div class="cards" *ngIf="!loading && rows.length && view === 'cards'">
        <article class="house-card lift-card" *ngFor="let prop of rows; let i = index" [style.--i]="i" (click)="open(prop)">
          <div class="cover">
            <app-property-thumb class="photo" [path]="prop.coverImage"></app-property-thumb>
            <span class="shade" aria-hidden="true"></span>
            <ng-container *ngIf="state(prop) as s">
              <span class="badge" [class.occupied]="s.today.occupied">
                <i class="pulse"></i>
                <ng-container *ngIf="s.today.occupied">{{ t('house_occupied') }} · {{ s.today.client }} → {{ short(s.today.until) }}</ng-container>
                <ng-container *ngIf="!s.today.occupied">{{ t('house_free') }}<ng-container *ngIf="s.today.nextArrival"> · {{ t('next_arrival_on') }} {{ short(s.today.nextArrival) }}</ng-container></ng-container>
              </span>
            </ng-container>
            <span class="config" *ngIf="prop.configuration">{{ prop.configuration }}</span>
            <span class="price" *ngIf="prop.pricePerDay"><b>{{ prop.pricePerDay | number:'1.0-0' }}</b> TND <small>/ {{ t('day') }}</small></span>
          </div>

          <div class="body">
            <h3>{{ prop.title }}</h3>
            <p class="address"><mat-icon inline>place</mat-icon>{{ prop.address || '—' }}</p>
            <div class="features" *ngIf="hasFeatures(prop)">
              <span *ngIf="prop.maxCapacity" [matTooltip]="t('capacity_col')"><mat-icon>group</mat-icon>{{ prop.maxCapacity }}</span>
              <span *ngIf="prop.bathrooms" [matTooltip]="t('bathrooms')"><mat-icon>bathtub</mat-icon>{{ prop.bathrooms }}</span>
              <mat-icon *ngIf="prop.pool" [matTooltip]="t('pool')">pool</mat-icon>
              <mat-icon *ngIf="prop.seaView" [matTooltip]="t('sea_view')">waves</mat-icon>
              <mat-icon *ngIf="prop.wifi" [matTooltip]="t('wifi')">wifi</mat-icon>
              <mat-icon *ngIf="prop.airCondition" [matTooltip]="t('air_condition')">ac_unit</mat-icon>
              <mat-icon *ngIf="prop.garage" [matTooltip]="t('garage')">garage</mat-icon>
              <mat-icon *ngIf="prop.terrace" [matTooltip]="t('terrace')">deck</mat-icon>
            </div>

            <ng-container *ngIf="state(prop) as s">
              <div class="strip-head">
                <span>{{ t('next_14_days') }}</span>
                <span class="rate"><i [style.width.%]="s.rate"></i></span>
                <b>{{ s.rate }} %</b>
              </div>
              <app-occupancy-strip [days]="s.days" [labels]="stripLabels" [label]="t('next_14_days')"></app-occupancy-strip>
            </ng-container>

            <div class="foot" (click)="$event.stopPropagation()">
              <a class="samsars" routerLink="/shared-houses" [matTooltip]="t('my_samsars')">
                <mat-icon>groups</mat-icon> {{ state(prop)?.samsars ?? 0 }}
              </a>
              <span class="spacer"></span>
              <a mat-icon-button [routerLink]="['/reservations/add']" [queryParams]="{ propertyId: prop.id }" [matTooltip]="t('book')"><mat-icon>event_available</mat-icon></a>
              <button mat-icon-button (click)="openShareDialog(prop)" [matTooltip]="t('share')"><mat-icon>person_add</mat-icon></button>
              <a mat-icon-button [routerLink]="['/properties', prop.id, 'edit']" [matTooltip]="t('edit')"><mat-icon>edit</mat-icon></a>
            </div>
          </div>
        </article>
      </div>

      <!-- ===== Table ===== -->
      <mat-card *ngIf="!loading && rows.length && view === 'table'">
        <mat-card-content>
          <div class="table-wrap">
            <table mat-table [dataSource]="rows" matSort [matSortActive]="sort" [matSortDirection]="direction === 'asc' ? 'asc' : 'desc'" (matSortChange)="onSort($event)" class="property-table">
              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ t('title_col') }}</th>
                <td mat-cell *matCellDef="let prop">
                  <div class="title-cell">
                    <app-property-thumb [path]="prop.coverImage"></app-property-thumb>
                    <div>
                      <strong>{{ prop.title }}</strong>
                      <div class="sub" *ngIf="prop.configuration">{{ prop.configuration }}</div>
                    </div>
                  </div>
                </td>
              </ng-container>
              <ng-container matColumnDef="address">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ t('address_col') }}</th>
                <td mat-cell *matCellDef="let prop">{{ prop.address || '-' }}</td>
              </ng-container>
              <ng-container matColumnDef="pricePerDay">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ t('price_day_col') }}</th>
                <td mat-cell *matCellDef="let prop">{{ prop.pricePerDay ? (prop.pricePerDay | number:'1.0-0') + ' TND' : '-' }}</td>
              </ng-container>
              <ng-container matColumnDef="occupancy">
                <th mat-header-cell *matHeaderCellDef>{{ t('next_14_days') }}</th>
                <td mat-cell *matCellDef="let prop" class="strip-cell">
                  <app-occupancy-strip *ngIf="state(prop) as s" [days]="s.days" [labels]="stripLabels"></app-occupancy-strip>
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>{{ t('actions_col') }}</th>
                <td mat-cell *matCellDef="let prop" class="nowrap">
                  <a mat-icon-button [routerLink]="['/properties', prop.id, 'edit']" (click)="$event.stopPropagation()" [matTooltip]="t('edit')"><mat-icon>edit</mat-icon></a>
                  <button mat-icon-button color="primary" (click)="openShareDialog(prop); $event.stopPropagation()" [matTooltip]="t('share')"><mat-icon>person_add</mat-icon></button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="clickable-row" (click)="open(row)"></tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-paginator [length]="total" [pageIndex]="page" [pageSize]="pageSize" [pageSizeOptions]="[6, 12, 24]" (page)="onPage($event)"
                     showFirstLastButtons *ngIf="!loading && total > pageSize"></mat-paginator>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; }
    .segmented mat-icon { font-size: 18px; width: 18px; height: 18px; vertical-align: -4px; margin-inline-end: 0.2rem; }


    .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; }
    .search-field { flex: 1 1 260px; }
    .date-field { flex: 0 0 auto; }

    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.1rem; }


    .features { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; color: var(--text-secondary); }
    .features span { display: inline-flex; align-items: center; gap: 0.15rem; font-size: 0.8rem; font-weight: 600; }
    .features mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .strip-head { display: flex; align-items: center; gap: 0.5rem; font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.2rem; }
    .strip-head b { color: var(--text-primary); font-size: 0.75rem; }
    .rate { flex: 1; height: 4px; border-radius: 2px; background: var(--border-color); overflow: hidden; }
    .rate i { display: block; height: 100%; background: var(--status-in-progress); }
    .samsars { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); text-decoration: none; padding: 0.3rem 0.5rem; border-radius: 8px; }
    .samsars:hover { background: var(--surface-hover); color: var(--primary); }


    .table-wrap { overflow-x: auto; }
    .property-table { width: 100%; min-width: 760px; }
    .title-cell { display: flex; align-items: center; gap: 0.75rem; padding: 0.4rem 0; }
    .sub { font-size: 0.75rem; color: var(--text-secondary); }
    .strip-cell { min-width: 280px; --strip-days: 14; }
    .nowrap { white-space: nowrap; }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: var(--surface-hover); }
  `]
})
export class PropertyListComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['title', 'address', 'pricePerDay', 'occupancy', 'actions'];
  rows: Property[] = [];
  total = 0;
  page = 0;
  pageSize = 12;
  view: 'cards' | 'table' = 'cards';
  searchControl = new FormControl('');
  dateControl = new FormControl<Date | null>(null);
  loading = true;
  sort = 'createdAt';
  direction = 'desc';
  planning?: Planning;
  private states = new Map<number, HouseState>();
  private samsarCounts = new Map<number, number>();
  private readonly subscriptions = new Subscription();
  private request?: Subscription;

  constructor(
    private propertyService: PropertyService,
    private propertySamsarService: PropertySamsarService,
    private reservationService: ReservationService,
    public router: Router,
    private dialog: MatDialog,
    private uiPrefs: UiPreferencesService,
  ) {}

  ngOnInit(): void {
    try {
      if (localStorage.getItem(VIEW_KEY) === 'table') this.view = 'table';
    } catch {
      // No storage: the cards
    }
    this.loadProperties();
    this.loadOccupancy();
    this.subscriptions.add(this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.page = 0;
      this.loadProperties();
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.request?.unsubscribe();
  }

  t(key: string): string {
    return TRANSLATIONS[key]?.[this.uiPrefs.getLanguage()] ?? key;
  }

  get stripLabels(): Record<string, string> {
    return {
      free: this.t('planning_free'), blocked: this.t('planning_blocked'),
      pending: this.t(statusKey('pending')), confirmed: this.t(statusKey('confirmed')),
      'in-progress': this.t(statusKey('in-progress')), completed: this.t(statusKey('completed')),
    };
  }

  /** Titles of the houses as examples in the search field. */
  get houseHints(): string[] {
    return this.planning?.houses.slice(0, 5).map(h => h.title) ?? [];
  }

  get occupiedToday(): number {
    return [...this.states.values()].filter(s => s.today.occupied).length;
  }

  /** Arrivals of the 7 days to come, today included. */
  get arrivalsThisWeek(): number {
    if (!this.planning) return 0;
    const { from } = stripRange();
    const last = parseIsoDate(from);
    last.setDate(last.getDate() + 6);
    const to = formatIsoDate(last);
    return this.planning.stays.filter(s => s.status !== 'pending' && s.startDate >= from && s.startDate <= to).length;
  }

  state(prop: Property): HouseState | undefined {
    return this.states.get(prop.id);
  }

  hasFeatures(prop: Property): boolean {
    return !!(prop.maxCapacity || prop.bathrooms || prop.pool || prop.seaView || prop.wifi || prop.airCondition || prop.garage || prop.terrace);
  }

  short(iso?: string): string {
    return iso ? iso.slice(8) + '/' + iso.slice(5, 7) : '';
  }

  open(prop: Property): void {
    this.router.navigate(['/properties', prop.id]);
  }

  setView(view: 'cards' | 'table'): void {
    this.view = view;
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      // Not kept: fine
    }
  }

  sortBy(sort: string, direction: 'asc' | 'desc'): void {
    this.sort = sort;
    this.direction = direction;
    this.page = 0;
    this.loadProperties();
  }

  onSort(sort: Sort): void {
    this.sortBy(sort.direction ? sort.active : 'createdAt', sort.direction || 'desc');
  }

  onPage(event: PageEvent): void {
    this.page = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadProperties();
  }

  openShareDialog(property: Property): void {
    this.dialog.open(ShareDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: { propertyId: property.id, propertyTitle: property.title },
    }).afterClosed().subscribe(() => this.loadSamsarCounts());
  }

  readonly today = new Date(new Date().setHours(0, 0, 0, 0));

  get locale(): string {
    return { fr: 'fr-FR', en: 'en-GB', ar: 'ar-TN' }[this.uiPrefs.getLanguage()] ?? 'fr-FR';
  }

  /** Today, and the Saturday of this weekend (today when the weekend has begun). */
  get quickDays(): { label: string; date: Date }[] {
    const saturday = new Date(this.today);
    const weekday = saturday.getDay();
    if (weekday !== 6 && weekday !== 0) saturday.setDate(saturday.getDate() + (6 - weekday));
    return [
      { label: this.t('today'), date: this.today },
      { label: this.t('preset_weekend'), date: saturday },
    ];
  }

  onDatePicked(date: Date | null): void {
    this.dateControl.setValue(date);
    this.onDateChange();
  }

  onDateChange(): void {
    this.page = 0;
    this.loadProperties();
  }

  clearDateFilter(event: MouseEvent): void {
    event.stopPropagation();
    this.dateControl.setValue(null);
    this.page = 0;
    this.loadProperties();
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** A newer request replaces one still in flight, so an older answer cannot overwrite the list. */
  private loadProperties(): void {
    const dateVal = this.dateControl.value;
    this.request?.unsubscribe();
    this.request = this.propertyService.findMinePage({
      search: (this.searchControl.value || '').trim(),
      date: dateVal ? this.formatDate(dateVal) : undefined,
      page: this.page,
      size: this.pageSize,
      sort: this.sort,
      direction: this.direction,
    }).subscribe({
      next: (result) => {
        this.rows = result.content;
        this.total = result.totalElements;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  /** The next 14 days of every house and how many samsars work on each: the cards' life. */
  private loadOccupancy(): void {
    const { from, to } = stripRange();
    this.reservationService.planning(from, to).subscribe(planning => {
      this.planning = planning;
      this.rebuildStates();
    });
    this.loadSamsarCounts();
  }

  private loadSamsarCounts(): void {
    this.propertySamsarService.findByOwner().subscribe(relations => {
      this.samsarCounts.clear();
      for (const rel of relations) this.samsarCounts.set(rel.propertyId, (this.samsarCounts.get(rel.propertyId) ?? 0) + 1);
      this.rebuildStates();
    });
  }

  private rebuildStates(): void {
    if (!this.planning) return;
    const next = new Map<number, HouseState>();
    for (const house of this.planning.houses) {
      const days = occupancyOf(this.planning, house.id);
      next.set(house.id, { days, today: houseToday(this.planning, house.id), rate: occupancyRate(days), samsars: this.samsarCounts.get(house.id) ?? 0 });
    }
    this.states = next;
  }
}
