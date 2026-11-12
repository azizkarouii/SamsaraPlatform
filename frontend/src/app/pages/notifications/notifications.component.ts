import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '../../services/notification.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { Notification } from '../../models/notification.model';
import { t } from '../../shared/translations';
import { getMonthLabel, todayIso } from '../../shared/calendar-utils';


const PAGE_SIZE = 20;

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page narrow">
      <div class="page-header">
        <div>
          <h1>{{ t('notifications') }}</h1>
          <p class="subtitle">{{ unreadCount }} {{ t('unread') }}</p>
        </div>
        <div class="header-actions">
          <div class="segmented" role="group">
            <button type="button" [class.active]="filter === 'all'" (click)="setFilter('all')">{{ t('all') }}</button>
            <button type="button" [class.active]="filter === 'unread'" (click)="setFilter('unread')">{{ t('unread') }}<span class="count">{{ unreadCount }}</span></button>
          </div>
          <button mat-stroked-button (click)="markAllAsRead()" [disabled]="!unreadCount">
            <mat-icon>done_all</mat-icon> {{ t('mark_all_read') }}
          </button>
        </div>
      </div>

      <div class="kinds" role="group" [attr.aria-label]="t('notif_kind')">
        <button type="button" *ngFor="let k of kinds" class="kind" [class.active]="kind === k.id" (click)="kind = k.id">
          <mat-icon>{{ k.icon }}</mat-icon>{{ t(k.label) }}<span class="count">{{ countOf(k.id) }}</span>
        </button>
      </div>

      <mat-card>
        <mat-card-content>
          <div *ngIf="loading && !notifications.length" class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>

          <div *ngIf="!loading && !groups.length" class="empty-panel">
            <div class="empty-art" aria-hidden="true"><mat-icon>notifications_none</mat-icon></div>
            <h2>{{ t(filter === 'unread' ? 'notif_all_read' : 'no_notifications') }}</h2>
            <p *ngIf="filter === 'unread'">{{ t('notif_all_read_hint') }}</p>
          </div>

          <div class="list" *ngIf="groups.length">
            <ng-container *ngFor="let group of groups; trackBy: trackGroup">
            <h2 class="day">{{ group.label }}</h2>
            <div class="item" *ngFor="let notif of group.items; trackBy: trackNotification" [class.unread]="!notif.isRead" (click)="open(notif)">
              <div class="icon" [ngClass]="tone(notif.type)"><mat-icon>{{ icon(notif.type) }}</mat-icon></div>
              <div class="body">
                <div class="title">
                  {{ titleOf(notif) }}
                  <span class="dot" *ngIf="!notif.isRead"></span>
                </div>
                <div class="message">{{ messageOf(notif) }}</div>
                <div class="time" [title]="notif.createdAt | date:'dd/MM/yyyy HH:mm'">{{ ago(notif.createdAt) }}</div>
              </div>
              <div class="item-actions">
                <button mat-icon-button *ngIf="!notif.isRead" (click)="$event.stopPropagation(); markRead(notif)" [matTooltip]="t('mark_read')" [attr.aria-label]="t('mark_read')">
                  <mat-icon>done</mat-icon>
                </button>
                <button mat-icon-button (click)="$event.stopPropagation(); deleteNotification(notif)" [matTooltip]="t('delete')" [attr.aria-label]="t('delete')">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>
            </ng-container>
          </div>
          <div class="more" *ngIf="notifications.length < total">
            <button mat-stroked-button (click)="loadMore()" [disabled]="loading">{{ t('load_more') }}</button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .narrow { max-width: 900px; }
    .kinds { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .kind { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.8rem; border-radius: 999px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); font: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
    .kind mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-secondary); }
    .kind .count { font-size: 0.7rem; padding: 0 0.4rem; border-radius: 999px; background: var(--surface-subtle); color: var(--text-secondary); }
    .kind:hover { border-color: var(--primary); }
    .kind.active { background: var(--primary-strong); border-color: var(--primary-strong); color: #fff; }
    .kind.active mat-icon, .kind.active .count { color: inherit; background: rgba(255,255,255,0.18); }
    .item { position: relative; }
    .item.unread::before { content: ''; position: absolute; inset-block: 10px; inset-inline-start: 0; width: 3px; border-radius: 2px; background: var(--primary); }
    .item-actions { display: flex; flex-shrink: 0; opacity: 0.55; transition: opacity 0.15s ease; }
    .item:hover .item-actions, .item:focus-within .item-actions { opacity: 1; }
    @media (hover: none) { .item-actions { opacity: 1; } }
    .more { display: flex; justify-content: center; margin-top: 1rem; }
    .list { display: grid; }
    .day { margin: 1.1rem 0 0.35rem; font-family: var(--display-font); font-size: 1.35rem; font-weight: 700; }
    .day:first-child { margin-top: 0; }
    .day::first-letter { text-transform: uppercase; }
    .item {
      display: flex; align-items: flex-start; gap: 0.9rem; padding: 0.9rem 0.5rem; cursor: pointer;
      border-bottom: 1px solid var(--border-color); border-radius: 8px;
    }
    .item:last-child { border-bottom: none; }
    .item:hover { background: var(--surface-hover); }
    .item.unread { background: var(--primary-soft); }
    .icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .icon.info { background: var(--primary-soft); color: var(--primary); }
    .icon.success { background: var(--status-in-progress-bg); color: var(--status-in-progress); }
    .icon.danger { background: var(--status-cancelled-bg); color: var(--status-cancelled); }
    .icon.neutral { background: var(--status-completed-bg); color: var(--status-completed); }
    .body { flex: 1; min-width: 0; }
    .title { font-weight: 700; display: flex; align-items: center; gap: 0.4rem; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--primary); }
    .message { font-size: 0.9rem; margin-top: 0.15rem; line-height: 1.4; }
    .time { font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem; }
  `]
})
export class NotificationsComponent implements OnInit {
  notifications: Notification[] = [];

  /** Kinds of notification, to see only one of them. */
  readonly kinds: { id: 'all' | 'bookings' | 'reminders' | 'sharing'; label: string; icon: string }[] = [
    { id: 'all', label: 'notif_kind_all', icon: 'inbox' },
    { id: 'bookings', label: 'notif_kind_bookings', icon: 'event' },
    { id: 'reminders', label: 'notif_kind_reminders', icon: 'alarm' },
    { id: 'sharing', label: 'notif_kind_sharing', icon: 'home_work' },
  ];
  kind: 'all' | 'bookings' | 'reminders' | 'sharing' = 'all';

  private kindOf(notif: Notification): 'bookings' | 'reminders' | 'sharing' {
    if (notif.type.startsWith('reminder_')) return 'reminders';
    if (notif.type === 'property_assignment') return 'sharing';
    return 'bookings';
  }

  countOf(kind: string): number {
    return kind === 'all' ? this.notifications.length : this.notifications.filter(n => this.kindOf(n) === kind).length;
  }

  /** "just now", "5 min ago", "3 h ago", then the time of day (the day is the heading above). */
  ago(createdAt: string): string {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (minutes < 1) return this.t('just_now');
    if (minutes < 60) return this.t('minutes_ago').replace('{{n}}', String(minutes));
    if (minutes < 6 * 60) return this.t('hours_ago').replace('{{n}}', String(Math.floor(minutes / 60)));
    return String(createdAt).slice(11, 16);
  }

  /**
   * The groups are rebuilt at each check: without these, every hover would recreate the rows,
   * and a click pressed on one row and released on its new copy would be lost.
   */
  trackGroup(_: number, group: { label: string }): string {
    return group.label;
  }

  trackNotification(_: number, notif: Notification): number {
    return notif.id;
  }

  /** Read without opening it. */
  markRead(notif: Notification): void {
    this.notificationService.markAsRead(notif.id).subscribe({
      next: () => {
        notif.isRead = true;
        this.loadUnreadCount();
        this.notificationService.unreadCountChange$.next();
      },
    });
  }

  /** The notifications by day, the latest first: Today, Yesterday, then the date. */
  get groups(): { label: string; items: Notification[] }[] {
    const today = todayIso();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const groups: { key: string; label: string; items: Notification[] }[] = [];
    for (const notif of this.notifications.filter(n => this.kind === 'all' || this.kindOf(n) === this.kind)) {
      const key = String(notif.createdAt).slice(0, 10);
      let group = groups.find(g => g.key === key);
      if (!group) {
        const [year, month, day] = key.split('-').map(Number);
        const label = key === today ? this.t('today') : key === yesterdayIso ? this.t('yesterday')
          : `${day} ${getMonthLabel(month - 1, this.uiPrefs.getLanguage())}${year !== new Date().getFullYear() ? ' ' + year : ''}`;
        group = { key, label, items: [] };
        groups.push(group);
      }
      group.items.push(notif);
    }
    return groups;
  }
  loading = true;
  filter: 'all' | 'unread' = 'all';
  unreadCount = 0;
  total = 0;
  private page = 0;

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private snackBar: MatSnackBar,
    private uiPrefs: UiPreferencesService,
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
    this.loadUnreadCount();
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  /** Text in the reader's language; older notifications only have their French text. */
  titleOf(notif: Notification): string {
    return notif.messageKey ? this.t(`notif_${notif.messageKey}_title`) : notif.title;
  }

  messageOf(notif: Notification): string {
    if (!notif.messageKey) return notif.message;
    let params: Record<string, string> = {};
    try {
      params = JSON.parse(notif.messageParams || '{}');
    } catch {
      return notif.message;
    }
    let text = this.t(`notif_${notif.messageKey}_msg`);
    const isStatus = ['confirmed', 'in_progress', 'completed', 'cancelled'].some(s => notif.messageKey === `reservation_${s}`);
    if (isStatus && params['actor']) {
      text += ' ' + this.t('notif_by');
    }
    Object.entries(params).forEach(([name, value]) => {
      const shown = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : value;
      text = text.split(`{{${name}}}`).join(shown);
    });
    return text;
  }

  setFilter(filter: 'all' | 'unread'): void {
    this.filter = filter;
    this.page = 0;
    this.notifications = [];
    this.loadNotifications();
  }

  loadMore(): void {
    this.page++;
    this.loadNotifications();
  }

  private loadNotifications(): void {
    this.loading = true;
    this.notificationService.findPage(this.filter === 'unread', this.page, PAGE_SIZE).subscribe({
      next: (result) => {
        this.notifications = [...this.notifications, ...result.content];
        this.total = result.totalElements;
        this.loading = false;
      },
      error: () => this.loading = false,
    });
  }

  private loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe(count => this.unreadCount = count);
  }

  /** Marks as read then opens the related reservation (or property) — spec F9. */
  open(notif: Notification): void {
    if (!notif.isRead) {
      this.notificationService.markAsRead(notif.id).subscribe({
        next: () => {
          notif.isRead = true;
          this.loadUnreadCount();
          this.notificationService.unreadCountChange$.next();
        },
      });
    }
    if (notif.reservationId) {
      this.router.navigate(['/reservations', notif.reservationId]);
    } else if (notif.propertyId && notif.type !== 'reservation_deleted') {
      this.router.navigate(['/properties', notif.propertyId]);
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
        this.unreadCount = 0;
        this.notificationService.unreadCountChange$.next();
      },
    });
  }

  deleteNotification(notif: Notification): void {
    this.notificationService.remove(notif.id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== notif.id);
        this.total--;
        this.loadUnreadCount();
        this.notificationService.unreadCountChange$.next();
        this.snackBar.open(this.t('notification_deleted'), this.t('close'), { duration: 2000 });
      },
      error: () => this.snackBar.open(this.t('error_generic'), this.t('close'), { duration: 3000 }),
    });
  }

  icon(type: string): string {
    switch (type) {
      case 'reservation_created': return 'event';
      case 'reservation_updated': return 'edit_calendar';
      case 'reservation_confirmed': return 'event_available';
      case 'reservation_in_progress': return 'login';
      case 'reservation_completed': return 'task_alt';
      case 'reservation_cancelled': return 'event_busy';
      case 'reservation_deleted': return 'delete';
      case 'reservation_ended_early': return 'event_busy';
      case 'property_assignment': return 'home_work';
      case 'reminder_arrival': return 'flight_land';
      case 'reminder_departure': return 'flight_takeoff';
      default: return 'notifications';
    }
  }

  tone(type: string): string {
    if (['reservation_confirmed', 'reservation_in_progress', 'property_assignment'].includes(type)) return 'success';
    if (['reservation_cancelled', 'reservation_deleted'].includes(type)) return 'danger';
    if (type === 'reservation_completed') return 'neutral';
    if (type.startsWith('reminder_')) return 'success';
    return 'info';
  }
}
