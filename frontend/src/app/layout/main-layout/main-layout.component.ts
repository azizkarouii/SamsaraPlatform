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

import { UserAvatarComponent } from '../../shared/user-avatar.component';
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
    UserAvatarComponent,
  ],
  template: `
    <a class="skip-link" href="#main-content" (click)="focusMain($event)">{{ t('skip_to_content') }}</a>
    <div class="sidebar-backdrop" *ngIf="isMobile && !sidebarHidden" (click)="sidebarHidden = true"></div>

    <aside id="sidebar" [class.hide]="sidebarHidden" [class.mobile]="isMobile" (click)="onSidebarClick($event)">
      <a class="brand" routerLink="/dashboard" [attr.aria-label]="t('app_title') + ' — ' + t('dashboard')">
        <img class="brand-mark" src="assets/brand/logo-icon.png" alt="" width="256" height="256" />
        <span class="text auth-brand">{{ t('app_title') }}</span>
      </a>

      <nav class="side-nav" [attr.aria-label]="t('main_navigation')">
        <ul class="side-menu">
          <li *ngFor="let item of navItems" routerLinkActive="active" #rla="routerLinkActive">
            <a [routerLink]="item.path"
               [attr.aria-current]="rla.isActive ? 'page' : null"
               [matTooltip]="sidebarHidden && !isMobile ? t(item.label) : ''" matTooltipPosition="after">
              <mat-icon aria-hidden="true">{{ item.icon }}</mat-icon>
              <span class="text">{{ t(item.label) }}</span>
              <span class="count" *ngIf="item.path === '/notifications' && unreadCount > 0">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
            </a>
          </li>
        </ul>

        <ul class="side-menu bottom">
          <li routerLinkActive="active" #rlp="routerLinkActive">
            <a routerLink="/profile"
               [attr.aria-current]="rlp.isActive ? 'page' : null"
               [matTooltip]="sidebarHidden && !isMobile ? t('profile') : ''" matTooltipPosition="after">
              <mat-icon aria-hidden="true">person</mat-icon>
              <span class="text">{{ t('profile') }}</span>
            </a>
          </li>
          <li>
            <button type="button" class="logout" (click)="logout()"
                    [matTooltip]="sidebarHidden && !isMobile ? t('logout') : ''" matTooltipPosition="after">
              <mat-icon aria-hidden="true">logout</mat-icon>
              <span class="text">{{ t('logout') }}</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>

    <section id="content" [class.sidebar-hide]="sidebarHidden">
      <header class="topbar">
        <button mat-icon-button type="button" class="nav-btn" (click)="toggleSidebar()"
                [attr.aria-label]="t('toggle_menu')" [attr.aria-expanded]="!sidebarHidden" aria-controls="sidebar">
          <mat-icon>menu</mat-icon>
        </button>
        <div class="nav-spacer"></div>

        <a mat-icon-button class="nav-btn" routerLink="/notifications"
           [attr.aria-label]="t('notifications') + (unreadCount ? ' (' + unreadCount + ' ' + t('unread') + ')' : '')"
           [matTooltip]="t('notifications')">
          <mat-icon [matBadge]="unreadCount > 99 ? '99+' : unreadCount" [matBadgeHidden]="!unreadCount"
                    matBadgeColor="warn" matBadgeSize="small">notifications</mat-icon>
        </a>

        <button mat-icon-button type="button" [matMenuTriggerFor]="languageMenu" [matTooltip]="t('language')"
                [attr.aria-label]="t('language')" class="nav-btn">
          <mat-icon>translate</mat-icon>
        </button>
        <mat-menu #languageMenu="matMenu">
          <button mat-menu-item *ngFor="let lang of languages" (click)="setLanguage(lang.code)"
                  role="menuitemradio" [attr.aria-checked]="language === lang.code">
            <mat-icon>{{ language === lang.code ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>
            <span>{{ lang.label }}</span>
          </button>
        </mat-menu>

        <button mat-icon-button type="button" (click)="toggleTheme()" class="nav-btn"
                [matTooltip]="t(themeMode === 'dark' ? 'light_mode' : 'dark_mode')"
                [attr.aria-label]="t(themeMode === 'dark' ? 'light_mode' : 'dark_mode')">
          <mat-icon>{{ themeMode === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
        </button>

        <a class="profile" *ngIf="user" routerLink="/profile">
          <app-user-avatar [name]="user.name" [photo]="user.photoUrl" aria-hidden="true"></app-user-avatar>
          <span class="identity">
            <span class="username">{{ user.name }}</span>
            <span class="role-badge">{{ user.role === 'PROPRIETAIRE' ? t('owner_role') : t('samsar_role') }}</span>
          </span>
        </a>
      </header>

      <main id="main-content" tabindex="-1">
        <router-outlet></router-outlet>
      </main>
    </section>
  `,
  styles: [`
    :host { display: flex; --sidebar-w: 264px; --sidebar-w-collapsed: 72px; --topbar-h: 60px; }
    a { text-decoration: none; }
    ul { list-style: none; margin: 0; padding: 0; }

    /* SIDEBAR */
    #sidebar {
      position: fixed; top: 0; inset-inline-start: 0; z-index: 2000;
      width: var(--sidebar-w); height: 100dvh; display: flex; flex-direction: column;
      background: var(--bg-sidenav);
      overflow-x: hidden; scrollbar-width: none;
      transition: width var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out);
    }
    #sidebar.hide { width: var(--sidebar-w-collapsed); }
    .brand {
      display: flex; align-items: center; gap: 0.75rem; height: var(--topbar-h); flex-shrink: 0;
      padding-inline: 16px; color: var(--primary); font-size: 1.3rem; white-space: nowrap;
    }
    .brand-mark { flex-shrink: 0; width: 40px; height: 40px; }
    .side-nav { flex: 1; display: flex; flex-direction: column; padding: 12px; padding-inline-end: 0; }
    .side-menu { display: grid; gap: 4px; }
    .side-menu li { position: relative; }
    .side-menu.bottom { margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border-color); }
    .side-menu a, .side-menu button {
      position: relative; box-sizing: border-box; width: calc(100% - 12px); height: 44px; display: flex; align-items: center; gap: 12px;
      padding-inline: 12px; border: 0; border-radius: 22px; background: transparent;
      color: var(--text-secondary); font: inherit; font-size: 0.95rem; font-weight: 500;
      white-space: nowrap; overflow: hidden;
      transition: background var(--duration-fast) ease, color var(--duration-fast) ease;
    }
    .side-menu a:hover, .side-menu button:hover { background: var(--surface-hover); color: var(--text-primary); }
    /* Active item = a tab that merges into the page background, with inverted rounded corners */
    .side-menu li.active a {
      width: 100%; padding-inline-end: 24px; background: var(--bg-main); color: var(--primary); font-weight: 600;
      border-start-end-radius: 0; border-end-end-radius: 0;
      border-start-start-radius: 22px; border-end-start-radius: 22px;
    }
    .side-menu li.active::before, .side-menu li.active::after {
      --x: 0; content: ''; position: absolute; inset-inline-end: 0; width: 20px; height: 20px; pointer-events: none;
    }
    .side-menu li.active::before { top: -20px; background: radial-gradient(circle at var(--x) 0, transparent 20px, var(--bg-main) 20.5px); }
    .side-menu li.active::after { bottom: -20px; background: radial-gradient(circle at var(--x) 100%, transparent 20px, var(--bg-main) 20.5px); }
    :host-context([dir='rtl']) .side-menu li.active::before, :host-context([dir='rtl']) .side-menu li.active::after { --x: 100%; }
    .side-menu mat-icon { flex-shrink: 0; }
    .count {
      margin-inline-start: auto; box-sizing: border-box; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px;
      background: #DC2626; color: #fff; font-size: 0.72rem; font-weight: 700;
      line-height: 20px; text-align: center; font-variant-numeric: tabular-nums;
    }
    .side-menu .logout { color: var(--status-cancelled); }
    .side-menu .logout:hover { background: var(--status-cancelled-bg); color: var(--status-cancelled); }
    #sidebar.hide .text, #sidebar.hide .count { opacity: 0; }

    /* CONTENT */
    #content {
      position: relative; display: flex; flex-direction: column; min-height: 100dvh; min-width: 0;
      width: calc(100% - var(--sidebar-w)); margin-inline-start: var(--sidebar-w);
      transition: margin var(--duration-base) var(--ease-out), width var(--duration-base) var(--ease-out);
    }
    #content.sidebar-hide { width: calc(100% - var(--sidebar-w-collapsed)); margin-inline-start: var(--sidebar-w-collapsed); }
    .sidebar-backdrop { position: fixed; inset: 0; background: rgba(2, 6, 23, 0.45); z-index: 1999; }

    /* TOPBAR (frosted glass) */
    .topbar {
      position: sticky; top: 0; z-index: 1000; height: var(--topbar-h);
      display: flex; align-items: center; gap: 8px; padding: 0 24px;
      background: color-mix(in srgb, var(--bg-toolbar) 80%, transparent);
      backdrop-filter: saturate(160%) blur(14px);
      border-bottom: 1px solid var(--border-color);
    }
    .nav-spacer { flex: 1; }
    .nav-btn { color: var(--text-secondary); }
    .profile {
      display: flex; align-items: center; gap: 10px; margin-inline-start: 8px;
      padding: 4px 12px 4px 4px; border-radius: 999px; color: var(--text-primary);
      transition: background var(--duration-fast) ease;
    }
    .profile:hover { background: var(--surface-hover); }
    .identity { display: flex; flex-direction: column; line-height: 1.2; }
    .username { font-size: 0.875rem; font-weight: 600; }
    .role-badge { font-size: 0.72rem; color: var(--text-secondary); }

    main { flex: 1; width: 100%; max-width: 1440px; margin-inline: auto; padding: 1.5rem; box-sizing: border-box; min-width: 0; }

    @media (max-width: 768px) {
      #sidebar.mobile.hide { width: var(--sidebar-w); transform: translateX(-100%); visibility: hidden; }
      :host-context([dir='rtl']) #sidebar.mobile.hide { transform: translateX(100%); }
      #content, #content.sidebar-hide { width: 100%; margin-inline-start: 0; }
      .topbar { padding: 0 8px 0 4px; gap: 2px; }
      .identity { display: none; }
      .profile { padding: 2px; }
      main { padding: 1rem; }
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

  navItems: { path: string; icon: string; label: string }[] = [];

  private buildNavItems(): { path: string; icon: string; label: string }[] {
    const isOwner = this.user?.role === 'PROPRIETAIRE';
    return [
      { path: '/dashboard', icon: 'space_dashboard', label: 'dashboard' },
      ...(isOwner ? [{ path: '/properties', icon: 'home_work', label: 'my_houses' }] : []),
      { path: '/shared-houses', icon: isOwner ? 'groups' : 'apartment', label: isOwner ? 'my_samsars' : 'shared_houses' },
      { path: '/reservations', icon: 'event_available', label: 'reservations' },
      { path: '/availability', icon: 'calendar_month', label: 'availability' },
      { path: '/notifications', icon: 'notifications', label: 'notifications' },
    ];
  }

  /** Skip link: move keyboard focus past the navigation without changing the route. */
  focusMain(event: Event): void {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
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
    this.navItems = this.buildNavItems();
    this.language = this.uiPreferencesService.getLanguage();
    this.themeMode = this.uiPreferencesService.getTheme();
    this.loadUnreadCount();
    // Name or photo changed on the profile page: reflect it in the top bar right away
    this.subscriptions.push(
      this.authService.currentUser$.subscribe(user => this.user = user)
    );
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
