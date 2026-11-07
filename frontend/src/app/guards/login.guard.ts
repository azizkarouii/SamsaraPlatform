import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const loginGuard: CanActivateFn = () => {
  if (inject(AuthService).isLoggedIn()) {
    inject(Router).navigate(['/dashboard']);
    return false;
  }
  return true;
};
