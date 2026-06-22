import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { User } from '../../models/auth.model';
import { Subscription, interval } from 'rxjs';

const TRANSLATIONS: Record<string, Record<string, string>> = {
  dashboard: { fr: 'Tableau de bord', en: 'Dashboard', ar: 'لوحة القيادة' },
  properties: { fr: 'Propriétés', en: 'Properties', ar: 'العقارات' },
  reservations: { fr: 'Réservations', en: 'Reservations', ar: 'الحجوزات' },
  shared_houses: { fr: 'Maisons partagées', en: 'Shared houses', ar: 'منازل مشتركة' },
  notifications: { fr: 'Notifications', en: 'Notifications', ar: 'الإشعارات' },
  profile: { fr: 'Profil', en: 'Profile', ar: 'الملف الشخصي' },
  logout: { fr: 'Déconnexion', en: 'Logout', ar: 'تسجيل الخروج' },
  language: { fr: 'Langue', en: 'Language', ar: 'اللغة' },
  dark_mode: { fr: 'Mode sombre', en: 'Dark mode', ar: 'الوضع المظلم' },
  light_mode: { fr: 'Mode clair', en: 'Light mode', ar: 'الوضع الفاتح' },
};

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav #drawer class="sidenav" mode="side" opened>
        <mat-toolbar class="sidenav-header">
          <span class="app-title">Samsara</span>
        </mat-toolbar>
        <mat-divider></mat-divider>
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active-link" (click)="onNavClick()">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>{{ t('dashboard') }}</span>
          </a>
          <a mat-list-item routerLink="/properties" routerLinkActive="active-link" (click)="onNavClick()">
            <mat-icon matListItemIcon>home</mat-icon>
            <span matListItemTitle>{{ t('properties') }}</span>
          </a>
          <a mat-list-item routerLink="/reservations" routerLinkActive="active-link" (click)="onNavClick()">
            <mat-icon matListItemIcon>book_online</mat-icon>
            <span matListItemTitle>{{ t('reservations') }}</span>
          </a>
          <a mat-list-item routerLink="/shared-houses" routerLinkActive="active-link" (click)="onNavClick()">
            <mat-icon matListItemIcon>holiday_village</mat-icon>
            <span matListItemTitle>{{ t('shared_houses') }}</span>
          </a>
          <a mat-list-item routerLink="/notifications" routerLinkActive="active-link" (click)="onNavClick()">
            <mat-icon matListItemIcon [matBadge]="unreadCount" matBadgeColor="warn" [matBadgeHidden]="unreadCount === 0">notifications</mat-icon>
            <span matListItemTitle>{{ t('notifications') }}</span>
          </a>
          <a mat-list-item routerLink="/profile" routerLinkActive="active-link" (click)="onNavClick()">
            <mat-icon matListItemIcon>person</mat-icon>
            <span matListItemTitle>{{ t('profile') }}</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="main-toolbar">
          <button mat-icon-button (click)="drawer.toggle()" class="menu-button">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="toolbar-spacer"></span>

          <button mat-icon-button routerLink="/notifications" [matBadge]="unreadCount" matBadgeColor="warn" [matBadgeHidden]="unreadCount === 0">
            <mat-icon>notifications</mat-icon>
          </button>

          <button mat-icon-button (click)="toggleLanguage()" [matTooltip]="t('language')">
            <mat-icon>translate</mat-icon>
          </button>

          <button mat-icon-button (click)="toggleTheme()" [matTooltip]="t(themeMode === 'dark' ? 'light_mode' : 'dark_mode')">
            <mat-icon>{{ themeMode === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
          </button>

          <button mat-icon-button [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <button mat-menu-item routerLink="/profile">
              <mat-icon>person</mat-icon>
              <span>{{ t('profile') }}</span>
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>{{ t('logout') }}</span>
            </button>
          </mat-menu>
        </mat-toolbar>

        <div class="content">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container {
      height: 100vh;
    }
    .sidenav {
      width: 250px;
      background: var(--bg-sidenav);
    }
    .sidenav-header {
      background: #3f51b5;
      color: white;
    }
    .app-title {
      font-size: 1.5rem;
      font-weight: 500;
    }
    .main-toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      background: var(--bg-toolbar);
      border-bottom: 1px solid var(--border-color);
    }
    .menu-button {
      margin-right: 1rem;
    }
    .toolbar-spacer {
      flex: 1 1 auto;
    }
    .content {
      padding: 1.5rem;
      background: var(--bg-main);
      min-height: calc(100vh - 64px);
    }
    .active-link {
      background: rgba(63, 81, 181, 0.1);
      color: #3f51b5;
    }
    .active-link mat-icon {
      color: #3f51b5;
    }
    mat-nav-list a {
      margin: 2px 8px;
      border-radius: 4px;
    }
    mat-nav-list a span {
      color: var(--text-primary);
    }
  `]
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  @ViewChild(MatSidenav) drawer!: MatSidenav;
  user: User | null = null;
  unreadCount = 0;
  language: 'fr' | 'en' | 'ar' = 'fr';
  themeMode: 'light' | 'dark' = 'light';
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private uiPreferencesService: UiPreferencesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.language = this.uiPreferencesService.getLanguage();
    this.themeMode = this.uiPreferencesService.getTheme();
    this.loadUnreadCount();
    this.subscriptions.push(
      interval(30000).subscribe(() => this.loadUnreadCount())
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  private loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => {
        this.unreadCount = count;
      },
    });
  }

  onNavClick(): void {
    if (this.drawer?.mode === 'over') {
      this.drawer.close();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleTheme(): void {
    this.uiPreferencesService.toggleTheme();
    this.themeMode = this.uiPreferencesService.getTheme();
  }

  toggleLanguage(): void {
    this.uiPreferencesService.toggleLanguage();
    this.language = this.uiPreferencesService.getLanguage();
  }

  t(key: string): string {
    return TRANSLATIONS[key]?.[this.language] ?? key;
  }
}
