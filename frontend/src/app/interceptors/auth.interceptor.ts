import { AuthService } from '../services/auth.service';
import { UiPreferencesService } from '../services/ui-preferences.service';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // The session is an HttpOnly cookie, sent with credentials. The extra header tells the server the call comes
  // from the app: another site cannot add it, so it cannot use the cookie behind the user's back.
  req = req.clone({
    withCredentials: true,
    setHeaders: {
      'Accept-Language': inject(UiPreferencesService).getLanguage(),
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.endsWith('/auth/login')) {
        authService.clearLocalSession();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
