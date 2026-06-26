import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '../../services/notification.service';
import { Notification } from '../../models/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatChipsModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="notifications-container">
      <div class="header">
        <h1>Notifications</h1>
        <button mat-stroked-button (click)="markAllAsRead()" [disabled]="notifications.length === 0">
          <mat-icon>done_all</mat-icon> Mark All as Read
        </button>
      </div>

      <mat-card>
        <mat-card-content>
          <div *ngIf="loading; else loadedContent" class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <ng-template #loadedContent>
            <div *ngIf="notifications.length === 0" class="empty-state">
              <mat-icon class="empty-icon">notifications_none</mat-icon>
              <p>No notifications</p>
            </div>

            <mat-list *ngIf="notifications.length > 0">
              <mat-list-item *ngFor="let notif of notifications" [class.unread]="!notif.isRead" (click)="onNotificationClick(notif)" class="notification-item">
                <mat-icon matListItemIcon [color]="notif.isRead ? '' : 'primary'">
                  {{ getNotificationIcon(notif.type) }}
                </mat-icon>
                <div matListItemTitle>
                  <span>{{ notif.title }}</span>
                  <mat-chip *ngIf="!notif.isRead" class="unread-chip" color="primary" selected>New</mat-chip>
                </div>
                <div matListItemLine>{{ notif.message }}</div>
                <div matListItemLine class="notif-time">{{ notif.createdAt | date:'medium' }}</div>
                <button mat-icon-button matListItemMeta (click)="$event.stopPropagation(); deleteNotification(notif.id)" matTooltip="Delete">
                  <mat-icon color="warn">delete</mat-icon>
                </button>
                <mat-divider></mat-divider>
              </mat-list-item>
            </mat-list>
          </ng-template>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .notifications-container {
      padding: 1.5rem;
      max-width: 1000px;
    }
    .notification-item {
      white-space: normal !important;
    }
    .notification-item [matListItemLine] {
      white-space: normal !important;
      overflow: visible !important;
      text-overflow: clip !important;
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
    .notification-item {
      cursor: pointer;
      height: auto !important;
      padding: 0.5rem 0;
    }
    .notification-item:hover {
      background: rgba(0,0,0,0.03);
    }
    .notification-item.unread {
      background: rgba(63, 81, 181, 0.05);
    }
    .unread-chip {
      font-size: 0.7rem;
      margin-left: 0.5rem;
      height: 18px;
      line-height: 18px;
    }
    .notif-time {
      font-size: 0.75rem;
      color: rgba(0,0,0,0.5);
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
export class NotificationsComponent implements OnInit {
  notifications: Notification[] = [];
  loading = true;

  constructor(
    private notificationService: NotificationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  private loadNotifications(): void {
    this.notificationService.findAll().subscribe({
      next: (notifs) => {
        this.notifications = notifs;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onNotificationClick(notif: Notification): void {
    if (!notif.isRead) {
      this.notificationService.markAsRead(notif.id).subscribe({
        next: () => {
          notif.isRead = true;
          this.notificationService.unreadCountChange$.next();
        },
      });
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
        this.notificationService.unreadCountChange$.next();
        this.snackBar.open('All notifications marked as read', 'Close', { duration: 2000 });
      },
    });
  }

  deleteNotification(id: number): void {
    this.notificationService.remove(id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.notificationService.unreadCountChange$.next();
        this.snackBar.open('Notification deleted', 'Close', { duration: 2000 });
      },
    });
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'reservation': return 'book_online';
      case 'payment': return 'payments';
      case 'message': return 'message';
      default: return 'notifications';
    }
  }
}
