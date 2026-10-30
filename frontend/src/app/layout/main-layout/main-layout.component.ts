import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { User } from '../../models/auth.model';
import { Subscription, interval } from 'rxjs';
import { TRANSLATIONS, AppLanguage } from '../../shared/translations';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  template: `
    <div class="sidebar-backdrop" *ngIf="isMobile && !sidebarHidden" (click)="sidebarHidden = true"></div>
    <section id="sidebar" [class.hide]="sidebarHidden" [class.mobile]="isMobile" (click)="onSidebarClick($event)">
      <a class="brand">
        <i class='bx bxs-building-house'></i>
        <span class="text">{{ t('app_title') }}</span>
      </a>
      <ul class="side-menu top">
        <li [class.active]="router.url === '/dashboard'">
          <a routerLink="/dashboard">
            <i class='bx bxs-dashboard'></i>
            <span class="text">{{ t('dashboard') }}</span>
          </a>
        </li>
        <li *ngIf="user?.role === 'PROPRIETAIRE'" [class.active]="router.url.startsWith('/properties')">
          <a routerLink="/properties">
            <i class='bx bxs-home'></i>
            <span class="text">{{ t('my_houses') }}</span>
          </a>
        </li>
        <li [class.active]="router.url.startsWith('/shared-houses')">
          <a routerLink="/shared-houses">
            <i class='bx' [ngClass]="user?.role === 'PROPRIETAIRE' ? 'bxs-group' : 'bxs-hotel'"></i>
            <span class="text">{{ user?.role === 'PROPRIETAIRE' ? t('my_samsars') : t('shared_houses') }}</span>
          </a>
        </li>
        <li [class.active]="router.url.startsWith('/reservations')">
          <a routerLink="/reservations">
            <i class='bx bxs-calendar-check'></i>
            <span class="text">{{ t('reservations') }}</span>
          </a>
        </li>
        <li [class.active]="router.url.startsWith('/availability')">
          <a routerLink="/availability">
            <i class='bx bxs-calendar'></i>
            <span class="text">{{ t('availability') }}</span>
          </a>
        </li>
        <li [class.active]="router.url.startsWith('/notifications')">
          <a routerLink="/notifications">
            <i class='bx bxs-bell'></i>
            <span class="text">{{ t('notifications') }}</span>
          </a>
        </li>
      </ul>
      <ul class="side-menu">
        <li [class.active]="router.url.startsWith('/profile')">
          <a routerLink="/profile">
            <i class='bx bxs-user'></i>
            <span class="text">{{ t('profile') }}</span>
          </a>
        </li>
        <li>
          <a class="logout" (click)="logout()">
            <i class='bx bxs-log-out-circle'></i>
            <span class="text">{{ t('logout') }}</span>
          </a>
        </li>
      </ul>
    </section>

    <section id="content" [class.sidebar-hide]="sidebarHidden">
      <nav>
        <i (click)="toggleSidebar()" class='bx bx-menu'></i>
        <div class="nav-spacer"></div>

        <a class="notification" routerLink="/notifications">
          <i class='bx bxs-bell'></i>
          <span class="num" *ngIf="unreadCount > 0">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        </a>

        <button mat-icon-button [matMenuTriggerFor]="languageMenu" [matTooltip]="t('language')" class="nav-btn">
          <mat-icon>translate</mat-icon>
        </button>
        <mat-menu #languageMenu="matMenu">
          <button mat-menu-item *ngFor="let lang of languages" (click)="setLanguage(lang.code)">
            <mat-icon>{{ language === lang.code ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>
            <span>{{ lang.label }}</span>
          </button>
        </mat-menu>

        <button mat-icon-button (click)="toggleTheme()" [matTooltip]="t(themeMode === 'dark' ? 'light_mode' : 'dark_mode')" class="nav-btn">
          <mat-icon>{{ themeMode === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
        </button>

        <a class="profile" *ngIf="user" routerLink="/profile">
          <span class="avatar">{{ initials }}</span>
          <span class="username">{{ user.name }}</span>
          <span class="role-badge">{{ user.role === 'PROPRIETAIRE' ? t('owner_role') : t('samsar_role') }}</span>
        </a>

      </nav>

      <main>
        <router-outlet></router-outlet>
      </main>
    </section>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap');

    :host * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :host {
      --light: #F9F9F9;
      --blue: #3C91E6;
      --light-blue: #CFE8FF;
      --grey: #eee;
      --dark-grey: #AAAAAA;
      --dark: #342E37;
      --red: #DB504A;
      --yellow: #FFCE26;
      --light-yellow: #FFF2C6;
      --orange: #FD7238;
      --light-orange: #FFE0D3;
      display: flex;
      font-family: 'Lato', sans-serif;
    }

    a { text-decoration: none; }
    li { list-style: none; }

    /* SIDEBAR */
    #sidebar {
      position: fixed;
      top: 0;
      inset-inline-start: 0;
      width: 280px;
      height: 100%;
      background: var(--light);
      z-index: 2000;
      font-family: 'Lato', sans-serif;
      transition: .3s ease;
      overflow-x: hidden;
      scrollbar-width: none;
      display: flex;
      flex-direction: column;
    }
    #sidebar::-webkit-scrollbar { display: none; }
    #sidebar.hide {
      width: 60px;
    }
    #sidebar .brand {
      font-size: 22px;
      font-weight: 700;
      height: 56px;
      display: flex;
      align-items: center;
      color: var(--blue);
      position: sticky;
      top: 0;
      inset-inline-start: 0;
      background: var(--light);
      z-index: 500;
      padding-bottom: 20px;
      box-sizing: content-box;
      white-space: nowrap;
      overflow: hidden;
    }
    #sidebar .brand i {
      min-width: 60px;
      display: flex;
      justify-content: center;
      font-size: 1.5rem;
    }
    #sidebar .side-menu {
      width: 100%;
      margin-top: 24px;
      padding: 0;
    }
    #sidebar .side-menu.top {
      flex: 1;
    }
    #sidebar .side-menu li {
      height: 48px;
      background: transparent;
      margin-inline-start: 6px;
      border-radius: 48px 0 0 48px;
      padding: 4px;
    }
    #sidebar .side-menu li.active {
      background: var(--grey);
      position: relative;
    }
    #sidebar .side-menu li.active::before {
      content: '';
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      top: -40px;
      inset-inline-end: 0;
      box-shadow: 20px 20px 0 var(--grey);
      z-index: -1;
    }
    #sidebar .side-menu li.active::after {
      content: '';
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      bottom: -40px;
      inset-inline-end: 0;
      box-shadow: 20px -20px 0 var(--grey);
      z-index: -1;
    }
    #sidebar .side-menu li a {
      width: 100%;
      height: 100%;
      background: var(--light);
      display: flex;
      align-items: center;
      border-radius: 48px;
      font-size: 16px;
      color: var(--dark);
      white-space: nowrap;
      overflow-x: hidden;
      cursor: pointer;
    }
    #sidebar .side-menu li.active a {
      color: var(--blue);
    }
    #sidebar.hide .side-menu li a {
      width: calc(48px - (4px * 2));
      transition: width .3s ease;
    }
    #sidebar .side-menu li a.logout {
      color: var(--red);
    }
    #sidebar .side-menu.top li a:hover {
      color: var(--blue);
    }
    #sidebar .side-menu li a i {
      min-width: calc(60px - ((4px + 6px) * 2));
      display: flex;
      justify-content: center;
      font-size: 1.3rem;
    }
    #sidebar .side-menu .settings a:hover {
      color: var(--blue);
    }
    /* SIDEBAR */

    /* CONTENT */
    #content {
      position: relative;
      width: calc(100% - 280px);
      margin-inline-start: 280px;
      transition: .3s ease;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    #content.sidebar-hide {
      width: calc(100% - 60px);
      margin-inline-start: 60px;
    }
    .sidebar-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 1999;
    }
    @media (max-width: 768px) {
      #sidebar.mobile.hide {
        width: 0;
      }
      #content, #content.sidebar-hide {
        width: 100%;
        margin-inline-start: 0;
      }
      #content nav {
        padding: 0 12px;
        gap: 8px;
      }
      #content main {
        padding: 1rem;
      }
    }

    /* NAVBAR */
    #content nav {
      height: 56px;
      background: var(--light);
      padding: 0 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      font-family: 'Lato', sans-serif;
      position: sticky;
      top: 0;
      z-index: 1000;
      border-bottom: 1px solid var(--border-color);
    }
    #content nav .bx-menu {
      cursor: pointer;
      color: var(--dark);
      font-size: 1.5rem;
    }
    #content nav .bx-menu:hover {
      color: var(--blue);
    }
    #content nav .notification {
      font-size: 1.3rem;
      position: relative;
      color: var(--dark);
      display: flex;
      align-items: center;
    }
    #content nav .notification .num {
      position: absolute;
      top: -6px;
      inset-inline-end: -6px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--red);
      color: white;
      font-weight: 700;
      font-size: 11px;
      display: flex;
      justify-content: center;
      align-items: center;
      line-height: 1;
    }
    #content nav .profile {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: var(--dark);
    }
    #content nav .profile .username {
      font-size: 0.9rem;
    }
    #content nav .profile .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--blue);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
    }
    #content nav .profile .role-badge {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: 10px;
      background: var(--light-blue);
      color: var(--blue);
    }
    .nav-spacer {
      flex: 1;
    }
    .nav-btn {
      width: 36px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .nav-btn mat-icon {
      font-size: 20px;
      line-height: 1;
    }
    @media (max-width: 768px) {
      #content nav .profile .username,
      #content nav .profile .role-badge {
        display: none;
      }
    }
    /* NAVBAR */

    #content main {
      flex: 1;
      padding: 1.5rem;
      background: var(--grey);
      color: var(--text-primary);
      min-width: 0;
    }
    @media (max-width: 768px) {
      #content main {
        padding: 1rem;
      }
    }

  `]
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  user: User | null = null;
  unreadCount = 0;
  language: AppLanguage = 'fr';
  themeMode: 'light' | 'dark' = 'light';
  sidebarHidden = false;
  isMobile = false;
  readonly languages: { code: AppLanguage; label: string }[] = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
    { code: 'ar', label: 'العربية' },
  ];
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private uiPreferencesService: UiPreferencesService,
    public router: Router
  ) {}

  get initials(): string {
    return (this.user?.name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
  }

  @HostListener('window:resize')
  onResize(): void {
    const mobile = window.innerWidth <= 768;
    if (mobile !== this.isMobile) {
      this.isMobile = mobile;
      this.sidebarHidden = mobile;
    }
  }

  /** On mobile the sidebar is an overlay: close it once a link has been chosen. */
  onSidebarClick(event: MouseEvent): void {
    if (this.isMobile && (event.target as HTMLElement).closest('a')) {
      this.sidebarHidden = true;
    }
  }

  ngOnInit(): void {
    this.onResize();
    this.user = this.authService.getCurrentUser();
    this.language = this.uiPreferencesService.getLanguage();
    this.themeMode = this.uiPreferencesService.getTheme();
    this.loadUnreadCount();
    this.subscriptions.push(
      interval(30000).subscribe(() => this.loadUnreadCount())
    );
    this.subscriptions.push(
      this.notificationService.unreadCountChange$.subscribe(() => this.loadUnreadCount())
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

  toggleSidebar(): void {
    this.sidebarHidden = !this.sidebarHidden;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleTheme(): void {
    this.uiPreferencesService.toggleTheme();
    this.themeMode = this.uiPreferencesService.getTheme();
  }

  setLanguage(language: AppLanguage): void {
    this.uiPreferencesService.setLanguage(language);
    this.language = language;
  }

  t(key: string): string {
    return TRANSLATIONS[key]?.[this.language] ?? key;
  }
}
