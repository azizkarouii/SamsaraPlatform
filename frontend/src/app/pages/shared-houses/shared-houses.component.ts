import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../services/auth.service';
import { PropertySamsarService } from '../../services/property-samsar.service';
import { PropertySamsar } from '../../models/property-samsar.model';
import { PropertyService } from '../../services/property.service';
import { Property } from '../../models/property.model';
import { User } from '../../models/auth.model';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { TRANSLATIONS, AppLanguage } from '../../shared/translations';

interface GroupedSamsars {
  propertyTitle: string;
  propertyId: number;
  samsars: PropertySamsar[];
}

@Component({
  selector: 'app-shared-houses',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="shared-container">
      <div class="page-head">
        <div>
          <p class="eyebrow">{{ t('shared_management') }}</p>
          <h1>{{ user?.role === 'PROPRIETAIRE' ? t('manage_shared_access') : t('my_shared_houses') }}</h1>
        </div>
      </div>

      <!-- Invite card: only for PROPRIETAIRE -->
      <mat-card class="invite-card" *ngIf="user?.role === 'PROPRIETAIRE'">
        <mat-card-header>
          <mat-card-title>{{ t('invite_samsar') }}</mat-card-title>
          <mat-card-subtitle>{{ t('invite_samsar_sub') }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form class="invite-form" [formGroup]="inviteForm" (ngSubmit)="submitInvite()">
            <mat-form-field appearance="outline">
              <mat-label>{{ t('my_houses') }}</mat-label>
              <mat-select formControlName="propertyId">
                <mat-option *ngFor="let property of ownedProperties" [value]="property.id">
                  {{ property.title }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('samsar_email') }}</mat-label>
              <input matInput type="email" formControlName="email" placeholder="samsar@example.com" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('samsar_phone') }}</mat-label>
              <span matTextPrefix>+216&nbsp;</span>
              <input matInput formControlName="phone" placeholder="12345678" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>{{ t('allowed_increase') }}</mat-label>
              <mat-select formControlName="priceIncreaseTnd">
                <mat-option [value]="10">10 TND</mat-option>
                <mat-option [value]="20">20 TND</mat-option>
                <mat-option [value]="30">30 TND</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="invite-actions">
              <button mat-raised-button color="primary" type="submit" [disabled]="inviteForm.invalid || submitting">
                <mat-icon>person_add</mat-icon>
                {{ t('send_invite') }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Owner view: invited samsars grouped by property -->
      <div *ngIf="user?.role === 'PROPRIETAIRE' && groupedSamsars.length">
        <h2 class="section-title">{{ t('invited_samsars') }}</h2>
        <mat-card class="group-card" *ngFor="let group of groupedSamsars">
          <mat-card-header>
            <mat-card-title>{{ group.propertyTitle }}</mat-card-title>
            <mat-card-subtitle>{{ group.samsars.length }} samsar(s)</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="samsar-row" *ngFor="let rel of group.samsars">
              <div class="samsar-info">
                <mat-icon>person</mat-icon>
                <span>{{ rel.samsar?.name || '#' + rel.samsarId }}</span>
                <span class="samsar-contact">{{ rel.samsar?.email || '' }}</span>
              </div>
              <div class="samsar-meta">
                <button mat-icon-button (click)="editPriceIncrease(rel)" matTooltip="Modifier la marge">
                  <mat-icon>edit</mat-icon>
                </button>
                <span class="pill">+{{ rel.priceIncreaseTnd || 0 }} TND</span>
                <button mat-icon-button color="primary" (click)="remove(rel)" matTooltip="{{ t('delete') }}">
                  <mat-icon>remove_circle</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="removeFromAll(rel)" matTooltip="Retirer de toutes les propriétés">
                  <mat-icon>delete_forever</mat-icon>
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Samsar view -->
      <div *ngIf="user?.role === 'SAMSAR' && loading" class="loading-state">
        <mat-spinner diameter="42"></mat-spinner>
      </div>

      <div *ngIf="user?.role === 'SAMSAR'">
        <div class="grid" *ngIf="relations.length; else emptyStateSamsar">
          <mat-card class="house-card" *ngFor="let relation of relations">
            <mat-card-header>
              <mat-card-title>{{ relation.property?.title || t('unsaved') }}</mat-card-title>
              <mat-card-subtitle>{{ relation.property?.address || '-' }}</mat-card-subtitle>
            </mat-card-header>

            <mat-card-content>
              <div class="meta-row">
                <span class="pill">Price increase: {{ relation.priceIncreaseTnd || 0 }} TND</span>
                <span class="pill">Ref: #{{ relation.propertyId }}</span>
              </div>

              <div class="details" *ngIf="relation.property">
                <p>Daily price: {{ relation.property.pricePerDay | currency:'TND':'symbol':'1.0-0' }}</p>
                <p>Phone: +216 {{ relation.property.ownerContact || '-' }}</p>
              </div>
            </mat-card-content>

            <mat-card-actions>
              <button mat-stroked-button color="primary" [routerLink]="['/public/properties', relation.propertyId]">
                <mat-icon>open_in_new</mat-icon>
                {{ t('view') }}
              </button>
              <button mat-stroked-button color="warn" (click)="remove(relation)">
                <mat-icon>close</mat-icon>
                {{ t('delete') }}
              </button>
            </mat-card-actions>
          </mat-card>
        </div>
      </div>

      <ng-template #emptyStateSamsar>
        <mat-card class="empty-card">
          <mat-card-content>
            <mat-icon>home_work</mat-icon>
            <h2>{{ t('no_shared_properties') }}</h2>
            <p>{{ t('no_shared_desc_samsar') }}</p>
          </mat-card-content>
        </mat-card>
      </ng-template>
    </div>
  `,
  styles: [`
    .shared-container {
      display: grid;
      gap: 1rem;
      padding: 1.5rem;
    }
    .page-head h1 {
      margin: 0;
    }
    .eyebrow {
      margin: 0 0 0.25rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.75rem;
      opacity: 0.7;
    }
    .section-title {
      margin: 0.5rem 0 0;
      font-size: 1.1rem;
      font-weight: 500;
    }
    .invite-card {
      border-radius: 20px;
    }
    .invite-form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .invite-actions {
      grid-column: 1 / -1;
      display: flex;
      justify-content: flex-end;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
    .house-card, .group-card {
      border-radius: 20px;
    }
    .meta-row {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .pill {
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      background: rgba(0,0,0,0.06);
      font-size: 0.85rem;
    }
    .details p {
      margin: 0.35rem 0;
    }
    .loading-state {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }
    .empty-card {
      border-radius: 20px;
    }
    .samsar-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.08));
    }
    .samsar-row:last-child {
      border-bottom: none;
    }
    .samsar-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .samsar-info mat-icon {
      font-size: 1.2rem;
      width: 1.2rem;
      height: 1.2rem;
      opacity: 0.6;
    }
    .samsar-contact {
      font-size: 0.8rem;
      opacity: 0.6;
      margin-left: 0.3rem;
    }
    .samsar-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  `]
})
export class SharedHousesComponent implements OnInit {
  relations: PropertySamsar[] = [];
  invitedSamsars: PropertySamsar[] = [];
  groupedSamsars: GroupedSamsars[] = [];
  ownedProperties: Property[] = [];
  loading = true;
  submitting = false;
  user: User | null = null;
  language: AppLanguage = 'fr';
  inviteForm = this.fb.group({
    propertyId: [null as number | null, Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    priceIncreaseTnd: [10, Validators.required],
  });

  constructor(
    private authService: AuthService,
    private propertySamsarService: PropertySamsarService,
    private propertyService: PropertyService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private uiPrefs: UiPreferencesService,
  ) {
    this.language = this.uiPrefs.getLanguage() as AppLanguage;
  }

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (this.user?.role === 'PROPRIETAIRE') {
      this.loadOwnedProperties();
      this.loadInvitedSamsars();
    }
    this.loadMine();
  }

  private loadOwnedProperties(): void {
    this.propertyService.findMine().subscribe({
      next: (properties) => {
        this.ownedProperties = properties;
        if (!this.inviteForm.value.propertyId && properties.length) {
          this.inviteForm.patchValue({ propertyId: properties[0].id });
        }
      },
    });
  }

  private loadInvitedSamsars(): void {
    this.propertySamsarService.findByOwner().subscribe({
      next: (relations) => {
        this.invitedSamsars = relations;
        this.groupedSamsars = this.groupByProperty(relations);
      },
    });
  }

  private groupByProperty(relations: PropertySamsar[]): GroupedSamsars[] {
    const map = new Map<number, GroupedSamsars>();
    for (const rel of relations) {
      const pid = rel.propertyId;
      if (!map.has(pid)) {
        map.set(pid, {
          propertyId: pid,
          propertyTitle: rel.property?.title || '#' + pid,
          samsars: [],
        });
      }
      map.get(pid)!.samsars.push(rel);
    }
    return Array.from(map.values());
  }

  private loadMine(): void {
    this.loading = true;
    this.propertySamsarService.findMine().subscribe({
      next: (relations) => {
        this.relations = relations;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open(this.t('no_shared_properties'), this.t('close'), { duration: 3000 });
      },
    });
  }

  t(key: string): string {
    return TRANSLATIONS[key]?.[this.language] ?? key;
  }

  remove(relation: PropertySamsar): void {
    this.propertySamsarService.remove(relation.propertyId, relation.samsarId).subscribe({
      next: () => {
        this.snackBar.open('Accès retiré', this.t('close'), { duration: 2500 });
        this.relations = this.relations.filter(item => item !== relation);
        this.invitedSamsars = this.invitedSamsars.filter(item => item !== relation);
        this.groupedSamsars = this.groupByProperty(this.invitedSamsars);
      },
      error: () => this.snackBar.open('Erreur', this.t('close'), { duration: 3000 }),
    });
  }

  removeFromAll(relation: PropertySamsar): void {
    const name = relation.samsar?.name || '#' + relation.samsarId;
    if (!confirm(`Retirer ${name} de toutes vos propriétés ?`)) return;
    this.propertySamsarService.removeSamsarFromAll(relation.samsarId).subscribe({
      next: () => {
        this.snackBar.open(`${name} retiré de toutes les propriétés`, this.t('close'), { duration: 2500 });
        this.loadInvitedSamsars();
        this.loadMine();
      },
      error: () => this.snackBar.open('Erreur', this.t('close'), { duration: 3000 }),
    });
  }

  editPriceIncrease(relation: PropertySamsar): void {
    const current = relation.priceIncreaseTnd || 10;
    const result = prompt('Nouvelle marge d\'augmentation (10, 20 ou 30 TND) :', String(current));
    if (!result) return;
    const val = parseInt(result, 10);
    if (![10, 20, 30].includes(val)) {
      this.snackBar.open('Valeur invalide (10, 20 ou 30 uniquement)', this.t('close'), { duration: 3000 });
      return;
    }
    this.propertySamsarService.updatePriceIncrease(relation.propertyId, relation.samsarId, val).subscribe({
      next: () => {
        this.snackBar.open('Marge mise à jour', this.t('close'), { duration: 2500 });
        this.loadInvitedSamsars();
      },
      error: () => this.snackBar.open('Erreur', this.t('close'), { duration: 3000 }),
    });
  }

  submitInvite(): void {
    if (this.inviteForm.invalid) {
      return;
    }

    const value = this.inviteForm.getRawValue();
    this.submitting = true;
    this.propertySamsarService.invite({
      propertyId: value.propertyId!,
      email: value.email!,
      phone: value.phone!,
      priceIncreaseTnd: value.priceIncreaseTnd || 10,
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.snackBar.open(this.t('invite_success'), this.t('close'), { duration: 3000 });
        this.loadMine();
        this.loadInvitedSamsars();
      },
      error: (error) => {
        this.submitting = false;
        const message = error.error?.message || 'Erreur';
        this.snackBar.open(message, this.t('close'), { duration: 4000 });
      },
    });
  }
}
