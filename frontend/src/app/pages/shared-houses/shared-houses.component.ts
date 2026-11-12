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
import { OccupancyStripComponent } from '../../shared/occupancy-strip.component';
import { HouseToday, OccupancyDay, houseToday, occupancyOf, stripRange } from '../../shared/house-occupancy';
import { whatsAppNumber } from '../../shared/whatsapp';
import { ReservationService } from '../../services/reservation.service';
import { Planning, statusKey } from '../../models/reservation.model';
import { UserAvatarComponent } from '../../shared/user-avatar.component';
import { SAMSAR_DEALS, SamsarDeal, applyDeal, dealLabel, sameDeal } from '../../shared/samsar-deal';
@Component({
  selector: 'app-shared-houses',
  standalone: true,
  imports: [
    PropertyThumbComponent,
    OccupancyStripComponent,
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
        <div class="kpis">
          <div class="kpi"><span class="kpi-value">{{ samsarGroups.length }}</span><span class="kpi-label">{{ t('kpi_samsars') }}</span></div>
          <div class="kpi gold"><span class="kpi-value">{{ accessCount }}</span><span class="kpi-label">{{ t('kpi_accesses') }}</span></div>
          <div class="kpi green"><span class="kpi-value">{{ fullAccessCount }}</span><span class="kpi-label">{{ t('kpi_full_access') }}</span></div>
          <div class="kpi warn" [class.calm]="!housesWithoutSamsar"><span class="kpi-value">{{ housesWithoutSamsar }}</span><span class="kpi-label">{{ t('kpi_houses_alone') }}</span></div>
        </div>

        <div class="owner-layout">
          <section class="team">
            <div class="empty-panel" *ngIf="!samsarGroups.length">
              <div class="empty-art" aria-hidden="true"><mat-icon>group_add</mat-icon></div>
              <h2>{{ t('no_samsar_yet') }}</h2>
              <p>{{ t('invite_samsar_sub') }}</p>
            </div>

            <article class="samsar lift-card" *ngFor="let group of samsarGroups; let i = index; trackBy: trackSamsar" [style.--i]="i">
              <header class="samsar-head">
                <app-user-avatar class="avatar" [name]="group.name" [photo]="group.photo" aria-hidden="true"></app-user-avatar>
                <div class="who">
                  <strong>{{ group.name }}</strong>
                  <span>{{ group.email }}</span>
                </div>
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
              </header>

              <div class="contact">
                <a *ngIf="whatsApp(group.phone) as wa" class="chip wa" [href]="wa" target="_blank" rel="noopener"><mat-icon>chat</mat-icon> WhatsApp</a>
                <a *ngIf="group.phone" class="chip" [href]="'tel:+216' + group.phone"><mat-icon>call</mat-icon><span class="ltr">+216 {{ group.phone }}</span></a>
                <a *ngIf="group.email" class="chip" [href]="'mailto:' + group.email"><mat-icon>mail</mat-icon> Email</a>
              </div>

              <div class="deal-row">
                <span class="deal-label">{{ t('samsar_rate') }}</span>
                <button type="button" class="deal" [matMenuTriggerFor]="allMarginMenu" [matTooltip]="t('margin_all_houses')">
                  {{ group.commonDeal ? dealOption(group.commonDeal) : t('mixed_margins') }} <mat-icon>expand_more</mat-icon>
                </button>
                <mat-menu #allMarginMenu="matMenu">
                  <button mat-menu-item *ngFor="let deal of deals" (click)="updateMarginForAll(group, deal)">
                    <mat-icon>{{ group.commonDeal && sameDeal(group.commonDeal, deal) ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>{{ dealOption(deal) }}
                  </button>
                </mat-menu>
                <span class="pill" [class.primary]="group.allHouses">
                  <mat-icon inline aria-hidden="true">{{ group.allHouses ? 'done_all' : 'home' }}</mat-icon>
                  {{ group.allHouses ? t('all_houses') : t('houses_count').replace('{{n}}', '' + group.relations.length) }}
                </span>
              </div>

              <div class="houses">
                <div class="stack">
                  <a *ngFor="let rel of group.relations | slice:0:5" class="stack-item" [routerLink]="['/properties', rel.propertyId]"
                     [matTooltip]="rel.property?.title || ''">
                    <app-property-thumb class="mini" [path]="rel.property?.coverImage"></app-property-thumb>
                  </a>
                  <span class="stack-more" *ngIf="group.relations.length > 5">+{{ group.relations.length - 5 }}</span>
                </div>
                <button mat-button class="details-btn" (click)="toggleDetails(group.samsarId)" [attr.aria-expanded]="expanded.has(group.samsarId)">
                  {{ expanded.has(group.samsarId) ? t('hide_details') : t('show_details') }}
                  <mat-icon iconPositionEnd>{{ expanded.has(group.samsarId) ? 'expand_less' : 'expand_more' }}</mat-icon>
                </button>
              </div>

              <div class="details" *ngIf="expanded.has(group.samsarId)">
                <div class="house-row" *ngFor="let rel of group.relations">
                  <app-property-thumb class="mini" [path]="rel.property?.coverImage"></app-property-thumb>
                  <a class="house-title link" [routerLink]="['/properties', rel.propertyId]">{{ rel.property?.title || '#' + rel.propertyId }}</a>
                  <button mat-stroked-button class="margin-btn" [matMenuTriggerFor]="marginMenu" [matTooltip]="t('edit_margin')">{{ dealLabel(rel) }}</button>
                  <mat-menu #marginMenu="matMenu">
                    <button mat-menu-item *ngFor="let deal of deals" (click)="updateMargin(rel, deal)">
                      <mat-icon>{{ sameDeal(rel, deal) ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>{{ dealOption(deal) }}
                    </button>
                  </mat-menu>
                  <button mat-icon-button color="warn" (click)="remove(rel)"
                          [matTooltip]="t('remove_from_this_property')" [attr.aria-label]="t('remove_from_this_property')">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </div>
            </article>
          </section>

          <!-- The invitation stays in view beside the team -->
          <aside class="invite">
            <div class="invite-head">
              <span class="invite-icon" aria-hidden="true"><mat-icon>mark_email_unread</mat-icon></span>
              <div>
                <h2>{{ t('invite_samsar') }}</h2>
                <p>{{ t('invite_samsar_sub') }}</p>
              </div>
            </div>
            <div *ngIf="!ownedProperties.length" class="empty-panel small">
              <p>{{ t('add_property_first') }}</p>
              <a mat-raised-button color="primary" routerLink="/properties/add">{{ t('add_property') }}</a>
            </div>
            <form *ngIf="ownedProperties.length" class="invite-form" [formGroup]="inviteForm" (ngSubmit)="submitInvite()">
              <mat-form-field appearance="outline">
                <mat-label>{{ t('property_label') }}</mat-label>
                <mat-select formControlName="propertyId">
                  <mat-option [value]="ALL"><strong>{{ t('all_my_houses') }}</strong> ({{ ownedProperties.length }})</mat-option>
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
              <p class="field-title">{{ t('allowed_increase') }}</p>
              <div class="deal-choices" role="radiogroup">
                <button type="button" role="radio" *ngFor="let deal of deals" class="deal-choice"
                        [class.active]="inviteForm.value.deal === deal" [attr.aria-checked]="inviteForm.value.deal === deal"
                        (click)="inviteForm.patchValue({ deal: deal })">
                  <b>{{ dealLabel(deal) }}</b>
                  <span>{{ deal.commissionPercent ? t('of_total') : '/ ' + t('day') }}</span>
                </button>
              </div>
              <button mat-raised-button color="primary" type="submit" class="send" [disabled]="inviteForm.invalid || submitting">
                <mat-icon>send</mat-icon> {{ t('send_invite') }}
              </button>
            </form>
          </aside>
        </div>
      </ng-container>

      <!-- ===== Samsar ===== -->
      <ng-container *ngIf="!isOwner && !loading">
        <div class="kpis" *ngIf="relations.length">
          <div class="kpi"><span class="kpi-value">{{ relations.length }}</span><span class="kpi-label">{{ t('kpi_houses') }}</span></div>
          <div class="kpi green"><span class="kpi-value">{{ freeToday }}</span><span class="kpi-label">{{ t('kpi_free_today') }}</span></div>
          <div class="kpi gold"><span class="kpi-value">{{ relations.length - freeToday }}</span><span class="kpi-label">{{ t('kpi_occupied_today') }}</span></div>
        </div>

        <div class="grid" *ngIf="relations.length; else emptySamsar">
          <article class="house-card lift-card" *ngFor="let relation of relations; let i = index" [style.--i]="i" (click)="openHouse(relation)">
            <div class="cover">
              <app-property-thumb class="photo" [path]="relation.property?.coverImage"></app-property-thumb>
              <span class="shade" aria-hidden="true"></span>
              <span class="badge" *ngIf="today(relation) as now" [class.occupied]="now.occupied">
                <i class="pulse"></i>
                <ng-container *ngIf="now.occupied">{{ t('house_occupied') }} → {{ short(now.until) }}</ng-container>
                <ng-container *ngIf="!now.occupied">{{ t('house_free') }}<ng-container *ngIf="now.nextArrival"> · {{ t('next_arrival_on') }} {{ short(now.nextArrival) }}</ng-container></ng-container>
              </span>
              <span class="config" *ngIf="relation.property?.configuration">{{ relation.property?.configuration }}</span>
              <span class="price" *ngIf="relation.property?.pricePerDay">
                <b>{{ (relation.property?.pricePerDay || 0) + (relation.priceIncreaseTnd || 0) | number:'1.0-0' }}</b> TND <small>/ {{ t('day') }}</small>
              </span>
            </div>
            <div class="body">
              <h3>{{ relation.property?.title || '#' + relation.propertyId }}</h3>
              <p class="address"><mat-icon inline>place</mat-icon>{{ relation.property?.address || '—' }}</p>
              <div class="deal-row">
                <span class="pill">{{ t('base_price') }} {{ relation.property?.pricePerDay | number:'1.0-0' }} TND</span>
                <span class="pill primary">{{ t('your_margin') }} {{ dealLabel(relation) }}</span>
              </div>
              <ng-container *ngIf="days(relation) as strip">
                <span class="strip-title">{{ t('next_14_days') }}</span>
                <app-occupancy-strip [days]="strip" [labels]="stripLabels"></app-occupancy-strip>
              </ng-container>
              <div class="contact" *ngIf="relation.property?.ownerContact" (click)="$event.stopPropagation()">
                <a *ngIf="whatsApp(relation.property?.ownerContact) as wa" class="chip wa" [href]="wa" target="_blank" rel="noopener"><mat-icon>chat</mat-icon> {{ t('owner_contact') }}</a>
                <a class="chip" [href]="'tel:+216' + relation.property?.ownerContact"><mat-icon>call</mat-icon><span class="ltr">+216 {{ relation.property?.ownerContact }}</span></a>
              </div>
              <div class="foot" (click)="$event.stopPropagation()">
                <a mat-raised-button color="primary" [routerLink]="['/reservations/add']" [queryParams]="{ propertyId: relation.propertyId }"><mat-icon>event_available</mat-icon> {{ t('book') }}</a>
                <a mat-button [routerLink]="['/properties', relation.propertyId]">{{ t('view') }}</a>
                <span class="spacer"></span>
                <button mat-icon-button (click)="leave(relation)" [matTooltip]="t('leave_property')"><mat-icon>logout</mat-icon></button>
              </div>
            </div>
          </article>
        </div>
        <ng-template #emptySamsar>
          <div class="empty-panel">
            <div class="empty-art" aria-hidden="true"><mat-icon>home_work</mat-icon></div>
            <h2>{{ t('no_shared_properties') }}</h2>
            <p>{{ t('no_shared_desc_samsar') }}</p>
          </div>
        </ng-template>
      </ng-container>
    </div>
  `,
  styles: [`

    .owner-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 1.25rem; align-items: start; }
    .team { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; align-content: start; }
    @media (max-width: 1100px) { .owner-layout { grid-template-columns: 1fr; } .invite { position: static !important; order: -1; } }

    .samsar { padding: 1rem 1.1rem 0.6rem; display: flex; flex-direction: column; gap: 0.75rem; }

    .samsar-head { display: flex; align-items: center; gap: 0.75rem; }
    .avatar { --avatar-size: 52px; --avatar-bg: var(--primary-soft); --avatar-fg: var(--primary); border-radius: 50%; box-shadow: 0 0 0 3px var(--bg-card), 0 0 0 5px var(--accent-gold-soft); }
    .who { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .who strong { font-family: var(--display-font); font-size: 1.45rem; line-height: 1.1; }
    .who span { font-size: 0.8rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .contact { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .chip { display: inline-flex; align-items: center; gap: 0.3rem; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border-color); font-size: 0.78rem; font-weight: 600; color: var(--text-primary); text-decoration: none; background: var(--bg-card); }
    .chip mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .chip:hover { border-color: var(--primary); color: var(--primary); }
    .chip.wa { color: #128c7e; border-color: #25d366; }
    .chip.wa:hover { background: rgba(37, 211, 102, 0.08); }

    .deal-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .deal-label { font-size: 0.75rem; color: var(--text-secondary); }
    .deal { display: inline-flex; align-items: center; gap: 0.1rem; border: 0; cursor: pointer; font: inherit; font-weight: 700; font-size: 0.85rem; padding: 3px 4px 3px 10px; border-radius: 8px; background: var(--accent-gold-soft); color: var(--text-primary); }
    .deal mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .houses { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color); }
    .stack { display: flex; align-items: center; padding-inline-start: 6px; }
    .stack-item { margin-inline-start: -6px; border-radius: 50%; box-shadow: 0 0 0 2px var(--bg-card); transition: transform 0.15s ease; }
    .stack-item:hover { transform: translateY(-2px); z-index: 1; }
    .mini { --thumb-w: 34px; --thumb-ratio: 1 / 1; --thumb-radius: 50%; }
    .mini ::ng-deep mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .stack-more { margin-inline-start: 6px; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); }
    .details-btn { font-size: 0.8rem; }
    .details { display: flex; flex-direction: column; }
    .house-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem 0; border-top: 1px dashed var(--border-color); }
    .house-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; font-size: 0.88rem; }
    .link { color: inherit; text-decoration: none; }
    .link:hover { color: var(--primary); }
    .margin-btn { min-width: 0; padding: 0 0.7rem; font-size: 0.8rem; }
    .danger { color: var(--status-cancelled); }

    .invite { position: sticky; top: 1rem; display: flex; flex-direction: column; gap: 0.9rem; padding: 1.2rem; background: var(--bg-card); border: 1px solid var(--border-color); border-top: 4px solid var(--accent-gold); border-radius: 18px; box-shadow: var(--shadow-md); }
    .invite-head { display: flex; gap: 0.75rem; }
    .invite-head h2 { margin: 0; font-family: var(--display-font); font-size: 1.5rem; line-height: 1.1; }
    .invite-head p { margin: 0.2rem 0 0; font-size: 0.8rem; color: var(--text-secondary); }
    .invite-icon { width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px; display: grid; place-items: center; background: var(--accent-gold-soft); color: var(--accent-gold); }
    .invite-form { display: flex; flex-direction: column; }
    .field-title { margin: 0 0 0.4rem; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
    .deal-choices { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.4rem; margin-bottom: 1rem; }
    .deal-choice { display: flex; flex-direction: column; align-items: center; padding: 0.5rem; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font: inherit; }
    .deal-choice b { font-family: var(--display-font); font-size: 1.3rem; line-height: 1; }
    .deal-choice span { font-size: 0.7rem; color: var(--text-secondary); }
    .deal-choice:hover { border-color: var(--primary); }
    .deal-choice.active { border-color: var(--primary-strong); background: var(--primary-soft); box-shadow: inset 0 0 0 1px var(--primary-strong); }
    .send { align-self: stretch; }

    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.1rem; }
    .strip-title { font-size: 0.72rem; color: var(--text-secondary); }

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
  /** The next 14 days of the samsar's houses. */
  planning?: Planning;
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
    private reservationService: ReservationService,
  ) {}

  openHouse(relation: PropertySamsar): void {
    this.router.navigate(['/properties', relation.propertyId]);
  }

  get isOwner(): boolean {
    return this.user?.role === 'PROPRIETAIRE';
  }

  get accessCount(): number {
    return this.samsarGroups.reduce((sum, group) => sum + group.relations.length, 0);
  }

  get fullAccessCount(): number {
    return this.samsarGroups.filter(group => group.allHouses).length;
  }

  /** Owned houses no samsar works on yet. */
  get housesWithoutSamsar(): number {
    const shared = new Set(this.samsarGroups.flatMap(group => group.relations.map(rel => rel.propertyId)));
    return this.ownedProperties.filter(p => !shared.has(p.id)).length;
  }

  get freeToday(): number {
    return this.relations.filter(rel => !this.today(rel)?.occupied).length;
  }

  get stripLabels(): Record<string, string> {
    return {
      free: this.t('planning_free'), blocked: this.t('planning_blocked'),
      pending: this.t(statusKey('pending')), confirmed: this.t(statusKey('confirmed')),
      'in-progress': this.t(statusKey('in-progress')), completed: this.t(statusKey('completed')),
    };
  }

  /** Chat on WhatsApp, when the number can be used for it. */
  whatsApp(phone?: string | null): string | null {
    const number = whatsAppNumber(phone);
    return number ? `https://wa.me/${number}` : null;
  }

  today(relation: PropertySamsar): HouseToday | null {
    return this.planning ? houseToday(this.planning, relation.propertyId) : null;
  }

  days(relation: PropertySamsar): OccupancyDay[] | null {
    return this.planning ? occupancyOf(this.planning, relation.propertyId) : null;
  }

  short(iso?: string): string {
    return iso ? iso.slice(8) + '/' + iso.slice(5, 7) : '';
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
    const { from, to } = stripRange();
    this.reservationService.planning(from, to).subscribe(planning => this.planning = planning);
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
