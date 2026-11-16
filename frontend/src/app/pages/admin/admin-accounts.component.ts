import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminService, AdminUser, ManagedRole } from '../../services/admin.service';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { t } from '../../shared/translations';
import { SearchBarComponent } from '../../shared/search-bar.component';
import { UserAvatarComponent } from '../../shared/user-avatar.component';
import { AdminAccountDialogComponent } from './admin-account-dialog.component';

type RoleFilter = 'all' | ManagedRole;
type StateFilter = 'all' | 'active' | 'off';

/** Every owner and samsar of the platform: create, edit, turn off and on, samsars option, delete. */
@Component({
  selector: 'app-admin-accounts',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule,
            MatSlideToggleModule, MatSnackBarModule, MatTooltipModule, SearchBarComponent, UserAvatarComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <p class="eyebrow">{{ t('superadmin_role') }}</p>
          <h1>{{ t('admin_accounts_title') }}</h1>
          <p class="subtitle">{{ t('admin_accounts_sub') }}</p>
        </div>
        <button mat-flat-button color="primary" type="button" (click)="openDialog()"><mat-icon>person_add</mat-icon> {{ t('admin_new_account') }}</button>
      </div>

      <div class="toolbar">
        <app-search-bar class="search" [value]="query" (valueChange)="setQuery($event)" [label]="t('admin_search_label')"
                        [hints]="[t('admin_search_hint_name'), t('admin_search_hint_email'), t('admin_search_hint_phone')]"
                        [count]="query || roleFilter !== 'all' || stateFilter !== 'all' ? filtered.length : null"
                        [countLabel]="t('admin_result_accounts')" [countLabelOne]="t('admin_result_account_one')"
                        [clearLabel]="t('clear_filter')"></app-search-bar>
        <div class="segmented" role="group" [attr.aria-label]="t('role')">
          <button type="button" *ngFor="let r of roleFilters" [class.active]="roleFilter === r.id" (click)="setRole(r.id)">
            {{ t(r.label) }}<span class="count">{{ countRole(r.id) }}</span>
          </button>
        </div>
        <div class="segmented" role="group" [attr.aria-label]="t('status_label')">
          <button type="button" *ngFor="let s of stateFilters" [class.active]="stateFilter === s.id" (click)="stateFilter = s.id">{{ t(s.label) }}</button>
        </div>
      </div>

      <div *ngIf="loading" class="loading"><mat-spinner diameter="40"></mat-spinner></div>

      <div class="grid" *ngIf="!loading">
        <div class="empty-panel" *ngIf="!filtered.length">
          <mat-icon class="empty-icon">{{ users.length ? 'search_off' : 'group_add' }}</mat-icon>
          <h2>{{ t(users.length ? 'admin_no_match' : 'admin_no_account') }}</h2>
          <p>{{ t(users.length ? 'admin_no_match_hint' : 'admin_no_account_hint') }}</p>
          <button mat-flat-button color="primary" *ngIf="!users.length" (click)="openDialog()"><mat-icon>person_add</mat-icon> {{ t('admin_new_account') }}</button>
        </div>

        <article class="account lift-card" *ngFor="let u of filtered; trackBy: trackUser" [class.off]="!u.active">
          <header>
            <app-user-avatar [name]="u.name" [photo]="u.photoUrl"></app-user-avatar>
            <div class="who">
              <b>{{ u.name }}</b>
              <a [href]="'mailto:' + u.email">{{ u.email }}</a>
            </div>
            <span class="tag" [class.owner]="u.role === 'PROPRIETAIRE'">
              <mat-icon inline>{{ u.role === 'PROPRIETAIRE' ? 'home_work' : 'handshake' }}</mat-icon>
              {{ t(u.role === 'PROPRIETAIRE' ? 'owner_role' : 'samsar_role') }}
            </span>
          </header>

          <ul class="facts">
            <li *ngIf="u.phone"><mat-icon>call</mat-icon><a class="ltr" [href]="'tel:+216' + u.phone">+216 {{ u.phone }}</a></li>
            <li><mat-icon>event</mat-icon>{{ t('admin_since') }} {{ u.createdAt | date:'d MMM y' }}</li>
            <li *ngIf="u.role === 'PROPRIETAIRE'"><mat-icon>cottage</mat-icon>{{ u.houses }} {{ t(u.houses === 1 ? 'admin_house_one' : 'admin_houses_lower') }}</li>
            <li *ngIf="u.role === 'PROPRIETAIRE' && u.samsarsEnabled"><mat-icon>groups</mat-icon>{{ u.shares }} {{ t('admin_accesses_given') }}</li>
            <li *ngIf="u.role === 'SAMSAR'"><mat-icon>apartment</mat-icon>{{ u.shares }} {{ t('admin_houses_shared') }}</li>
          </ul>

          <div class="switches">
            <mat-slide-toggle color="primary" [checked]="u.active" [disabled]="busy.has(u.id)" (change)="toggleActive(u, $event)">
              {{ t(u.active ? 'admin_active_one' : 'admin_disabled_one') }}
            </mat-slide-toggle>
            <mat-slide-toggle *ngIf="u.role === 'PROPRIETAIRE'" color="primary" [checked]="!!u.samsarsEnabled" [disabled]="busy.has(u.id)"
                              (change)="toggleSamsars(u, $event)" [matTooltip]="t('admin_works_with_samsars_hint')">
              {{ t('admin_samsars_switch') }}
            </mat-slide-toggle>
          </div>

          <footer>
            <button mat-stroked-button type="button" (click)="openDialog(u)"><mat-icon>edit</mat-icon> {{ t('edit') }}</button>
            <button mat-icon-button type="button" class="danger" (click)="remove(u)" [matTooltip]="t('delete')" [attr.aria-label]="t('delete')"><mat-icon>delete_outline</mat-icon></button>
          </footer>
        </article>
      </div>
    </div>
  `,
  styles: [`
    .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; }
    .search { flex: 1 1 320px; }
    .loading { display: grid; place-items: center; padding: 3rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 0.9rem; }
    .empty-icon { font-size: 44px; width: 44px; height: 44px; color: var(--primary); }
    .account { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; border-radius: 18px; background: var(--bg-card); border: 1px solid var(--border-color); border-top: 4px solid var(--primary); transition: opacity 0.2s, filter 0.2s; }
    .account:has(.tag:not(.owner)) { border-top-color: var(--accent-gold); }
    .account.off { opacity: 0.62; filter: grayscale(0.6); border-top-color: var(--status-cancelled); }
    .account.off:hover { opacity: 1; filter: none; }
    header { display: flex; align-items: center; gap: 0.7rem; }
    .who { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .who b { font-size: 1rem; }
    .who a { font-size: 0.8rem; color: var(--text-secondary); text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .who a:hover { color: var(--primary); }
    .tag { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; background: var(--accent-gold-soft); color: var(--note-text, var(--accent-gold)); white-space: nowrap; }
    .tag.owner { background: var(--primary-soft); color: var(--primary-strong); }
    .facts { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.4rem 0.9rem; font-size: 0.8rem; color: var(--text-secondary); }
    .facts li { display: inline-flex; align-items: center; gap: 0.3rem; }
    .facts mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .facts a { color: inherit; text-decoration: none; }
    .switches { display: flex; flex-wrap: wrap; gap: 0.5rem 1.2rem; padding: 0.6rem 0.75rem; border-radius: 12px; background: var(--surface-hover); font-size: 0.85rem; }
    footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
    footer [mat-stroked-button] { border-radius: 999px; }
    .danger:hover { color: var(--status-cancelled); }
  `],
})
export class AdminAccountsComponent implements OnInit {
  users: AdminUser[] = [];
  loading = true;
  query = '';
  roleFilter: RoleFilter = 'all';
  stateFilter: StateFilter = 'all';
  /** Accounts with a change on its way: their switches wait. */
  busy = new Set<number>();

  readonly roleFilters: { id: RoleFilter; label: string }[] = [
    { id: 'all', label: 'all' },
    { id: 'PROPRIETAIRE', label: 'admin_owners' },
    { id: 'SAMSAR', label: 'admin_samsars' },
  ];
  readonly stateFilters: { id: StateFilter; label: string }[] = [
    { id: 'all', label: 'all' },
    { id: 'active', label: 'admin_active_many' },
    { id: 'off', label: 'admin_disabled_many' },
  ];

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private uiPrefs: UiPreferencesService,
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const role = params.get('role');
    if (role === 'PROPRIETAIRE' || role === 'SAMSAR') this.roleFilter = role;
    this.query = params.get('q') ?? '';
    this.load();
    if (params.get('new')) {
      setTimeout(() => this.openDialog());
      this.router.navigate([], { queryParams: { new: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
  }

  get filtered(): AdminUser[] {
    const q = this.query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return this.users.filter(u =>
      (this.roleFilter === 'all' || u.role === this.roleFilter)
      && (this.stateFilter === 'all' || (this.stateFilter === 'active') === u.active)
      && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (!!digits && (u.phone ?? '').includes(digits))));
  }

  countRole(role: RoleFilter): number {
    return role === 'all' ? this.users.length : this.users.filter(u => u.role === role).length;
  }

  setQuery(value: string): void {
    this.query = value;
  }

  setRole(role: RoleFilter): void {
    this.roleFilter = role;
  }

  load(): void {
    this.adminService.users().subscribe({
      next: users => {
        this.users = users;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  openDialog(user?: AdminUser): void {
    this.dialog.open(AdminAccountDialogComponent, {
      data: { user, role: this.roleFilter === 'all' ? undefined : this.roleFilter },
      width: '620px',
      maxWidth: '96vw',
      autoFocus: false,
    }).afterClosed().subscribe(saved => {
      if (saved) {
        this.replace(saved);
        this.snackBar.open(this.t(user ? 'admin_account_saved' : 'admin_account_created'), this.t('close'), { duration: 3000 });
      }
    });
  }

  toggleActive(user: AdminUser, change: MatSlideToggleChange): void {
    const active = change.checked;
    this.run(user, this.adminService.setActive(user.id, active), active ? 'admin_turned_on' : 'admin_turned_off', change);
  }

  toggleSamsars(user: AdminUser, change: MatSlideToggleChange): void {
    const enabled = change.checked;
    if (!enabled && user.shares > 0 && !confirm(this.t('admin_samsars_off_confirm'))) {
      // The switch moved already: put it back
      change.source.checked = true;
      return;
    }
    this.run(user, this.adminService.setSamsars(user.id, enabled), enabled ? 'admin_samsars_on' : 'admin_samsars_off', change);
  }

  remove(user: AdminUser): void {
    if (!confirm(this.t('admin_delete_confirm').replace('{{name}}', user.name))) return;
    this.adminService.remove(user.id).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== user.id);
        this.snackBar.open(this.t('admin_account_deleted'), this.t('close'), { duration: 3000 });
      },
      error: err => this.snackBar.open(err.error?.message || this.t('admin_save_failed'), this.t('close'), { duration: 6000 }),
    });
  }

  trackUser(_: number, user: AdminUser): number {
    return user.id;
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  private run(user: AdminUser, call: ReturnType<AdminService['setActive']>, done: string, change: MatSlideToggleChange): void {
    this.busy.add(user.id);
    call.subscribe({
      next: saved => {
        this.busy.delete(user.id);
        this.replace(saved);
        this.snackBar.open(this.t(done).replace('{{name}}', saved.name), this.t('close'), { duration: 2500 });
      },
      error: err => {
        this.busy.delete(user.id);
        change.source.checked = !change.checked;
        this.snackBar.open(err.error?.message || this.t('admin_save_failed'), this.t('close'), { duration: 5000 });
      },
    });
  }

  private replace(saved: AdminUser): void {
    const exists = this.users.some(u => u.id === saved.id);
    this.users = exists ? this.users.map(u => (u.id === saved.id ? saved : u)) : [saved, ...this.users];
  }
}
