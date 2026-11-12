import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { ReservationService } from '../../services/reservation.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { RentalEarning, normalizeReservationStatus, statusKey } from '../../models/reservation.model';
import { t } from '../../shared/translations';
import { formatIsoDate, getShortMonthLabel, todayIso } from '../../shared/calendar-utils';

type Preset = 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'last_12' | 'custom';
type Column = 'propertyTitle' | 'clientName' | 'startDate' | 'status' | 'total' | 'paid' | 'earned';

/**
 * Earnings report by period: an owner sees his part of every rental of his houses, a samsar his gain.
 * Excel comes from the server; the PDF is the browser's print to PDF of this page (Arabic included).
 */
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    <div class="page">
      <div class="page-header no-print">
        <div>
          <h1>{{ t('reports') }}</h1>
          <p class="subtitle">{{ t('reports_subtitle') }}</p>
        </div>
        <div class="exports">
          <button mat-stroked-button (click)="downloadExcel()" [disabled]="!rows.length || downloading"><mat-icon>table_view</mat-icon> Excel</button>
          <button mat-raised-button color="primary" (click)="print()" [disabled]="!rows.length"><mat-icon>picture_as_pdf</mat-icon> PDF</button>
        </div>
      </div>

      <div class="period no-print">
        <div class="segmented presets" role="group">
          <button type="button" *ngFor="let p of presets" [class.active]="preset === p" (click)="applyPreset(p)">{{ t('period_' + p) }}</button>
        </div>
        <div class="date-filters" *ngIf="preset === 'custom'">
          <label><span>{{ t('from') }}</span><input type="date" [(ngModel)]="from" (change)="load()" /></label>
          <label><span>{{ t('to') }}</span><input type="date" [(ngModel)]="to" (change)="load()" /></label>
        </div>
        <span class="period-label" *ngIf="preset !== 'custom'">{{ periodLabel }}</span>
      </div>

      <div class="print-title">
        <strong>Samsara — {{ t('reports') }}</strong>
        <span>{{ user?.name }} · {{ periodLabel }}</span>
      </div>

      <div *ngIf="loading" class="loading-container"><mat-spinner diameter="36"></mat-spinner></div>

      <div *ngIf="!loading && !rows.length" class="empty-panel">
        <div class="empty-art" aria-hidden="true"><mat-icon>insights</mat-icon></div>
        <h2>{{ t('no_data_period') }}</h2>
        <p>{{ t('reports_empty_hint') }}</p>
      </div>

      <ng-container *ngIf="!loading && rows.length">
        <div class="kpis">
          <div class="kpi"><span class="kpi-value">{{ rows.length }}</span><span class="kpi-label">{{ t('kpi_rentals') }}</span></div>
          <div class="kpi"><span class="kpi-value">{{ sum('total') | number:'1.0-0' }}</span><span class="kpi-label">{{ t('kpi_billed') }} TND</span></div>
          <div class="kpi green"><span class="kpi-value">{{ sum('paid') | number:'1.0-0' }}</span><span class="kpi-label">{{ t('paid') }} TND</span></div>
          <div class="kpi gold"><span class="kpi-value">{{ sum('earned') | number:'1.0-0' }}</span><span class="kpi-label">{{ isSamsar ? t('my_gains') : t('my_part') }} TND</span></div>
          <div class="kpi warn" [class.calm]="!toCollect"><span class="kpi-value">{{ toCollect | number:'1.0-0' }}</span><span class="kpi-label">{{ t('to_collect') }} TND</span></div>
        </div>

        <div class="charts">
          <mat-card>
            <mat-card-content>
              <h3>{{ isSamsar ? t('my_gains') : t('my_part') }} · {{ t('by_month') }}</h3>
              <div class="columns">
                <div class="column" *ngFor="let m of months; trackBy: trackLabel" [class.current]="m.current" [title]="(m.amount | number:'1.0-0') + ' TND'">
                  <span class="column-value">{{ m.amount ? (m.amount | number:'1.0-0') : '' }}</span>
                  <div class="column-track"><div class="column-fill" [style.height.%]="m.amount / maxMonth * 100"></div></div>
                  <span class="column-label">{{ m.label }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card>
            <mat-card-content>
              <h3>{{ t('by_house') }}</h3>
              <div class="bars">
                <button type="button" class="bar" *ngFor="let h of houses; trackBy: trackTitle" [class.active]="search === h.title" (click)="toggleHouse(h.title)">
                  <span class="bar-label" [title]="h.title">{{ h.title }}</span>
                  <span class="bar-track"><i [style.width.%]="h.amount / maxHouse * 100"></i></span>
                  <span class="bar-value">{{ h.amount | number:'1.0-0' }}</span>
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <mat-card class="report">
          <mat-card-content>
            <div class="table-head no-print">
              <label class="search">
                <mat-icon>search</mat-icon>
                <input type="search" [(ngModel)]="search" [placeholder]="t('reports_search')" />
              </label>
              <span class="count">{{ shown.length }} / {{ rows.length }}</span>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th *ngFor="let c of columns" [class.num]="isNumber(c)" (click)="sortBy(c)" [attr.aria-sort]="sort === c ? (asc ? 'ascending' : 'descending') : null">
                      {{ t(columnKey(c)) }}<mat-icon class="sort-icon" *ngIf="sort === c">{{ asc ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let r of shown; trackBy: trackRow">
                    <td><a [routerLink]="['/reservations', r.id]">{{ r.propertyTitle }}</a></td>
                    <td>{{ r.clientName }}</td>
                    <td class="nowrap">{{ r.startDate | date:'dd/MM/yyyy' }} → {{ r.endDate | date:'dd/MM/yyyy' }}</td>
                    <td><span class="status-chip" [ngClass]="'status-' + normalize(r.status)">{{ t(statusKey(r.status)) }}</span></td>
                    <td class="num">{{ r.total | number:'1.0-2' }}</td>
                    <td class="num">
                      {{ r.paid | number:'1.0-2' }}
                      <span class="paid-bar" *ngIf="r.total"><i [style.width.%]="r.paid / r.total * 100"></i></span>
                    </td>
                    <td class="num"><strong>{{ r.earned | number:'1.0-2' }}</strong></td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="4">{{ t('total_short') }} ({{ shown.length }})</td>
                    <td class="num">{{ total(shown, 'total') | number:'1.0-2' }}</td>
                    <td class="num">{{ total(shown, 'paid') | number:'1.0-2' }}</td>
                    <td class="num"><strong>{{ total(shown, 'earned') | number:'1.0-2' }} TND</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </mat-card-content>
        </mat-card>
      </ng-container>
    </div>
  `,
  styles: [`
    .exports { display: flex; gap: 0.5rem; }
    .period { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.75rem; }
    .presets { flex-wrap: wrap; }
    .period-label { font-size: 0.85rem; color: var(--text-secondary); padding-bottom: 0.45rem; }
    .print-title { display: none; }
    .charts { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 1rem; }
    h3 { margin: 0 0 0.75rem; font-size: 0.95rem; font-weight: 600; }
    .columns { display: flex; align-items: flex-end; gap: 6px; height: 170px; overflow-x: auto; }
    .column { flex: 1; min-width: 30px; display: flex; flex-direction: column; align-items: center; height: 100%; gap: 4px; }
    .column-value { font-size: 0.65rem; color: var(--text-secondary); min-height: 1em; }
    .column-track { flex: 1; width: 100%; max-width: 34px; display: flex; align-items: flex-end; background: var(--surface-subtle); border-radius: 6px 6px 0 0; }
    .column-fill { width: 100%; background: var(--primary); border-radius: 6px 6px 0 0; min-height: 2px; transition: height 0.4s ease; }
    .column-label { font-size: 0.68rem; color: var(--text-secondary); white-space: nowrap; }
    .column.current .column-fill { background: var(--accent-gold); }
    .column.current .column-label { color: var(--accent-gold); font-weight: 700; }
    .bars { display: grid; gap: 0.35rem; }
    .bar { display: grid; grid-template-columns: minmax(80px, 140px) 1fr auto; align-items: center; gap: 0.6rem; padding: 0.3rem 0.4rem; border: 0; border-radius: 8px; background: transparent; font: inherit; color: inherit; cursor: pointer; text-align: start; }
    .bar:hover { background: var(--surface-hover); }
    .bar.active { background: var(--primary-soft); }
    .bar-label { font-size: 0.82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar-track { height: 10px; border-radius: 5px; background: var(--surface-subtle); overflow: hidden; }
    .bar-track i { display: block; height: 100%; background: var(--accent-gold); border-radius: 5px; }
    .bar-value { font-size: 0.8rem; font-weight: 700; font-variant-numeric: tabular-nums; }

    .table-head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.5rem; }
    .search { display: flex; align-items: center; gap: 0.4rem; flex: 1; max-width: 360px; padding: 0.35rem 0.7rem; border: 1px solid var(--border-color); border-radius: 10px; color: var(--text-secondary); }
    .search input { border: 0; outline: 0; background: transparent; font: inherit; color: var(--text-primary); flex: 1; min-width: 0; }
    .search:focus-within { border-color: var(--primary); }
    .count { font-size: 0.8rem; color: var(--text-secondary); }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; font-variant-numeric: tabular-nums; }
    th, td { padding: 0.6rem 0.5rem; border-bottom: 1px solid var(--border-color); text-align: start; }
    th { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-secondary); cursor: pointer; user-select: none; white-space: nowrap; }
    th:hover { color: var(--text-primary); }
    .sort-icon { font-size: 14px; width: 14px; height: 14px; vertical-align: -2px; margin-inline-start: 2px; }
    tbody tr:hover { background: var(--surface-hover); }
    tfoot td { font-weight: 600; border-bottom: 0; background: var(--surface-subtle); }
    .num { text-align: end; }
    .nowrap { white-space: nowrap; }
    .paid-bar { display: block; height: 3px; margin-top: 3px; border-radius: 2px; background: var(--border-color); overflow: hidden; }
    .paid-bar i { display: block; height: 100%; background: var(--primary); }
    a { color: var(--primary); text-decoration: none; }
    @media (max-width: 900px) { .charts { grid-template-columns: 1fr; } }
    @media print {
      .no-print, .charts { display: none !important; }
      .print-title { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; }
      .report { box-shadow: none !important; border: 0 !important; }
      .paid-bar { display: none; }
      a { color: inherit; }
    }
  `]
})
export class ReportsComponent implements OnInit {
  rows: RentalEarning[] = [];
  loading = true;
  downloading = false;
  from = '';
  to = '';
  preset: Preset = 'this_year';
  search = '';
  sort: Column = 'startDate';
  asc = false;
  readonly presets: Preset[] = ['this_month', 'last_month', 'this_year', 'last_year', 'last_12', 'custom'];
  readonly columns: Column[] = ['propertyTitle', 'clientName', 'startDate', 'status', 'total', 'paid', 'earned'];
  readonly statusKey = statusKey;
  readonly normalize = normalizeReservationStatus;

  constructor(
    private authService: AuthService,
    private reservationService: ReservationService,
    private snackBar: MatSnackBar,
    private uiPrefs: UiPreferencesService,
  ) {}

  get user() {
    return this.authService.getCurrentUser();
  }

  get isSamsar(): boolean {
    return this.user?.role === 'SAMSAR';
  }

  get periodLabel(): string {
    const show = (date: string) => date.split('-').reverse().join('/');
    if (this.from && this.to) return `${show(this.from)} → ${show(this.to)}`;
    if (this.from) return `${this.t('from')} ${show(this.from)}`;
    if (this.to) return `${this.t('to')} ${show(this.to)}`;
    return this.t('all_periods');
  }

  ngOnInit(): void {
    this.applyPreset('this_year');
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  /** The usual periods in one click; "custom" opens the two dates. */
  applyPreset(preset: Preset): void {
    this.preset = preset;
    if (preset === 'custom') return;
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const range: Record<Exclude<Preset, 'custom'>, [Date, Date]> = {
      this_month: [new Date(y, m, 1), new Date(y, m + 1, 0)],
      last_month: [new Date(y, m - 1, 1), new Date(y, m, 0)],
      this_year: [new Date(y, 0, 1), new Date(y, 11, 31)],
      last_year: [new Date(y - 1, 0, 1), new Date(y - 1, 11, 31)],
      last_12: [new Date(y, m - 11, 1), new Date(y, m + 1, 0)],
    };
    const [from, to] = range[preset];
    this.from = formatIsoDate(from);
    this.to = formatIsoDate(to);
    this.load();
  }

  load(): void {
    this.loading = true;
    this.reservationService.earningsReport(this.from || undefined, this.to || undefined).subscribe({
      next: (rows) => {
        this.rows = rows;
        this.loading = false;
      },
      error: () => this.loading = false,
    });
  }

  sum(column: 'total' | 'paid' | 'earned'): number {
    return this.total(this.rows, column);
  }

  total(rows: RentalEarning[], column: 'total' | 'paid' | 'earned'): number {
    return rows.reduce((sum, row) => sum + (row[column] || 0), 0);
  }

  /** What the clients still owe on the rentals that go ahead. */
  get toCollect(): number {
    return this.rows.filter(r => normalizeReservationStatus(r.status) !== 'cancelled')
      .reduce((sum, r) => sum + Math.max(0, (r.total || 0) - (r.paid || 0)), 0);
  }

  /** The rows matching the search (house or client), in the chosen order. */
  get shown(): RentalEarning[] {
    const query = this.search.trim().toLowerCase();
    const rows = query ? this.rows.filter(r => `${r.propertyTitle} ${r.clientName}`.toLowerCase().includes(query)) : [...this.rows];
    const sign = this.asc ? 1 : -1;
    return rows.sort((a, b) => {
      const x = a[this.sort] ?? '';
      const y = b[this.sort] ?? '';
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * sign;
    });
  }

  sortBy(column: Column): void {
    this.asc = this.sort === column ? !this.asc : !this.isNumber(column) && column !== 'startDate';
    this.sort = column;
  }

  isNumber(column: Column): boolean {
    return column === 'total' || column === 'paid' || column === 'earned';
  }

  columnKey(column: Column): string {
    return {
      propertyTitle: 'property_label', clientName: 'client', startDate: 'dates', status: 'reservation_status_label',
      total: 'total_amount_label', paid: 'paid', earned: this.isSamsar ? 'my_gains' : 'my_part',
    }[column];
  }

  /** My part month by month over the period (a stay counts in the month it starts). */
  get months(): { label: string; amount: number; current: boolean }[] {
    if (!this.from || !this.to) return [];
    const language = this.uiPrefs.getLanguage();
    const current = todayIso().slice(0, 7);
    const result: { key: string; label: string; amount: number; current: boolean }[] = [];
    const cursor = new Date(Number(this.from.slice(0, 4)), Number(this.from.slice(5, 7)) - 1, 1);
    const last = this.to.slice(0, 7);
    while (formatIsoDate(cursor).slice(0, 7) <= last && result.length < 24) {
      const key = formatIsoDate(cursor).slice(0, 7);
      result.push({ key, label: getShortMonthLabel(cursor.getMonth(), language), amount: 0, current: key === current });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    for (const row of this.rows) {
      const month = result.find(m => m.key === row.startDate.slice(0, 7));
      if (month) month.amount += row.earned || 0;
    }
    return result;
  }

  get maxMonth(): number {
    return Math.max(1, ...this.months.map(m => m.amount));
  }

  get houses(): { title: string; amount: number }[] {
    const byHouse = new Map<string, number>();
    for (const row of this.rows) byHouse.set(row.propertyTitle, (byHouse.get(row.propertyTitle) ?? 0) + (row.earned || 0));
    return [...byHouse.entries()].map(([title, amount]) => ({ title, amount })).sort((a, b) => b.amount - a.amount);
  }

  get maxHouse(): number {
    return Math.max(1, ...this.houses.map(h => h.amount));
  }

  /** The charts are rebuilt at each check: these keep their elements, so a click is never lost. */
  trackLabel(index: number, month: { label: string }): string {
    // The same month name comes back over "last 12 months": its place keeps it apart
    return index + month.label;
  }

  trackTitle(_: number, house: { title: string }): string {
    return house.title;
  }

  trackRow(_: number, row: RentalEarning): number {
    return row.id;
  }

  /** A click on a house filters the table on it; a second click shows them all again. */
  toggleHouse(title: string): void {
    this.search = this.search === title ? '' : title;
  }

  downloadExcel(): void {
    this.downloading = true;
    this.reservationService.earningsReportXlsx(this.from || undefined, this.to || undefined, this.uiPrefs.getLanguage()).subscribe({
      next: (file) => {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = `samsara-${this.from || 'debut'}-${this.to || 'fin'}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
        this.downloading = false;
      },
      error: () => {
        this.downloading = false;
        this.snackBar.open(this.t('error_generic'), this.t('close'), { duration: 3000 });
      },
    });
  }

  /** "Save as PDF" in the print dialog: the page has a print layout without the menus. */
  print(): void {
    window.print();
  }
}
