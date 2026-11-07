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
        <div class="filters">
          <label><span>{{ t('from') }}</span><input type="date" [(ngModel)]="from" (change)="load()" /></label>
          <label><span>{{ t('to') }}</span><input type="date" [(ngModel)]="to" (change)="load()" /></label>
          <button mat-stroked-button (click)="downloadExcel()" [disabled]="!rows.length || downloading"><mat-icon>table_view</mat-icon> Excel</button>
          <button mat-raised-button color="primary" (click)="print()" [disabled]="!rows.length"><mat-icon>picture_as_pdf</mat-icon> PDF</button>
        </div>
      </div>

      <mat-card class="report">
        <mat-card-content>
          <div class="print-title">
            <strong>Samsara — {{ t('reports') }}</strong>
            <span>{{ user?.name }} · {{ periodLabel }}</span>
          </div>
          <div *ngIf="loading" class="loading-container"><mat-spinner diameter="36"></mat-spinner></div>
          <div *ngIf="!loading && !rows.length" class="empty-state"><mat-icon>bar_chart</mat-icon><p>{{ t('no_data_period') }}</p></div>
          <div class="table-wrap" *ngIf="!loading && rows.length">
            <table>
              <thead>
                <tr>
                  <th>{{ t('property_label') }}</th><th>{{ t('client') }}</th><th>{{ t('dates') }}</th><th>{{ t('reservation_status_label') }}</th>
                  <th class="num">{{ t('total_amount_label') }}</th><th class="num">{{ t('paid') }}</th>
                  <th class="num">{{ isSamsar ? t('my_gains') : t('my_part') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of rows">
                  <td><a [routerLink]="['/reservations', r.id]">{{ r.propertyTitle }}</a></td>
                  <td>{{ r.clientName }}</td>
                  <td class="nowrap">{{ r.startDate | date:'dd/MM/yyyy' }} → {{ r.endDate | date:'dd/MM/yyyy' }}</td>
                  <td>{{ t(statusKey(r.status)) }}</td>
                  <td class="num">{{ r.total | number:'1.0-2' }}</td>
                  <td class="num">{{ r.paid | number:'1.0-2' }}</td>
                  <td class="num"><strong>{{ r.earned | number:'1.0-2' }}</strong></td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4">{{ t('total_short') }} ({{ rows.length }})</td>
                  <td class="num">{{ sum('total') | number:'1.0-2' }}</td>
                  <td class="num">{{ sum('paid') | number:'1.0-2' }}</td>
                  <td class="num"><strong>{{ sum('earned') | number:'1.0-2' }} TND</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.5rem; }
    .filters label { display: flex; flex-direction: column; font-size: 0.72rem; color: var(--text-secondary); gap: 2px; }
    .filters input { border: 1px solid var(--border-color); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 0.85rem; background: var(--bg-card); color: var(--text-primary); }
    .print-title { display: none; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; font-variant-numeric: tabular-nums; }
    th, td { padding: 0.55rem 0.5rem; border-bottom: 1px solid var(--border-color); text-align: start; }
    th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-secondary); }
    tfoot td { font-weight: 600; border-bottom: 0; }
    .num { text-align: end; }
    .nowrap { white-space: nowrap; }
    a { color: var(--primary); text-decoration: none; }
    @media print {
      .no-print { display: none !important; }
      .print-title { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; }
      .report { box-shadow: none !important; border: 0 !important; }
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
    const today = new Date();
    this.from = `${today.getFullYear()}-01-01`;
    this.to = `${today.getFullYear()}-12-31`;
    this.load();
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
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
    return this.rows.reduce((total, row) => total + (row[column] || 0), 0);
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
