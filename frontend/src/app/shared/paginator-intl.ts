import { Injectable, inject } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { UiPreferencesService } from '../services/ui-preferences.service';
import { t } from './translations';

/** Material paginator labels following the app language. */
@Injectable()
export class AppPaginatorIntl extends MatPaginatorIntl {
  private readonly uiPrefs = inject(UiPreferencesService);

  constructor() {
    super();
    this.uiPrefs.language$.subscribe(() => {
      const lang = this.uiPrefs.getLanguage();
      this.itemsPerPageLabel = t('items_per_page', lang);
      this.nextPageLabel = t('next', lang);
      this.previousPageLabel = t('previous', lang);
      this.firstPageLabel = t('first_page', lang);
      this.lastPageLabel = t('last_page', lang);
      this.changes.next();
    });
  }

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0) {
      return `0 / 0`;
    }
    const start = page * pageSize;
    const end = Math.min(start + pageSize, length);
    return `${start + 1} – ${end} / ${length}`;
  };
}
