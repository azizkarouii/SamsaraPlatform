import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { ThemeMode, UiPreferencesService } from '../services/ui-preferences.service';
import { AppLanguage, t } from './translations';

/** Language menu + light/dark toggle, for pages displayed outside the main layout (login...). */
@Component({
  selector: 'app-ui-preferences-controls',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  template: `
    <button mat-icon-button type="button" [matMenuTriggerFor]="languageMenu"
            [matTooltip]="t('language')" [attr.aria-label]="t('language')">
      <mat-icon>translate</mat-icon>
    </button>
    <mat-menu #languageMenu="matMenu">
      <button mat-menu-item *ngFor="let lang of languages" (click)="prefs.setLanguage(lang.code)"
              role="menuitemradio" [attr.aria-checked]="language === lang.code">
        <mat-icon>{{ language === lang.code ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>
        <span>{{ lang.label }}</span>
      </button>
    </mat-menu>

    <button mat-icon-button type="button" (click)="prefs.toggleTheme()"
            [matTooltip]="t(theme === 'dark' ? 'light_mode' : 'dark_mode')"
            [attr.aria-label]="t(theme === 'dark' ? 'light_mode' : 'dark_mode')">
      <mat-icon>{{ theme === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
  styles: [`
    :host { display: inline-flex; gap: 4px; }
  `]
})
export class UiPreferencesControlsComponent implements OnDestroy {
  readonly languages: { code: AppLanguage; label: string }[] = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
    { code: 'ar', label: 'العربية' },
  ];
  language: AppLanguage;
  theme: ThemeMode;
  private readonly subscriptions: Subscription[] = [];

  constructor(public prefs: UiPreferencesService) {
    this.language = prefs.getLanguage();
    this.theme = prefs.getTheme();
    this.subscriptions.push(
      prefs.language$.subscribe(language => this.language = language),
      prefs.theme$.subscribe(theme => this.theme = theme),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  t(key: string): string {
    return t(key, this.language);
  }
}
