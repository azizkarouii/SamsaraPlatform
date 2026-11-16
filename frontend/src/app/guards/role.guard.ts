import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { homeOf, worksWithSamsars } from '../models/auth.model';

/** The superadmin's pages. */
export const superAdminGuard: CanActivateFn = () => {
  const user = inject(AuthService).getCurrentUser();
  return user?.role === 'SUPERADMIN' ? true : inject(Router).parseUrl(homeOf(user));
};

/** The pages of owners and samsars: the superadmin has his own. */
export const memberGuard: CanActivateFn = () => {
  const user = inject(AuthService).getCurrentUser();
  return user?.role === 'SUPERADMIN' ? inject(Router).parseUrl('/admin') : true;
};

/** Samsar pages, hidden from an owner working alone. */
export const samsarsGuard: CanActivateFn = () => {
  const user = inject(AuthService).getCurrentUser();
  return worksWithSamsars(user) ? true : inject(Router).parseUrl(homeOf(user));
};
