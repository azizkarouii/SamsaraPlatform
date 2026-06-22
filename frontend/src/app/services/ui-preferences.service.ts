import { Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark';
export type AppLanguage = 'fr' | 'en' | 'ar';

@Injectable({
  providedIn: 'root'
})
export class UiPreferencesService {
  private readonly themeKey = 'samsara-theme';
  private readonly languageKey = 'samsara-language';
  private readonly themeSubject = new BehaviorSubject<ThemeMode>(this.readTheme());
  private readonly languageSubject = new BehaviorSubject<AppLanguage>(this.readLanguage());
  private readonly documentRef = inject(DOCUMENT);

  readonly theme$ = this.themeSubject.asObservable();
  readonly language$ = this.languageSubject.asObservable();

  constructor() {
    this.applyTheme(this.themeSubject.value);
    this.applyLanguage(this.languageSubject.value);
  }

  toggleTheme(): void {
    this.setTheme(this.themeSubject.value === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: ThemeMode): void {
    this.themeSubject.next(theme);
    localStorage.setItem(this.themeKey, theme);
    this.applyTheme(theme);
  }

  toggleLanguage(): void {
    const next: Record<AppLanguage, AppLanguage> = { fr: 'en', en: 'ar', ar: 'fr' };
    this.setLanguage(next[this.languageSubject.value]);
  }

  setLanguage(language: AppLanguage): void {
    this.languageSubject.next(language);
    localStorage.setItem(this.languageKey, language);
    this.applyLanguage(language);
  }

  getTheme(): ThemeMode {
    return this.themeSubject.value;
  }

  getLanguage(): AppLanguage {
    return this.languageSubject.value;
  }

  private readTheme(): ThemeMode {
    return (localStorage.getItem(this.themeKey) as ThemeMode) || 'light';
  }

  private readLanguage(): AppLanguage {
    return (localStorage.getItem(this.languageKey) as AppLanguage) || 'fr';
  }

  private applyTheme(theme: ThemeMode): void {
    const root = this.documentRef.documentElement;
    root.classList.toggle('dark-theme', theme === 'dark');
    root.dataset['theme'] = theme;
  }

  private applyLanguage(language: AppLanguage): void {
    const root = this.documentRef.documentElement;
    root.lang = language;
    root.dir = language === 'ar' ? 'rtl' : 'ltr';
  }
}