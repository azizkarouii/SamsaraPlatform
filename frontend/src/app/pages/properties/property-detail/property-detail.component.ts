import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Clipboard } from '@angular/cdk/clipboard';
import { AuthService } from '../../../services/auth.service';
import { PropertyService } from '../../../services/property.service';
import { PropertySamsarService } from '../../../services/property-samsar.service';
import { AvailabilityService, ManualAvailabilityStatus } from '../../../services/availability.service';
import { UiPreferencesService } from '../../../services/ui-preferences.service';
import { Property } from '../../../models/property.model';
import { PropertySamsar } from '../../../models/property-samsar.model';
import { User } from '../../../models/auth.model';
import {
  CalendarDay,
  CalendarMonth,
  DayStatus,
  buildCalendarMonths,
  createDayStatusMap,
  getWeekdayLabels,
  isRangeFree,
  rangeHasPending,
  todayIso,
} from '../../../shared/calendar-utils';
import { t } from '../../../shared/translations';
import { ShareDialogComponent } from '../property-list/share-dialog.component';

@Component({
  selector: 'app-property-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  template: `
    <div [class.public-shell]="publicView">

      <div *ngIf="loading" class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>

      <div class="page" *ngIf="!loading && property as p">
        <div class="page-header">
          <div>
            <p class="eyebrow">{{ p.configuration || t('property_label') }}</p>
            <h1>{{ p.title }}</h1>
            <p class="subtitle" *ngIf="p.address"><mat-icon inline>place</mat-icon> {{ p.address }}</p>
          </div>
          <div class="header-actions">
            <button mat-stroked-button *ngIf="!publicView || user" (click)="goBack()">
              <mat-icon>arrow_back</mat-icon> {{ t('back') }}
            </button>
            <ng-container *ngIf="!publicView && isOwner">
              <button mat-stroked-button (click)="openShareDialog()"><mat-icon>person_add</mat-icon> {{ t('share') }}</button>
              <a mat-stroked-button [routerLink]="['/properties', p.id, 'edit']"><mat-icon>edit</mat-icon> {{ t('edit') }}</a>
              <button mat-stroked-button color="warn" (click)="deleteProperty()"><mat-icon>delete</mat-icon> {{ t('delete') }}</button>
            </ng-container>
            <button mat-icon-button *ngIf="!publicView" (click)="copyPublicLink()" [matTooltip]="t('copy_public_link')">
              <mat-icon>link</mat-icon>
            </button>
          </div>
        </div>

        <div class="layout">
          <div class="main-col">
            <mat-card>
              <mat-card-content>
                <div class="tags" *ngIf="p.hautStanding || p.appartientResidence">
                  <span class="pill primary" *ngIf="p.hautStanding"><mat-icon inline>star</mat-icon> {{ t('high_standing') }}</span>
                  <span class="pill" *ngIf="p.appartientResidence"><mat-icon inline>apartment</mat-icon> {{ t('residence') }}</span>
                </div>
                <p class="description" *ngIf="p.description">{{ p.description }}</p>

                <div class="facts">
                  <div class="fact"><mat-icon>groups</mat-icon><span>{{ p.maxCapacity || '-' }}</span><small>{{ t('capacity_col') }}</small></div>
                  <div class="fact"><mat-icon>bathtub</mat-icon><span>{{ p.bathrooms || '-' }}</span><small>{{ t('bathrooms') }}</small></div>
                  <div class="fact"><mat-icon>beach_access</mat-icon><span>{{ p.distanceBeach ? p.distanceBeach + ' m' : '-' }}</span><small>{{ t('distance_beach') }}</small></div>
                  <div class="fact" *ngIf="!publicView && p.ownerContact">
                    <mat-icon>call</mat-icon>
                    <a class="ltr" [href]="'tel:+216' + p.ownerContact">+216 {{ p.ownerContact }}</a>
                    <small>{{ t('owner_contact') }}</small>
                  </div>
                </div>

                <h3>{{ t('equipment') }}</h3>
                <div class="equipment" *ngIf="equipment.length; else noEquipment">
                  <span class="pill" *ngFor="let item of equipment"><mat-icon inline>{{ item.icon }}</mat-icon> {{ t(item.key) }}</span>
                </div>
                <ng-template #noEquipment><p class="muted">{{ t('no_equipment') }}</p></ng-template>
              </mat-card-content>
            </mat-card>

            <mat-card>
              <mat-card-content>
                <div class="cal-toolbar">
                  <h3 class="no-margin">{{ t('availability_section') }}</h3>
                  <div class="cal-nav">
                    <button mat-icon-button (click)="shiftMonths(-1)" [disabled]="!canGoBack" [attr.aria-label]="t('previous')"><mat-icon class="flip-rtl">chevron_left</mat-icon></button>
                    <button mat-stroked-button (click)="resetMonths()">{{ t('today') }}</button>
                    <button mat-icon-button (click)="shiftMonths(1)" [attr.aria-label]="t('next')"><mat-icon class="flip-rtl">chevron_right</mat-icon></button>
                  </div>
                </div>
                <div class="cal-legend">
                  <span><i class="dot free"></i>{{ t('free') }}</span>
                  <span><i class="dot pending"></i>{{ t('pending') }}</span>
                  <span><i class="dot reserved"></i>{{ t('reserved') }}</span>
                  <span><i class="dot blocked"></i>{{ t('unavailable') }}</span>
                </div>

                <div class="cal-months">
                  <div class="cal-month" *ngFor="let month of months">
                    <h4>{{ month.monthLabel }} {{ month.year }}</h4>
                    <div class="cal-weekdays"><span *ngFor="let label of weekdayLabels">{{ label }}</span></div>
                    <div class="cal-days">
                      <button type="button" class="cal-day" *ngFor="let day of month.days"
                              [class.empty]="!day.dayNumber"
                              [class.past]="day.isPast"
                              [class.today]="day.date === today"
                              [class.pending]="day.status === 'pending'"
                              [class.reserved]="day.status === 'reserved'"
                              [class.blocked]="day.status === 'blocked'"
                              [class.selected]="day.date && (day.date === startDate || day.date === endDate)"
                              [class.in-range]="isInRange(day.date)"
                              [disabled]="!day.dayNumber || day.isPast || publicView"
                              (click)="selectDay(day)">
                        {{ day.dayNumber }}
                      </button>
                    </div>
                  </div>
                </div>

                <div class="cal-selection" *ngIf="!publicView && startDate">
                  <div>
                    <strong>{{ startDate | date:'dd/MM/yyyy' }}</strong>
                    <span *ngIf="endDate"> → <strong>{{ endDate | date:'dd/MM/yyyy' }}</strong></span>
                    <span class="muted" *ngIf="!endDate"> — {{ t('choose_end_date') }}</span>
                  </div>
                  <div class="actions">
                    <button mat-flat-button color="primary" *ngIf="canBook" [disabled]="!endDate || !rangeFree" (click)="bookSelection()">
                      <mat-icon>event_available</mat-icon> {{ t('book_these_dates') }}
                    </button>
                    <ng-container *ngIf="isOwner && endDate">
                      <button mat-stroked-button [matMenuTriggerFor]="blockMenu"><mat-icon>edit_calendar</mat-icon> {{ t('set_availability') }}</button>
                      <mat-menu #blockMenu="matMenu">
                        <button mat-menu-item (click)="setAvailability('unavailable')"><mat-icon>block</mat-icon>{{ t('mark_unavailable') }}</button>
                        <button mat-menu-item (click)="setAvailability('pending')"><mat-icon>hourglass_top</mat-icon>{{ t('mark_pending') }}</button>
                        <button mat-menu-item (click)="setAvailability('available')"><mat-icon>check_circle</mat-icon>{{ t('mark_available') }}</button>
                      </mat-menu>
                    </ng-container>
                    <button mat-button (click)="clearSelection()">{{ t('cancel') }}</button>
                  </div>
                  <div class="selection-warning" *ngIf="endDate && !rangeFree"><mat-icon inline>warning</mat-icon> {{ t('dates_unavailable') }}</div>
                  <div class="selection-warning pending" *ngIf="endDate && rangeFree && rangeOverridesPending"><mat-icon inline>hourglass_top</mat-icon> {{ t('dates_have_pending') }}</div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>

          <div class="side-col">
            <mat-card>
              <mat-card-content>
                <h3 class="no-margin">{{ t('pricing') }}</h3>
                <div class="price-main" *ngIf="p.pricePerDay; else noPrice">
                  <strong>{{ p.pricePerDay + myMargin | number:'1.0-0' }}</strong> TND <span class="muted">/ {{ t('day') }}</span>
                </div>
                <ng-template #noPrice><p class="muted">{{ t('price_on_request') }}</p></ng-template>
                <p class="margin-note" *ngIf="myMargin">{{ t('your_price_note').replace('{{base}}', '' + p.pricePerDay).replace('{{margin}}', '' + myMargin) }}</p>
                <div class="price-lines">
                  <div *ngIf="p.pricePerWeek"><span>{{ t('price_per_week') }}</span><strong>{{ p.pricePerWeek | number:'1.0-0' }} TND</strong></div>
                  <div *ngIf="p.pricePerMonth"><span>{{ t('price_per_month') }}</span><strong>{{ p.pricePerMonth | number:'1.0-0' }} TND</strong></div>
                </div>
                <a *ngIf="canBook" mat-raised-button color="primary" class="full" [routerLink]="['/reservations/add']" [queryParams]="{ propertyId: p.id }">
                  <mat-icon>add</mat-icon> {{ t('reservation_new_title') }}
                </a>
              </mat-card-content>
            </mat-card>

            <mat-card *ngIf="!publicView && isOwner">
              <mat-card-content>
                <div class="side-head">
                  <h3 class="no-margin">{{ t('associated_samsars') }}</h3>
                  <button mat-icon-button (click)="openShareDialog()" [matTooltip]="t('invite_samsar')"><mat-icon>person_add</mat-icon></button>
                </div>
                <p class="muted" *ngIf="!samsars.length">{{ t('no_samsar_yet') }}</p>
                <div class="samsar" *ngFor="let s of samsars">
                  <div class="samsar-avatar">{{ (s.samsar?.name || '?')[0] | uppercase }}</div>
                  <div class="samsar-body">
                    <strong>{{ s.samsar?.name || '#' + s.samsarId }}</strong>
                    <span>{{ s.samsar?.email }}</span>
                  </div>
                  <button mat-stroked-button class="margin-btn" [matMenuTriggerFor]="marginMenu" [matTooltip]="t('edit_margin')">+{{ s.priceIncreaseTnd || 0 }} TND</button>
                  <mat-menu #marginMenu="matMenu">
                    <button mat-menu-item *ngFor="let m of margins" (click)="updateMargin(s, m)">
                      <mat-icon>{{ s.priceIncreaseTnd === m ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>+{{ m }} TND
                    </button>
                  </mat-menu>
                  <button mat-icon-button color="warn" (click)="removeSamsar(s)" [matTooltip]="t('remove_access')"><mat-icon>person_remove</mat-icon></button>
                </div>
              </mat-card-content>
            </mat-card>

            <p class="muted small">{{ t('created_label') }} {{ p.createdAt | date:'dd/MM/yyyy' }} · {{ t('updated_label') }} {{ p.updatedAt | date:'dd/MM/yyyy' }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .public-shell { max-width: 1100px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 1.25rem; align-items: start; }
    .main-col, .side-col { display: grid; gap: 1.25rem; min-width: 0; }
    h3 { margin: 1.25rem 0 0.6rem; font-size: 0.95rem; font-weight: 600; }
    h3.no-margin { margin: 0; }
    .muted { color: var(--text-secondary); }
    .small { font-size: 0.75rem; text-align: center; }
    .tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; }
    .description { line-height: 1.6; white-space: pre-line; margin: 0 0 1rem; }
    .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.75rem; }
    .fact { display: flex; flex-direction: column; align-items: flex-start; gap: 0.1rem; padding: 0.75rem; border-radius: 12px; background: var(--surface-subtle); }
    .fact mat-icon { color: var(--primary); }
    .fact span, .fact a { font-weight: 700; color: inherit; text-decoration: none; }
    .fact small { color: var(--text-secondary); font-size: 0.72rem; }
    .equipment { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .cal-legend { margin-top: 0.5rem; }
    .selection-warning { width: 100%; color: var(--status-cancelled); font-size: 0.85rem; }
    .selection-warning.pending { color: var(--status-pending); }
    .price-main { margin: 0.75rem 0 0.25rem; font-size: 1rem; }
    .price-main strong { font-size: 2rem; }
    .margin-note { font-size: 0.78rem; color: var(--text-secondary); margin: 0 0 0.5rem; }
    .price-lines { display: grid; gap: 0.35rem; margin: 0.75rem 0 1rem; }
    .price-lines div { display: flex; justify-content: space-between; font-size: 0.9rem; }
    .full { width: 100%; }
    .side-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .samsar { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0; border-top: 1px solid var(--border-color); }
    .samsar-avatar {
      width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
      background: var(--primary-soft); color: var(--primary); font-weight: 700;
    }
    .samsar-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .samsar-body span { font-size: 0.75rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .margin-btn { min-width: 0; padding: 0 0.6rem; font-size: 0.78rem; }
    :host-context(html[dir='rtl']) .flip-rtl { transform: scaleX(-1); }
    @media (max-width: 960px) { .layout { grid-template-columns: 1fr; } }
  `]
})
export class PropertyDetailComponent implements OnInit {
  property?: Property;
  user: User | null = null;
  loading = true;
  publicView = false;
  isOwner = false;
  isSharedSamsar = false;
  myMargin = 0;
  samsars: PropertySamsar[] = [];
  months: CalendarMonth[] = [];
  startDate = '';
  endDate = '';
  readonly today = todayIso();
  readonly margins = [10, 20, 30];
  private monthOffset = 0;
  private dayStatuses: Record<string, DayStatus> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private authService: AuthService,
    private propertyService: PropertyService,
    private propertySamsarService: PropertySamsarService,
    private availabilityService: AvailabilityService,
    private uiPrefs: UiPreferencesService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private clipboard: Clipboard,
  ) {}

  ngOnInit(): void {
    this.publicView = this.route.snapshot.data['publicView'] === true;
    this.user = this.authService.getCurrentUser();
    this.rebuildMonths();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProperty(+id);
    }
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  get weekdayLabels(): string[] {
    return getWeekdayLabels(this.uiPrefs.getLanguage());
  }

  get canBook(): boolean {
    return !this.publicView && (this.isOwner || this.isSharedSamsar);
  }

  get canGoBack(): boolean {
    return this.monthOffset > 0;
  }

  get rangeOverridesPending(): boolean {
    return !!this.startDate && !!this.endDate && rangeHasPending(this.startDate, this.endDate, this.dayStatuses);
  }

  get rangeFree(): boolean {
    return !!this.startDate && !!this.endDate && isRangeFree(this.startDate, this.endDate, this.dayStatuses);
  }

  get equipment(): { key: string; icon: string }[] {
    const p = this.property;
    if (!p) return [];
    return [
      { on: p.wifi, key: 'wifi', icon: 'wifi' },
      { on: p.airCondition, key: 'air_condition', icon: 'ac_unit' },
      { on: p.pool, key: 'pool', icon: 'pool' },
      { on: p.garage, key: 'garage', icon: 'garage' },
      { on: p.kitchen, key: 'kitchen', icon: 'kitchen' },
      { on: p.seaView, key: 'sea_view', icon: 'water' },
      { on: p.terrace, key: 'terrace', icon: 'deck' },
    ].filter(item => item.on);
  }

  private loadProperty(id: number): void {
    this.propertyService.findOne(id).subscribe({
      next: (property) => {
        this.property = property;
        this.isOwner = !!this.user && property.createdBy === this.user.id;
        this.loading = false;
        this.loadOccupancy();
        if (!this.publicView && this.isOwner) {
          this.loadSamsars();
        } else if (!this.publicView && this.user?.role === 'SAMSAR') {
          this.propertySamsarService.findMine().subscribe(rels => {
            const relation = rels.find(r => r.propertyId === id);
            this.isSharedSamsar = !!relation;
            this.myMargin = relation?.priceIncreaseTnd || 0;
          });
        }
      },
      error: () => {
        this.loading = false;
        this.snackBar.open(this.t('property_load_error'), this.t('close'), { duration: 3000 });
        this.router.navigate([this.user ? '/dashboard' : '/login']);
      },
    });
  }

  private loadOccupancy(): void {
    this.availabilityService.getOccupancy(this.property!.id).subscribe({
      next: (occupancy) => {
        this.dayStatuses = createDayStatusMap(occupancy.reservations, occupancy.blockedDates);
        this.rebuildMonths();
      },
    });
  }

  private loadSamsars(): void {
    this.propertySamsarService.findByProperty(this.property!.id).subscribe({
      next: (rels) => this.samsars = rels,
    });
  }

  private rebuildMonths(): void {
    const now = new Date();
    this.months = buildCalendarMonths(now.getFullYear(), now.getMonth() + this.monthOffset, 3, this.dayStatuses, this.uiPrefs.getLanguage());
  }

  shiftMonths(delta: number): void {
    this.monthOffset = Math.max(0, this.monthOffset + delta * 3);
    this.rebuildMonths();
  }

  resetMonths(): void {
    this.monthOffset = 0;
    this.rebuildMonths();
  }

  selectDay(day: CalendarDay): void {
    if (!day.dayNumber || day.isPast || this.publicView) return;
    if (!this.startDate || this.endDate) {
      this.startDate = day.date;
      this.endDate = '';
    } else if (day.date < this.startDate) {
      this.endDate = this.startDate;
      this.startDate = day.date;
    } else {
      this.endDate = day.date;
    }
  }

  clearSelection(): void {
    this.startDate = '';
    this.endDate = '';
  }

  isInRange(date: string): boolean {
    return !!date && !!this.startDate && !!this.endDate && date > this.startDate && date < this.endDate;
  }

  bookSelection(): void {
    this.router.navigate(['/reservations/add'], {
      queryParams: { propertyId: this.property!.id, start: this.startDate, end: this.endDate },
    });
  }

  setAvailability(status: ManualAvailabilityStatus): void {
    this.availabilityService.setRange(this.property!.id, this.startDate, this.endDate, status).subscribe({
      next: () => {
        this.snackBar.open(this.t('availability_updated'), this.t('close'), { duration: 2500 });
        this.clearSelection();
        this.loadOccupancy();
      },
      error: (err) => this.snackBar.open(err.error?.message || this.t('error_generic'), this.t('close'), { duration: 4000 }),
    });
  }

  openShareDialog(): void {
    this.dialog.open(ShareDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: { propertyId: this.property!.id, propertyTitle: this.property!.title },
    }).afterClosed().subscribe(invited => {
      if (invited) this.loadSamsars();
    });
  }

  updateMargin(s: PropertySamsar, margin: number): void {
    if (s.priceIncreaseTnd === margin) return;
    this.propertySamsarService.updatePriceIncrease(s.propertyId, s.samsarId, margin).subscribe({
      next: () => {
        s.priceIncreaseTnd = margin;
        this.snackBar.open(this.t('update_margin'), this.t('close'), { duration: 2500 });
      },
      error: (err) => this.snackBar.open(err.error?.message || this.t('error_generic'), this.t('close'), { duration: 3000 }),
    });
  }

  removeSamsar(s: PropertySamsar): void {
    const name = s.samsar?.name || '#' + s.samsarId;
    if (!confirm(this.t('remove_confirm').replace('{{name}}', name))) return;
    this.propertySamsarService.remove(s.propertyId, s.samsarId).subscribe({
      next: () => {
        this.samsars = this.samsars.filter(item => item !== s);
        this.snackBar.open(this.t('access_removed'), this.t('close'), { duration: 2500 });
      },
      error: (err) => this.snackBar.open(err.error?.message || this.t('error_generic'), this.t('close'), { duration: 3000 }),
    });
  }

  deleteProperty(): void {
    if (!confirm(this.t('property_delete_confirm'))) return;
    this.propertyService.remove(this.property!.id).subscribe({
      next: () => {
        this.snackBar.open(this.t('property_deleted'), this.t('close'), { duration: 3000 });
        this.router.navigate(['/properties']);
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || this.t('property_delete_error'), this.t('close'), { duration: 5000 });
      },
    });
  }

  copyPublicLink(): void {
    this.clipboard.copy(`${window.location.origin}/public/properties/${this.property!.id}`);
    this.snackBar.open(this.t('public_link_copied'), this.t('close'), { duration: 2500 });
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate([this.user?.role === 'SAMSAR' ? '/shared-houses' : '/properties']);
    }
  }
}
