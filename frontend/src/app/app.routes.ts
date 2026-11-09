import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';

// Every page is its own bundle, loaded when first opened
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent), canActivate: [loginGuard] },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent), canActivate: [loginGuard] },
  { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent), canActivate: [loginGuard] },
  { path: 'verify-email', loadComponent: () => import('./pages/verify-email/verify-email.component').then(m => m.VerifyEmailComponent) },
  { path: 'reset-password', loadComponent: () => import('./pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
  {
    path: 'public/properties/:id',
    loadComponent: () => import('./pages/properties/property-detail/property-detail.component').then(m => m.PropertyDetailComponent),
    data: { publicView: true },
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'properties', loadComponent: () => import('./pages/properties/property-list/property-list.component').then(m => m.PropertyListComponent) },
      { path: 'properties/add', loadComponent: () => import('./pages/properties/property-form/property-form.component').then(m => m.PropertyFormComponent) },
      { path: 'properties/:id', loadComponent: () => import('./pages/properties/property-detail/property-detail.component').then(m => m.PropertyDetailComponent) },
      { path: 'properties/:id/edit', loadComponent: () => import('./pages/properties/property-form/property-form.component').then(m => m.PropertyFormComponent) },
      { path: 'reservations', loadComponent: () => import('./pages/reservations/reservation-list/reservation-list.component').then(m => m.ReservationListComponent) },
      { path: 'reservations/add', loadComponent: () => import('./pages/reservations/reservation-form/reservation-form.component').then(m => m.ReservationFormComponent) },
      { path: 'reservations/:id', loadComponent: () => import('./pages/reservations/reservation-detail/reservation-detail.component').then(m => m.ReservationDetailComponent) },
      { path: 'reservations/:id/edit', loadComponent: () => import('./pages/reservations/reservation-form/reservation-form.component').then(m => m.ReservationFormComponent) },
      { path: 'shared-houses', loadComponent: () => import('./pages/shared-houses/shared-houses.component').then(m => m.SharedHousesComponent) },
      { path: 'planning', loadComponent: () => import('./pages/planning/planning.component').then(m => m.PlanningComponent) },
      { path: 'availability', loadComponent: () => import('./pages/availability/availability.component').then(m => m.AvailabilityComponent) },
      { path: 'notifications', loadComponent: () => import('./pages/notifications/notifications.component').then(m => m.NotificationsComponent) },
      { path: 'reports', loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent) },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent) },
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];
