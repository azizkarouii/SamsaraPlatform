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

      <mat-card>
        <mat-card-content>
          <div *ngIf="loading" class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>

          <div *ngIf="!loading && !notifications.length" class="empty-state">
            <mat-icon>notifications_none</mat-icon>
            <p>{{ t('no_notifications') }}</p>
          </div>

          <div class="list" *ngIf="notifications.length">
            <ng-container *ngFor="let group of groups">
            <h2 class="day">{{ group.label }}</h2>
            <div class="item" *ngFor="let notif of group.items" [class.unread]="!notif.isRead" (click)="open(notif)">
              <div class="icon" [ngClass]="tone(notif.type)"><mat-icon>{{ icon(notif.type) }}</mat-icon></div>
              <div class="body">
                <div class="title">
                  {{ titleOf(notif) }}
                  <span class="dot" *ngIf="!notif.isRead"></span>
                </div>
                <div class="message">{{ messageOf(notif) }}</div>
                <div class="time">{{ notif.createdAt | date:'HH:mm' }}</div>
              </div>
              <button mat-icon-button (click)="$event.stopPropagation(); deleteNotification(notif)" [matTooltip]="t('delete')">
                <mat-icon>close</mat-icon>
              </button>
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

  /** The notifications by day, the latest first: Today, Yesterday, then the date. */
  get groups(): { label: string; items: Notification[] }[] {
    const today = todayIso();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const groups: { key: string; label: string; items: Notification[] }[] = [];
    for (const notif of this.notifications) {
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
