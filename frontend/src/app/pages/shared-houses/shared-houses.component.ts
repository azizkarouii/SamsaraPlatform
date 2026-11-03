import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../services/auth.service';
import { PropertySamsarService } from '../../services/property-samsar.service';
import { PropertyService } from '../../services/property.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { PropertySamsar } from '../../models/property-samsar.model';
import { Property } from '../../models/property.model';
import { User } from '../../models/auth.model';
import { t } from '../../shared/translations';
import { forkJoin, map } from 'rxjs';

interface SamsarGroup {
  samsarId: number;
  name: string;
  email: string;
  phone: string;
  photo?: string;
  relations: PropertySamsar[];
  /** True when the samsar has access to every house of the owner. */
  allHouses: boolean;
  /** Deal shared by all his houses, or null when they differ. */
  commonDeal: SamsarDeal | null;
}

import { PropertyThumbComponent } from '../../shared/property-thumb.component';
import { UserAvatarComponent } from '../../shared/user-avatar.component';
import { SAMSAR_DEALS, SamsarDeal, applyDeal, dealLabel, sameDeal } from '../../shared/samsar-deal';
@Component({
  selector: 'app-shared-houses',
  standalone: true,
  imports: [
    PropertyThumbComponent,
    UserAvatarComponent,
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <p class="eyebrow">{{ t('shared_management') }}</p>
          <h1>{{ isOwner ? t('manage_shared_access') : t('my_shared_houses') }}</h1>
          <p class="subtitle">{{ isOwner ? t('shared_owner_subtitle') : t('shared_samsar_subtitle') }}</p>
        </div>
      </div>

      <div *ngIf="loading" class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>

      <!-- ===== Owner ===== -->
      <ng-container *ngIf="isOwner && !loading">
        <mat-card>
          <mat-card-header>
            <mat-card-title>{{ t('invite_samsar') }}</mat-card-title>
            <mat-card-subtitle>{{ t('invite_samsar_sub') }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="!ownedProperties.length" class="empty-state">
              <mat-icon>add_home</mat-icon>
              <p>{{ t('add_property_first') }}</p>
              <a mat-raised-button color="primary" routerLink="/properties/add">{{ t('add_property') }}</a>
            </div>
            <form *ngIf="ownedProperties.length" class="invite-form" [formGroup]="inviteForm" (ngSubmit)="submitInvite()">
              <mat-form-field appearance="outline">
                <mat-label>{{ t('property_label') }}</mat-label>
                <mat-select formControlName="propertyId">
                  <mat-option [value]="ALL">
                    <strong>{{ t('all_my_houses') }}</strong> ({{ ownedProperties.length }})
                  </mat-option>
                  <mat-option *ngFor="let property of ownedProperties" [value]="property.id">{{ property.title }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ t('samsar_email') }}</mat-label>
                <input matInput type="email" formControlName="email" placeholder="samsar@example.com" />
                <mat-error>{{ t('email_invalid') }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ t('samsar_phone') }}</mat-label>
                <span matTextPrefix>+216&nbsp;</span>
                <input matInput formControlName="phone" placeholder="12345678" inputmode="tel" />
                <mat-error>{{ t('phone_invalid') }}</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>{{ t('allowed_increase') }}</mat-label>
                <mat-select formControlName="deal">
                  <mat-option *ngFor="let deal of deals" [value]="deal">{{ dealOption(deal) }}</mat-option>
                </mat-select>
              </mat-form-field>
              <div class="invite-actions">
                <button mat-raised-button color="primary" type="submit" [disabled]="inviteForm.invalid || submitting">
                  <mat-icon>person_add</mat-icon> {{ t('send_invite') }}
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <h2 class="section-title">{{ t('invited_samsars') }}</h2>
        <mat-card *ngIf="!samsarGroups.length">
          <mat-card-content>
            <div class="empty-state"><mat-icon>group_off</mat-icon><p>{{ t('no_samsar_yet') }}</p></div>
          </mat-card-content>
        </mat-card>

        <mat-card *ngFor="let group of samsarGroups; trackBy: trackSamsar" class="samsar-card">
          <div class="samsar-head">
            <app-user-avatar class="avatar" [name]="group.name" [photo]="group.photo" aria-hidden="true"></app-user-avatar>
            <div class="samsar-info">
              <strong>{{ group.name }}</strong>
              <span>{{ group.email }}<ng-container *ngIf="group.phone"> · <span class="ltr">+216 {{ group.phone }}</span></ng-container></span>
            </div>
            <span class="pill" [class.primary]="group.allHouses">
              <mat-icon inline aria-hidden="true">{{ group.allHouses ? 'done_all' : 'home' }}</mat-icon>
              {{ group.allHouses ? t('all_houses') : t('houses_count').replace('{{n}}', '' + group.relations.length) }}
            </span>
            <button mat-icon-button [matMenuTriggerFor]="samsarMenu" [attr.aria-label]="t('remove_access') + ' — ' + group.name">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #samsarMenu="matMenu">
              <button mat-menu-item *ngIf="!group.allHouses" (click)="addToAllHouses(group)">
                <mat-icon>done_all</mat-icon>{{ t('add_to_all_houses') }}
              </button>
              <button mat-menu-item class="danger" (click)="removeFromAll(group)">
                <mat-icon>person_remove</mat-icon>{{ t('remove_from_all_properties') }}
              </button>
            </mat-menu>
          </div>

          <!-- Access to every house: one summary line with a shared margin, detail on demand -->
          <div class="house-row summary" *ngIf="group.allHouses">
            <mat-icon class="house-icon" aria-hidden="true">holiday_village</mat-icon>
            <span class="house-title">{{ t('all_houses') }} ({{ group.relations.length }})</span>
            <button mat-stroked-button class="margin-btn" [matMenuTriggerFor]="allMarginMenu" [matTooltip]="t('margin_all_houses')">
              {{ group.commonDeal ? dealLabel(group.commonDeal) : t('mixed_margins') }}
            </button>
            <mat-menu #allMarginMenu="matMenu">
              <button mat-menu-item *ngFor="let deal of deals" (click)="updateMarginForAll(group, deal)">
                <mat-icon>{{ group.commonDeal && sameDeal(group.commonDeal, deal) ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>{{ dealLabel(deal) }}
              </button>
            </mat-menu>
            <button mat-button class="details-btn" (click)="toggleDetails(group.samsarId)" [attr.aria-expanded]="expanded.has(group.samsarId)">
              {{ expanded.has(group.samsarId) ? t('hide_details') : t('show_details') }}
              <mat-icon iconPositionEnd>{{ expanded.has(group.samsarId) ? 'expand_less' : 'expand_more' }}</mat-icon>
            </button>
          </div>

          <ng-container *ngIf="!group.allHouses || expanded.has(group.samsarId)">
            <div class="house-row" *ngFor="let rel of group.relations">
              <mat-icon class="house-icon" aria-hidden="true">home</mat-icon>
              <a class="house-title link" [routerLink]="['/properties', rel.propertyId]">{{ rel.property?.title || '#' + rel.propertyId }}</a>
              <button mat-stroked-button class="margin-btn" [matMenuTriggerFor]="marginMenu" [matTooltip]="t('edit_margin')">{{ dealLabel(rel) }}</button>
              <mat-menu #marginMenu="matMenu">
                <button mat-menu-item *ngFor="let deal of deals" (click)="updateMargin(rel, deal)">
                  <mat-icon>{{ sameDeal(rel, deal) ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>{{ dealLabel(deal) }}
                </button>
              </mat-menu>
              <button mat-icon-button color="warn" (click)="remove(rel)"
                      [matTooltip]="t('remove_from_this_property')" [attr.aria-label]="t('remove_from_this_property')">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </ng-container>
        </mat-card>
      </ng-container>

      <!-- ===== Samsar ===== -->
      <ng-container *ngIf="!isOwner && !loading">
        <div class="grid" *ngIf="relations.length; else emptySamsar">
          <!-- The whole card opens the house; the "View" button stays as the keyboard entry point -->
          <mat-card class="house-card" *ngFor="let relation of relations" (click)="openHouse(relation)">
            <app-property-thumb class="card-cover" [path]="relation.property?.coverImage"></app-property-thumb>
            <mat-card-header>
              <mat-card-title>{{ relation.property?.title || '#' + relation.propertyId }}</mat-card-title>
              <mat-card-subtitle>{{ relation.property?.address || relation.property?.configuration || '-' }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="price" *ngIf="relation.property?.pricePerDay">
                <strong>{{ (relation.property?.pricePerDay || 0) + (relation.priceIncreaseTnd || 0) | number:'1.0-0' }} TND</strong>
                <span>/ {{ t('day') }}</span>
              </div>
              <div class="meta">
                <span class="pill">{{ t('base_price') }} {{ relation.property?.pricePerDay | number:'1.0-0' }} TND</span>
                <span class="pill primary">{{ t('your_margin') }} {{ dealLabel(relation) }}</span>
              </div>
              <p class="contact" *ngIf="relation.property?.ownerContact">
                <mat-icon inline>call</mat-icon> {{ t('owner_contact') }} : <a class="ltr" [href]="'tel:+216' + relation.property?.ownerContact" (click)="$event.stopPropagation()">+216 {{ relation.property?.ownerContact }}</a>
              </p>
            </mat-card-content>
            <mat-card-actions (click)="$event.stopPropagation()">
              <a mat-button color="primary" [routerLink]="['/properties', relation.propertyId]"><mat-icon>visibility</mat-icon> {{ t('view') }}</a>
              <a mat-button color="primary" [routerLink]="['/reservations/add']" [queryParams]="{ propertyId: relation.propertyId }"><mat-icon>add</mat-icon> {{ t('book') }}</a>
              <span class="spacer"></span>
              <button mat-icon-button (click)="leave(relation)" [matTooltip]="t('leave_property')"><mat-icon>logout</mat-icon></button>
            </mat-card-actions>
          </mat-card>
        </div>
        <ng-template #emptySamsar>
          <mat-card>
            <mat-card-content>
              <div class="empty-state">
                <mat-icon>home_work</mat-icon>
                <h2>{{ t('no_shared_properties') }}</h2>
                <p>{{ t('no_shared_desc_samsar') }}</p>
              </div>
            </mat-card-content>
          </mat-card>
        </ng-template>
      </ng-container>
    </div>
  `,
  styles: [`
    .section-title { margin: 0.5rem 0 0; font-size: 1.1rem; font-weight: 600; }
    .invite-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0 1rem; margin-top: 1rem; }
    .invite-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; }
    .link { color: inherit; text-decoration: none; }
    .link:hover { color: var(--primary); }
    .samsar-card { padding: 0.5rem 1rem; }
    .samsar-head { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0 0.75rem; }
    .house-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.4rem 0 0.4rem 0.5rem; border-top: 1px solid var(--border-color); }
    .house-row.summary { background: var(--primary-soft); border-radius: 10px; border-top: 0; margin-bottom: 0.25rem; }
    .house-icon { color: var(--text-secondary); flex-shrink: 0; }
    .house-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
    .details-btn { font-size: 0.8rem; }
    .danger { color: var(--status-cancelled); }
    .avatar { --avatar-size: 36px; --avatar-bg: var(--primary-soft); --avatar-fg: var(--primary); }
    .samsar-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .samsar-info span { font-size: 0.8rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .margin-btn { min-width: 0; padding: 0 0.7rem; font-size: 0.8rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .house-card { display: flex; flex-direction: column; cursor: pointer; transition: border-color var(--duration-fast) ease, box-shadow var(--duration-fast) ease; }
    .house-card:hover { border-color: var(--primary); box-shadow: var(--shadow-md) !important; }
    .house-card { overflow: hidden; }
    .house-card mat-card-content { flex: 1; }
    .card-cover { --thumb-w: 100%; --thumb-ratio: 16 / 9; --thumb-radius: 0; }
    .card-cover ::ng-deep mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: 0.5; }
    .price { margin: 0.5rem 0; }
    .price strong { font-size: 1.6rem; }
    .price span { color: var(--text-secondary); }
    .meta { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .contact { font-size: 0.85rem; margin: 0.75rem 0 0; }
    .contact a { color: var(--primary); text-decoration: none; }
    .spacer { flex: 1; }
  `]
})
export class SharedHousesComponent implements OnInit {
  readonly ALL = 'all' as const;
  relations: PropertySamsar[] = [];
  samsarGroups: SamsarGroup[] = [];
  ownedProperties: Property[] = [];
  /** Samsars whose per-house detail is unfolded (only relevant when they have every house). */
  expanded = new Set<number>();
  loading = true;
  submitting = false;
  user: User | null = null;
  readonly deals = SAMSAR_DEALS;
  readonly dealLabel = dealLabel;
  readonly sameDeal = sameDeal;

  inviteForm = this.fb.group({
    propertyId: ['all' as number | 'all', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[\d\s+]{8,15}$/)]],
    deal: [SAMSAR_DEALS[0], Validators.required],
  });

  constructor(
    private authService: AuthService,
    private propertySamsarService: PropertySamsarService,
    private propertyService: PropertyService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private uiPrefs: UiPreferencesService,
    private router: Router,
  ) {}

  openHouse(relation: PropertySamsar): void {
    this.router.navigate(['/properties', relation.propertyId]);
  }

  get isOwner(): boolean {
    return this.user?.role === 'PROPRIETAIRE';
  }

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (this.isOwner) {
      this.loadOwnerData();
    } else {
      this.loadMine();
    }
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  trackSamsar(_: number, group: SamsarGroup): number {
    return group.samsarId;
  }

  /** Houses and invitations are loaded together: "all houses" is only known once both are there. */
  private loadOwnerData(): void {
    forkJoin({
      properties: this.propertyService.findMine(),
      relations: this.propertySamsarService.findByOwner(),
    }).subscribe({
      next: ({ properties, relations }) => {
        this.ownedProperties = properties;
        this.samsarGroups = this.groupBySamsar(relations);
        this.loading = false;
      },
      error: () => this.loading = false,
    });
  }

  private reloadInvitedSamsars(): void {
    this.propertySamsarService.findByOwner().subscribe({
      next: (relations) => this.samsarGroups = this.groupBySamsar(relations),
    });
  }

  private groupBySamsar(relations: PropertySamsar[]): SamsarGroup[] {
    const map = new Map<number, SamsarGroup>();
    for (const rel of relations) {
      if (!map.has(rel.samsarId)) {
        map.set(rel.samsarId, {
          samsarId: rel.samsarId,
          name: rel.samsar?.name || '#' + rel.samsarId,
          email: rel.samsar?.email || '',
          phone: rel.samsar?.phone || '',
          photo: rel.samsar?.photoUrl,
          relations: [],
          allHouses: false,
          commonDeal: null,
        });
      }
      map.get(rel.samsarId)!.relations.push(rel);
    }
    const groups = Array.from(map.values());
    groups.forEach(group => this.refreshGroup(group));
    return groups.sort((a, b) => a.name.localeCompare(b.name));
  }

  private refreshGroup(group: SamsarGroup): void {
    group.relations.sort((a, b) => (a.property?.title || '').localeCompare(b.property?.title || ''));
    const ownedIds = new Set(this.ownedProperties.map(p => p.id));
    group.allHouses = ownedIds.size > 0 && [...ownedIds].every(id => group.relations.some(rel => rel.propertyId === id));
    const first = group.relations[0];
    group.commonDeal = first && group.relations.every(rel => sameDeal(rel, first))
      ? { priceIncreaseTnd: first.commissionPercent ? null : first.priceIncreaseTnd, commissionPercent: first.commissionPercent ?? null }
      : null;
  }

  toggleDetails(samsarId: number): void {
    if (this.expanded.has(samsarId)) {
      this.expanded.delete(samsarId);
    } else {
      this.expanded.add(samsarId);
    }
  }

  private loadMine(): void {
    this.loading = true;
    this.propertySamsarService.findMine().subscribe({
      next: (relations) => {
        this.relations = relations;
        this.loading = false;
      },
      error: () => this.loading = false,
    });
  }

  private showError(err: any): void {
    this.snackBar.open(err?.error?.message || this.t('error_generic'), this.t('close'), { duration: 4000 });
  }

  remove(relation: PropertySamsar): void {
    const name = relation.samsar?.name || '#' + relation.samsarId;
    if (!confirm(this.t('remove_confirm').replace('{{name}}', name))) return;
    this.propertySamsarService.remove(relation.propertyId, relation.samsarId).subscribe({
      next: () => {
        this.snackBar.open(this.t('access_removed'), this.t('close'), { duration: 2500 });
        this.reloadInvitedSamsars();
      },
      error: (err) => this.showError(err),
    });
  }

  leave(relation: PropertySamsar): void {
    if (!confirm(this.t('leave_confirm'))) return;
    this.propertySamsarService.remove(relation.propertyId, relation.samsarId).subscribe({
      next: () => {
        this.relations = this.relations.filter(item => item !== relation);
        this.snackBar.open(this.t('access_removed'), this.t('close'), { duration: 2500 });
      },
      error: (err) => this.showError(err),
    });
  }

  removeFromAll(group: SamsarGroup): void {
    if (!confirm(this.t('remove_from_all_confirm').replace('{{name}}', group.name))) return;
    this.propertySamsarService.removeSamsarFromAll(group.samsarId).subscribe({
      next: () => {
        this.snackBar.open(this.t('remove_from_all_success').replace('{{name}}', group.name), this.t('close'), { duration: 2500 });
        this.reloadInvitedSamsars();
      },
      error: (err) => this.showError(err),
    });
  }

  /** Extends an existing samsar to the houses he does not have yet, keeping his current margin when uniform. */
  addToAllHouses(group: SamsarGroup): void {
    this.propertySamsarService.inviteToAllProperties({
      email: group.email,
      phone: group.phone,
      ...(group.commonDeal ?? SAMSAR_DEALS[0]),
    }).subscribe({
      next: (added) => {
        this.snackBar.open(this.t('invite_all_success').replace('{{n}}', '' + added.length), this.t('close'), { duration: 3000 });
        this.reloadInvitedSamsars();
      },
      error: (err) => this.showError(err),
    });
  }

  dealOption(deal: SamsarDeal): string {
    return deal.commissionPercent ? `${dealLabel(deal)} ${this.t('of_total')}` : `${dealLabel(deal)} / ${this.t('day')}`;
  }

  updateMargin(relation: PropertySamsar, deal: SamsarDeal): void {
    if (sameDeal(relation, deal)) return;
    this.propertySamsarService.updateDeal(relation.propertyId, relation.samsarId, deal).subscribe({
      next: () => {
        applyDeal(relation, deal);
        const group = this.samsarGroups.find(g => g.samsarId === relation.samsarId);
        if (group) this.refreshGroup(group);
        this.snackBar.open(this.t('update_margin'), this.t('close'), { duration: 2500 });
      },
      error: (err) => this.showError(err),
    });
  }

  updateMarginForAll(group: SamsarGroup, deal: SamsarDeal): void {
    const toUpdate = group.relations.filter(rel => !sameDeal(rel, deal));
    if (!toUpdate.length) return;
    forkJoin(toUpdate.map(rel => this.propertySamsarService.updateDeal(rel.propertyId, rel.samsarId, deal))).subscribe({
      next: () => {
        toUpdate.forEach(rel => applyDeal(rel, deal));
        this.refreshGroup(group);
        this.snackBar.open(this.t('update_margin'), this.t('close'), { duration: 2500 });
      },
      error: (err) => {
        this.showError(err);
        this.reloadInvitedSamsars();
      },
    });
  }

  submitInvite(): void {
    if (this.inviteForm.invalid) return;
    const value = this.inviteForm.getRawValue();
    const dto = {
      email: value.email!.trim(),
      phone: value.phone!.trim(),
      ...value.deal!,
    };
    const request = value.propertyId === this.ALL
      ? this.propertySamsarService.inviteToAllProperties(dto)
      : this.propertySamsarService.invite({ ...dto, propertyId: value.propertyId as number }).pipe(map(rel => [rel]));

    this.submitting = true;
    request.subscribe({
      next: (added) => {
        this.submitting = false;
        const message = value.propertyId === this.ALL
          ? this.t('invite_all_success').replace('{{n}}', '' + added.length)
          : this.t('invite_success');
        this.snackBar.open(message, this.t('close'), { duration: 3000 });
        this.inviteForm.patchValue({ email: '', phone: '' });
        this.inviteForm.get('email')?.markAsUntouched();
        this.inviteForm.get('phone')?.markAsUntouched();
        this.reloadInvitedSamsars();
      },
      error: (err) => {
        this.submitting = false;
        this.showError(err);
      },
    });
  }
}
