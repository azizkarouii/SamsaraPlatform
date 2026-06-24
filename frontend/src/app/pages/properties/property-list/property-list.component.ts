import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { PropertyService } from '../../../services/property.service';
import { Property } from '../../../models/property.model';
import { UiPreferencesService } from '../../../services/ui-preferences.service';
import { TRANSLATIONS, AppLanguage } from '../../../shared/translations';
import { ShareDialogComponent } from './share-dialog.component';

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [
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
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="property-list-container">
      <div class="header">
        <h1>{{ t('my_properties') }}</h1>
        <button mat-raised-button color="primary" routerLink="/properties/add">
          <mat-icon>add</mat-icon> {{ t('add_property') }}
        </button>
      </div>

      <mat-card>
        <mat-card-content>
          <div class="filter-row">
            <mat-form-field appearance="outline" class="date-field">
              <mat-label>{{ t('filter_by_date') }}</mat-label>
              <input matInput [matDatepicker]="picker" [formControl]="dateControl" [placeholder]="t('choose_date')" (dateChange)="onDateChange()" />
              <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
              <button *ngIf="dateControl.value" matSuffix mat-icon-button (click)="clearDateFilter($event)" [matTooltip]="t('clear_filter')">
                <mat-icon>close</mat-icon>
              </button>
            </mat-form-field>
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>{{ t('search_by_title') }}</mat-label>
              <input matInput [formControl]="searchControl" [placeholder]="t('search_properties')" />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
          </div>

          <div *ngIf="loading; else loadedContent" class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <ng-template #loadedContent>
            <div *ngIf="dataSource.data.length === 0" class="empty-state">
              <mat-icon class="empty-icon">home</mat-icon>
              <p>{{ t('no_properties_found') }}</p>
              <button mat-raised-button color="primary" routerLink="/properties/add">{{ t('add_first_property') }}</button>
            </div>

            <table mat-table [dataSource]="dataSource" matSort class="property-table" *ngIf="dataSource.data.length > 0">
              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ t('title_col') }}</th>
                <td mat-cell *matCellDef="let prop">{{ prop.title }}</td>
              </ng-container>

              <ng-container matColumnDef="address">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ t('address_col') }}</th>
                <td mat-cell *matCellDef="let prop">{{ prop.address || '-' }}</td>
              </ng-container>

              <ng-container matColumnDef="pricePerDay">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ t('price_day_col') }}</th>
                <td mat-cell *matCellDef="let prop">{{ (prop.pricePerDay | currency:'TND':'symbol':'1.0-0') || '-' }}</td>
              </ng-container>

              <ng-container matColumnDef="maxCapacity">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ t('capacity_col') }}</th>
                <td mat-cell *matCellDef="let prop">{{ prop.maxCapacity || '-' }}</td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>{{ t('actions_col') }}</th>
                <td mat-cell *matCellDef="let prop">
                  <button mat-icon-button color="primary" [routerLink]="['/properties', prop.id]" [matTooltip]="t('view')">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button color="accent" [routerLink]="['/properties', prop.id, 'edit']" [matTooltip]="t('edit')">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="accent" (click)="openShareDialog(prop); $event.stopPropagation()" [matTooltip]="t('share')">
                    <mat-icon>share</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="clickable-row" [routerLink]="['/properties', row.id]"></tr>
            </table>

            <mat-paginator [pageSizeOptions]="[5, 10, 25]" showFirstLastButtons *ngIf="dataSource.data.length > 0"></mat-paginator>
          </ng-template>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .property-list-container {
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
    .filter-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .date-field {
      min-width: 260px;
      flex-shrink: 0;
    }
    .search-field {
      min-width: 200px;
      flex: 1 1 auto;
    }
    .property-table {
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
export class PropertyListComponent implements OnInit {
  displayedColumns: string[] = ['title', 'address', 'pricePerDay', 'maxCapacity', 'actions'];
  dataSource = new MatTableDataSource<Property>([]);
  searchControl = new FormControl('');
  dateControl = new FormControl<Date | null>(null);
  loading = true;
  language: AppLanguage = 'fr';

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private propertyService: PropertyService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private uiPrefs: UiPreferencesService,
  ) {
    this.language = this.uiPrefs.getLanguage() as AppLanguage;
  }

  ngOnInit(): void {
    this.loadProperties();
    this.searchControl.valueChanges.subscribe(value => {
      this.dataSource.filter = (value || '').trim().toLowerCase();
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  openShareDialog(property: Property): void {
    this.dialog.open(ShareDialogComponent, {
      width: '420px',
      data: { propertyId: property.id, propertyTitle: property.title },
    });
  }

  t(key: string): string {
    return TRANSLATIONS[key]?.[this.language] ?? key;
  }

  onDateChange(): void {
    this.loadProperties();
  }

  clearDateFilter(event: MouseEvent): void {
    event.stopPropagation();
    this.dateControl.setValue(null);
    this.loadProperties();
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private loadProperties(date?: string): void {
    const dateVal = this.dateControl.value;
    const dateStr = dateVal ? this.formatDate(dateVal) : undefined;
    this.propertyService.findMine(dateStr).subscribe({
      next: (properties) => {
        this.dataSource.data = properties;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
