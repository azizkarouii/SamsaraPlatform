import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '../../services/notification.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { Notification } from '../../models/notification.model';
import { t } from '../../shared/translations';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
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
          <mat-button-toggle-group [value]="filter" (change)="filter = $event.value">
            <mat-button-toggle value="all">{{ t('all') }}</mat-button-toggle>
            <mat-button-toggle value="unread">{{ t('unread') }}</mat-button-toggle>
          </mat-button-toggle-group>
          <button mat-stroked-button (click)="markAllAsRead()" [disabled]="!unreadCount">
            <mat-icon>done_all</mat-icon> {{ t('mark_all_read') }}
          </button>
        </div>
      </div>

      <mat-card>
        <mat-card-content>
          <div *ngIf="loading" class="loading-container"><mat-spinner diameter="40"></mat-spinner></div>

          <div *ngIf="!loading && !visible.length" class="empty-state">
            <mat-icon>notifications_none</mat-icon>
            <p>{{ t('no_notifications') }}</p>
          </div>

          <div class="list" *ngIf="!loading && visible.length">
            <div class="item" *ngFor="let notif of visible" [class.unread]="!notif.isRead" (click)="open(notif)">
              <div class="icon" [ngClass]="tone(notif.type)"><mat-icon>{{ icon(notif.type) }}</mat-icon></div>
              <div class="body">
                <div class="title">
                  {{ notif.title }}
                  <span class="dot" *ngIf="!notif.isRead"></span>
                </div>
                <div class="message">{{ notif.message }}</div>
                <div class="time">{{ notif.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
              </div>
              <button mat-icon-button (click)="$event.stopPropagation(); deleteNotification(notif)" [matTooltip]="t('delete')">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .narrow { max-width: 900px; }
    .list { display: grid; }
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
  loading = true;
  filter: 'all' | 'unread' = 'all';

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private snackBar: MatSnackBar,
    private uiPrefs: UiPreferencesService,
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  get visible(): Notification[] {
    return this.filter === 'unread' ? this.notifications.filter(n => !n.isRead) : this.notifications;
  }

  private loadNotifications(): void {
    this.notificationService.findAll().subscribe({
      next: (notifs) => {
        this.notifications = notifs;
        this.loading = false;
      },
      error: () => this.loading = false,
    });
  }

  /** Marks as read then opens the related reservation (or property) — spec F9. */
  open(notif: Notification): void {
    if (!notif.isRead) {
      this.notificationService.markAsRead(notif.id).subscribe({
        next: () => {
          notif.isRead = true;
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
        this.notificationService.unreadCountChange$.next();
      },
    });
  }

  deleteNotification(notif: Notification): void {
    this.notificationService.remove(notif.id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== notif.id);
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
      case 'property_assignment': return 'home_work';
      default: return 'notifications';
    }
  }

  tone(type: string): string {
    if (['reservation_confirmed', 'reservation_in_progress', 'property_assignment'].includes(type)) return 'success';
    if (['reservation_cancelled', 'reservation_deleted'].includes(type)) return 'danger';
    if (type === 'reservation_completed') return 'neutral';
    return 'info';
  }
}
