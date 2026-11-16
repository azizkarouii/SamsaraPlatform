import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { AdminService, AdminStats, AdminUser } from '../../services/admin.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { t } from '../../shared/translations';
import { UserAvatarComponent } from '../../shared/user-avatar.component';

/** The platform at a glance: accounts, houses, bookings and what the subscriptions bring in. */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, UserAvatarComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <p class="eyebrow">{{ t('superadmin_role') }}</p>
          <h1>{{ t('admin_overview_title') }}</h1>
          <p class="subtitle">{{ t('admin_overview_sub') }}</p>
        </div>
        <a mat-flat-button color="primary" routerLink="/admin/accounts" [queryParams]="{ new: 1 }"><mat-icon>person_add</mat-icon> {{ t('admin_new_account') }}</a>
      </div>

      <div *ngIf="loading" class="loading"><mat-spinner diameter="40"></mat-spinner></div>

      <ng-container *ngIf="!loading && stats as s">
        <section class="money">
          <article class="money-card main">
            <span class="money-icon"><mat-icon>payments</mat-icon></span>
            <span class="money-label">{{ t('admin_monthly_revenue') }}</span>
            <strong class="money-value">{{ s.monthlyRevenue | number:'1.0-0' }} <small>TND</small></strong>
            <span class="money-note">{{ s.activeOwners + s.activeSamsars }} {{ t('admin_active_accounts') }} × {{ s.monthlyPrice | number:'1.0-0' }} TND</span>
          </article>
          <article class="money-card">
            <span class="money-icon gold"><mat-icon>savings</mat-icon></span>
            <span class="money-label">{{ t('admin_total_revenue') }}</span>
            <strong class="money-value">{{ s.totalRevenue | number:'1.0-0' }} <small>TND</small></strong>
            <span class="money-note">{{ t('admin_total_revenue_note') }}</span>
          </article>
          <article class="money-card chart" [attr.aria-label]="t('admin_revenue_by_month')">
            <span class="money-label">{{ t('admin_revenue_by_month') }}</span>
            <div class="bars">
              <div class="bar" *ngFor="let m of s.months; trackBy: trackMonth" [title]="m.revenue + ' TND'">
                <span class="bar-value">{{ m.revenue | number:'1.0-0' }}</span>
                <span class="bar-fill" [style.height.%]="barHeight(m.revenue)"></span>
                <span class="bar-label">{{ monthLabel(m.month) }}</span>
              </div>
            </div>
          </article>
        </section>

        <div class="kpis">
          <a class="kpi green lift-card" routerLink="/admin/accounts" [queryParams]="{ role: 'PROPRIETAIRE' }">
            <span class="kpi-value">{{ s.owners }}</span>
            <span class="kpi-label">{{ t('admin_owners') }}<br /><small>{{ s.activeOwners }} {{ t('admin_active') }}</small></span>
          </a>
          <a class="kpi gold lift-card" routerLink="/admin/accounts" [queryParams]="{ role: 'SAMSAR' }">
            <span class="kpi-value">{{ s.samsars }}</span>
            <span class="kpi-label">{{ t('admin_samsars') }}<br /><small>{{ s.activeSamsars }} {{ t('admin_active') }}</small></span>
          </a>
          <div class="kpi"><span class="kpi-value">{{ s.houses }}</span><span class="kpi-label">{{ t('admin_houses') }}</span></div>
          <div class="kpi"><span class="kpi-value">{{ s.reservations }}</span><span class="kpi-label">{{ t('admin_reservations') }}</span></div>
          <div class="kpi green"><span class="kpi-value">{{ s.ownersWithSamsars }}</span><span class="kpi-label">{{ t('admin_owners_with_samsars') }}</span></div>
          <div class="kpi gold"><span class="kpi-value">{{ s.newAccountsThisMonth }}</span><span class="kpi-label">{{ t('admin_new_this_month') }}</span></div>
        </div>

        <section class="recent">
          <div class="recent-head">
            <h2>{{ t('admin_recent_accounts') }}</h2>
            <a mat-button color="primary" routerLink="/admin/accounts">{{ t('admin_see_all') }} <mat-icon class="flip-rtl">arrow_forward</mat-icon></a>
          </div>
          <p class="muted" *ngIf="!recent.length">{{ t('admin_no_account') }}</p>
          <a class="row" *ngFor="let u of recent; trackBy: trackUser" routerLink="/admin/accounts" [queryParams]="{ q: u.email }">
            <app-user-avatar [name]="u.name" [photo]="u.photoUrl"></app-user-avatar>
            <span class="who"><b>{{ u.name }}</b><small>{{ u.email }}</small></span>
            <span class="tag" [class.owner]="u.role === 'PROPRIETAIRE'">{{ t(u.role === 'PROPRIETAIRE' ? 'owner_role' : 'samsar_role') }}</span>
            <span class="state" [class.off]="!u.active">{{ t(u.active ? 'admin_active_one' : 'admin_disabled_one') }}</span>
          </a>
        </section>
      </ng-container>
    </div>
  `,
  styles: [`
    .loading { display: grid; place-items: center; padding: 3rem; }
    .money { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.9rem; }
    .money-card { position: relative; display: flex; flex-direction: column; gap: 0.3rem; padding: 1.1rem 1.2rem; border-radius: 18px; background: var(--bg-card); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); overflow: hidden; }
    .money-card.main { background: linear-gradient(135deg, var(--primary-strong), var(--primary)); color: #fff; border: 0; }
    .money-card.main .money-label, .money-card.main .money-note { color: rgba(255, 255, 255, 0.85); }
    .money-icon { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; background: rgba(255, 255, 255, 0.18); margin-bottom: 0.3rem; }
    .money-icon.gold { background: var(--accent-gold-soft); color: var(--accent-gold); }
    .money-label { font-size: 0.8rem; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; color: var(--text-secondary); }
    .money-value { font-family: var(--display-font); font-size: 2.4rem; line-height: 1; font-variant-numeric: tabular-nums; }
    .money-value small { font-size: 1rem; }
    .money-note { font-size: 0.78rem; color: var(--text-secondary); }
    .bars { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.4rem; height: 140px; margin-top: auto; padding-top: 0.4rem; }
    .bar { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 0.2rem; height: 100%; }
    .bar-fill { width: 100%; max-width: 34px; min-height: 3px; border-radius: 8px 8px 3px 3px; background: linear-gradient(180deg, var(--primary), color-mix(in srgb, var(--primary) 55%, transparent)); transform-origin: bottom; animation: rise 0.6s ease both; }
    .bar:last-child .bar-fill { background: linear-gradient(180deg, var(--accent-gold), color-mix(in srgb, var(--accent-gold) 55%, transparent)); }
    @keyframes rise { from { transform: scaleY(0); } }
    .bar-value { font-size: 0.68rem; font-weight: 700; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
    .bar-label { font-size: 0.7rem; color: var(--text-secondary); text-transform: capitalize; }
    a.kpi { color: inherit; text-decoration: none; }
    .kpi small { font-size: 0.72rem; }
    .recent { padding: 1rem 1.1rem; border-radius: 18px; background: var(--bg-card); border: 1px solid var(--border-color); }
    .recent-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.4rem; }
    .recent-head h2 { margin: 0; font-family: var(--display-font); font-size: 1.4rem; }
    .row { display: flex; align-items: center; gap: 0.75rem; padding: 0.55rem 0.4rem; border-top: 1px solid var(--border-color); color: inherit; text-decoration: none; border-radius: 10px; transition: background 0.15s; }
    .row:hover { background: var(--surface-hover); }
    .who { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .who small { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tag { padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; background: var(--accent-gold-soft); color: var(--note-text, var(--accent-gold)); }
    .tag.owner { background: var(--primary-soft); color: var(--primary-strong); }
    .state { font-size: 0.75rem; font-weight: 600; color: var(--primary); }
    .state.off { color: var(--status-cancelled); }
    .muted { color: var(--text-secondary); }
    @media (max-width: 600px) { .tag { display: none; } }
  `],
})
export class AdminDashboardComponent implements OnInit {
  stats: AdminStats | null = null;
  recent: AdminUser[] = [];
  loading = true;

  constructor(private adminService: AdminService, private uiPrefs: UiPreferencesService) {}

  ngOnInit(): void {
    forkJoin({ stats: this.adminService.stats(), users: this.adminService.users() }).subscribe({
      next: ({ stats, users }) => {
        this.stats = stats;
        this.recent = users.slice(0, 6);
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  barHeight(revenue: number): number {
    const max = Math.max(...(this.stats?.months ?? []).map(m => m.revenue), 1);
    return Math.max(2, (revenue / max) * 100);
  }

  /** "2026-11" → "nov." in the reader's language. */
  monthLabel(month: string): string {
    const [year, m] = month.split('-').map(Number);
    const locale = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-TN' }[this.uiPrefs.getLanguage()] ?? 'fr-FR';
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(year, m - 1, 1));
  }

  trackMonth(_: number, m: { month: string }): string {
    return m.month;
  }

  trackUser(_: number, u: AdminUser): number {
    return u.id;
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }
}
