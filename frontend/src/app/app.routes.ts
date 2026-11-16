import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';
import { memberGuard, samsarsGuard, superAdminGuard } from './guards/role.guard';

// Every page is its own bundle, loaded when first opened
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent), canActivate: [loginGuard] },
  { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent), canActivate: [loginGuard] },
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
      { path: 'admin', loadComponent: () => import('./pages/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [superAdminGuard] },
      { path: 'admin/accounts', loadComponent: () => import('./pages/admin/admin-accounts.component').then(m => m.AdminAccountsComponent), canActivate: [superAdminGuard] },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [memberGuard] },
      { path: 'properties', loadComponent: () => import('./pages/properties/property-list/property-list.component').then(m => m.PropertyListComponent), canActivate: [memberGuard] },
      { path: 'properties/add', loadComponent: () => import('./pages/properties/property-form/property-form.component').then(m => m.PropertyFormComponent), canActivate: [memberGuard] },
      { path: 'properties/:id', loadComponent: () => import('./pages/properties/property-detail/property-detail.component').then(m => m.PropertyDetailComponent), canActivate: [memberGuard] },
      { path: 'properties/:id/edit', loadComponent: () => import('./pages/properties/property-form/property-form.component').then(m => m.PropertyFormComponent), canActivate: [memberGuard] },
      { path: 'reservations', loadComponent: () => import('./pages/reservations/reservation-list/reservation-list.component').then(m => m.ReservationListComponent), canActivate: [memberGuard] },
      { path: 'reservations/add', loadComponent: () => import('./pages/reservations/reservation-form/reservation-form.component').then(m => m.ReservationFormComponent), canActivate: [memberGuard] },
      { path: 'reservations/:id', loadComponent: () => import('./pages/reservations/reservation-detail/reservation-detail.component').then(m => m.ReservationDetailComponent), canActivate: [memberGuard] },
      { path: 'reservations/:id/edit', loadComponent: () => import('./pages/reservations/reservation-form/reservation-form.component').then(m => m.ReservationFormComponent), canActivate: [memberGuard] },
      { path: 'shared-houses', loadComponent: () => import('./pages/shared-houses/shared-houses.component').then(m => m.SharedHousesComponent), canActivate: [memberGuard, samsarsGuard] },
      { path: 'planning', loadComponent: () => import('./pages/planning/planning.component').then(m => m.PlanningComponent), canActivate: [memberGuard] },
      { path: 'availability', loadComponent: () => import('./pages/availability/availability.component').then(m => m.AvailabilityComponent), canActivate: [memberGuard] },
      { path: 'notifications', loadComponent: () => import('./pages/notifications/notifications.component').then(m => m.NotificationsComponent), canActivate: [memberGuard] },
      { path: 'reports', loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent), canActivate: [memberGuard] },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent) },
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];
