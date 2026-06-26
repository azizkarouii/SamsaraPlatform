import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { AuthService } from '../../../services/auth.service';
import { PropertyService } from '../../../services/property.service';
import { PropertySamsarService } from '../../../services/property-samsar.service';
import { Property } from '../../../models/property.model';
import { PropertySamsar } from '../../../models/property-samsar.model';
import { Clipboard } from '@angular/cdk/clipboard';

@Component({
  selector: 'app-property-detail',
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
    MatDialogModule,
    MatProgressSpinnerModule,
    MatListModule,
  ],
  template: `
    <div class="detail-container" *ngIf="!loading; else loadingSpinner">
      <div class="header">
        <button mat-stroked-button [routerLink]="publicView ? '/shared-houses' : '/properties'">
          <mat-icon>arrow_back</mat-icon> Back to List
        </button>
        <div class="header-actions" *ngIf="!publicView">
          <button mat-raised-button color="accent" [routerLink]="['/properties', property?.id, 'edit']">
            <mat-icon>edit</mat-icon> Edit
          </button>
          <button mat-raised-button color="warn" (click)="deleteProperty()">
            <mat-icon>delete</mat-icon> Delete
          </button>
        </div>
      </div>

      <div *ngIf="property">
        <mat-card class="detail-card">
          <mat-card-header>
            <mat-card-title>{{ property.title }}</mat-card-title>
            <mat-card-subtitle>{{ property.configuration || 'No configuration specified' }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="badges">
              <mat-chip-set>
                <mat-chip *ngIf="property.hautStanding" color="primary" selected>High Standing</mat-chip>
                <mat-chip *ngIf="property.appartientResidence" color="accent" selected>Residence</mat-chip>
              </mat-chip-set>
            </div>

            <p class="description" *ngIf="property.description">{{ property.description }}</p>

            <h3>Pricing</h3>
            <mat-divider></mat-divider>
            <div class="info-grid">
              <div class="info-item" *ngIf="property.pricePerDay">
                <span class="label">Price/Day</span>
                <span class="value">{{ property.pricePerDay | currency:'TND':'symbol':'1.0-0' }}</span>
              </div>
              <div class="info-item" *ngIf="property.pricePerWeek">
                <span class="label">Price/Week</span>
                <span class="value">{{ property.pricePerWeek | currency:'TND':'symbol':'1.0-0' }}</span>
              </div>
              <div class="info-item" *ngIf="property.pricePerMonth">
                <span class="label">Price/Month</span>
                <span class="value">{{ property.pricePerMonth | currency:'TND':'symbol':'1.0-0' }}</span>
              </div>
            </div>

            <h3>Details</h3>
            <mat-divider></mat-divider>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Address</span>
                <span class="value">{{ property.address || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Max Capacity</span>
                <span class="value">{{ property.maxCapacity || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Bathrooms</span>
                <span class="value">{{ property.bathrooms || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Distance to Beach</span>
                <span class="value">{{ property.distanceBeach ? property.distanceBeach + 'm' : '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Owner Contact</span>
                <span class="value">{{ formatPhone(property.ownerContact) }}</span>
              </div>
            </div>

            <h3>Equipment</h3>
            <mat-divider></mat-divider>
            <div class="equipment-list">
              <mat-chip-set>
                <mat-chip *ngIf="property.wifi">WiFi</mat-chip>
                <mat-chip *ngIf="property.airCondition">Air Conditioning</mat-chip>
                <mat-chip *ngIf="property.pool">Pool</mat-chip>
                <mat-chip *ngIf="property.garage">Garage</mat-chip>
                <mat-chip *ngIf="property.kitchen">Kitchen</mat-chip>
                <mat-chip *ngIf="property.seaView">Sea View</mat-chip>
                <mat-chip *ngIf="property.terrace">Terrace</mat-chip>
              </mat-chip-set>
              <p *ngIf="!property.wifi && !property.airCondition && !property.pool && !property.garage && !property.kitchen && !property.seaView && !property.terrace" class="no-equipment">No equipment listed</p>
            </div>

            <div class="dates">
              <span class="date-label">Created: {{ property.createdAt | date:'medium' }}</span>
              <span class="date-label">Updated: {{ property.updatedAt | date:'medium' }}</span>
            </div>

            <div class="share-row" *ngIf="publicLink">
              <button mat-stroked-button color="primary" (click)="copyPublicLink()">
                <mat-icon>link</mat-icon>
                Copy public link
              </button>
              <a mat-button color="primary" [href]="publicLink" target="_blank" rel="noopener noreferrer">
                Open public link
              </a>
            </div>

            <div *ngIf="!publicView && samsars.length" class="samsar-section">
              <h3>Associated Samsars</h3>
              <mat-divider></mat-divider>
              <mat-list>
                <mat-list-item *ngFor="let s of samsars">
                  <mat-icon matListItemIcon>person</mat-icon>
                  <span matListItemTitle>{{ s.samsar?.name || '#' + s.samsarId }}</span>
                  <span matListItemLine>{{ s.samsar?.email || '' }}</span>
                  <div matListItemMeta class="samsar-actions">
                    <span class="pill">+{{ s.priceIncreaseTnd || 0 }} TND</span>
                    <button mat-icon-button (click)="editSamsarPrice(s)" matTooltip="Modifier la marge">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="removeSamsar(s)" matTooltip="Retirer">
                      <mat-icon>remove_circle</mat-icon>
                    </button>
                  </div>
                </mat-list-item>
              </mat-list>
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
      max-width: 900px;
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
    .badges {
      margin-bottom: 1rem;
    }
    .description {
      color: rgba(0,0,0,0.7);
      margin-bottom: 1.5rem;
      line-height: 1.6;
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
    .equipment-list {
      margin: 1rem 0;
    }
    .no-equipment {
      color: rgba(0,0,0,0.5);
      font-style: italic;
    }
    .dates {
      display: flex;
      gap: 1.5rem;
      margin-top: 1.5rem;
      font-size: 0.8rem;
      color: rgba(0,0,0,0.5);
    }
    .share-row {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    .samsar-section {
      margin-top: 1.5rem;
    }
    .pill {
      background: #e0e0e0;
      padding: 0.2rem 0.6rem;
      border-radius: 12px;
      font-size: 0.8rem;
    }
    .samsar-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
  `]
})
export class PropertyDetailComponent implements OnInit {
  property?: Property;
  loading = true;
  publicView = false;
  publicLink = '';
  samsars: PropertySamsar[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private propertyService: PropertyService,
    private propertySamsarService: PropertySamsarService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private clipboard: Clipboard
  ) {}

  ngOnInit(): void {
    this.publicView = this.route.snapshot.data['publicView'] === true;
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProperty(+id);
    }
  }

  private loadProperty(id: number): void {
    this.propertyService.findOne(id).subscribe({
      next: (property) => {
        this.property = property;
        this.publicLink = `${window.location.origin}/public/properties/${property.id}`;
        this.loading = false;
        this.loadSamsars(id);
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load property', 'Close', { duration: 3000 });
        this.router.navigate(['/properties']);
      },
    });
  }

  private loadSamsars(propertyId: number): void {
    const user = this.authService.getCurrentUser();
    if (user?.role === 'PROPRIETAIRE') {
      this.propertySamsarService.findByProperty(propertyId).subscribe({
        next: (rels) => {
          this.samsars = rels;
        },
      });
    }
  }

  editSamsarPrice(s: PropertySamsar): void {
    const current = s.priceIncreaseTnd || 10;
    const result = prompt('Nouvelle marge d\'augmentation (10, 20 ou 30 TND) :', String(current));
    if (!result) return;
    const val = parseInt(result, 10);
    if (![10, 20, 30].includes(val)) {
      this.snackBar.open('Valeur invalide (10, 20 ou 30 uniquement)', 'Fermer', { duration: 3000 });
      return;
    }
    this.propertySamsarService.updatePriceIncrease(s.propertyId, s.samsarId, val).subscribe({
      next: () => {
        this.snackBar.open('Marge mise à jour', 'Fermer', { duration: 2500 });
        this.loadSamsars(this.property!.id);
      },
      error: () => this.snackBar.open('Erreur', 'Fermer', { duration: 3000 }),
    });
  }

  removeSamsar(s: PropertySamsar): void {
    const name = s.samsar?.name || '#' + s.samsarId;
    if (!confirm(`Retirer ${name} de cette propriété ?`)) return;
    this.propertySamsarService.remove(s.propertyId, s.samsarId).subscribe({
      next: () => {
        this.snackBar.open(`${name} retiré`, 'Fermer', { duration: 2500 });
        this.samsars = this.samsars.filter(item => item !== s);
      },
      error: () => this.snackBar.open('Erreur', 'Fermer', { duration: 3000 }),
    });
  }

  deleteProperty(): void {
    if (confirm('Are you sure you want to delete this property?')) {
      this.propertyService.remove(this.property!.id).subscribe({
        next: () => {
          this.snackBar.open('Property deleted successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/properties']);
        },
        error: (err) => {
          const msg = err.error?.message || 'Failed to delete property';
          this.snackBar.open(msg, 'Close', { duration: 5000 });
        },
      });
    }
  }

  copyPublicLink(): void {
    if (!this.publicLink) {
      return;
    }
    this.clipboard.copy(this.publicLink);
    this.snackBar.open('Public link copied', 'Close', { duration: 2500 });
  }

  formatPhone(phone?: string): string {
    return phone ? `+216 ${phone}` : '-';
  }
}
