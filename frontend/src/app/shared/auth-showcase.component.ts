import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { UiPreferencesService } from '../services/ui-preferences.service';
import { t } from './translations';
import { getMonthLabel, getWeekdayLabels } from './calendar-utils';

/**
 * Beside the sign-in forms on a wide screen: what the app does, and a small desk calendar of the month.
 * Decorative only: the chips are examples, not data.
 */
@Component({
  selector: 'app-auth-showcase',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <section class="showcase" aria-hidden="false">
      <h2>{{ t('auth_showcase_title') }}</h2>
      <ul>
        <li><mat-icon>view_timeline</mat-icon><span>{{ t('auth_feature_planning') }}</span></li>
        <li><mat-icon>payments</mat-icon><span>{{ t('auth_feature_money') }}</span></li>
        <li><mat-icon>notifications_active</mat-icon><span>{{ t('auth_feature_reminders') }}</span></li>
      </ul>
      <div class="mini-notebook" aria-hidden="true">
        <p class="mini-title">{{ month }} <small>{{ year }}</small></p>
        <div class="mini-grid">
          <span class="wd" *ngFor="let w of weekdays">{{ w }}</span>
          <span *ngFor="let d of days" class="d" [class.today]="d === today" [class.out]="d < 1">{{ d > 0 ? d : '' }}</span>
          <i class="bar a"></i><i class="bar b"></i><i class="bar c"></i>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: none; flex: 1 1 0; max-width: 520px; }
    @media (min-width: 1000px) { :host { display: block; } }
    .showcase { color: #fff; display: flex; flex-direction: column; gap: 1.4rem; }
    h2 { margin: 0; font-family: var(--display-font); font-size: clamp(2.4rem, 4vw, 3.4rem); line-height: 1.02; font-weight: 700; text-shadow: 0 2px 12px rgba(0,0,0,0.15); }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.8rem; }
    li { display: flex; align-items: center; gap: 0.75rem; font-size: 1rem; font-weight: 500; }
    li mat-icon { width: 40px; height: 40px; font-size: 22px; display: grid; place-items: center; border-radius: 12px; background: rgba(255,255,255,0.16); flex-shrink: 0; line-height: 40px; text-align: center; }
    .mini-notebook { position: relative; margin-top: 0.75rem; padding: 1.3rem 1rem 1rem; border-radius: 16px; background: rgba(255,255,255,0.95); color: #0f172a; box-shadow: 0 24px 50px rgba(2, 6, 23, 0.3); transform: rotate(-2deg); max-width: 360px; }
    .mini-notebook::before { content: ''; position: absolute; top: -8px; inset-inline: 16px; height: 16px; background: repeating-linear-gradient(90deg, #1e293b 0 3px, transparent 3px 16px); }
    .mini-title { margin: 0 0 0.5rem; font-family: var(--display-font); font-size: 1.7rem; font-weight: 700; line-height: 1; }
    .mini-title small { font-size: 0.6em; color: #b7791f; }
    .mini-grid { position: relative; display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; font-size: 0.7rem; }
    .wd { font-weight: 700; color: #64748b; text-transform: uppercase; padding-bottom: 2px; }
    .d { height: 30px; padding: 2px 3px; font-weight: 700; border-top: 1px solid #e2e8f0; }
    .d.out { color: transparent; }
    .d.today { color: #b7791f; }
    .bar { position: absolute; height: 9px; border-radius: 3px; }
    .bar.a { background: #2563eb; top: 52px; left: 30%; width: 38%; }
    .bar.b { background: #7c3aed; top: 84px; left: 2%; width: 26%; }
    .bar.c { background: rgba(245, 158, 11, 0.45); outline: 1px dashed #f59e0b; top: 116px; left: 58%; width: 40%; }
  `]
})
export class AuthShowcaseComponent {
  readonly today = new Date().getDate();
  readonly month: string;
  readonly year = new Date().getFullYear();
  readonly weekdays: string[];
  /** The first five weeks of the month, empty days as 0 or less. */
  readonly days: number[];

  constructor(private uiPrefs: UiPreferencesService) {
    const now = new Date();
    const language = this.uiPrefs.getLanguage();
    this.month = getMonthLabel(now.getMonth(), language);
    this.weekdays = getWeekdayLabels(language);
    const offset = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7;
    const count = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    this.days = Array.from({ length: 28 }, (_, i) => i - offset + 1).map(d => (d > count ? 0 : d));
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }
}
