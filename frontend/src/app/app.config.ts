import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MAT_NATIVE_DATE_FORMATS } from '@angular/material/core';
import { FrDateAdapter } from './shared/fr-date-adapter';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { AppPaginatorIntl } from './shared/paginator-intl';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

// Tunisian conventions: dd/MM/yyyy dates and "1 080" amounts
registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
    { provide: DateAdapter, useClass: FrDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MAT_NATIVE_DATE_FORMATS },
    { provide: MatPaginatorIntl, useClass: AppPaginatorIntl },
  ]
};
