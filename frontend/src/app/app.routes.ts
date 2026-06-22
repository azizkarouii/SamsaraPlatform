import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { PropertyListComponent } from './pages/properties/property-list/property-list.component';
import { PropertyFormComponent } from './pages/properties/property-form/property-form.component';
import { PropertyDetailComponent } from './pages/properties/property-detail/property-detail.component';
import { ReservationListComponent } from './pages/reservations/reservation-list/reservation-list.component';
import { ReservationFormComponent } from './pages/reservations/reservation-form/reservation-form.component';
import { ReservationDetailComponent } from './pages/reservations/reservation-detail/reservation-detail.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { ProfileComponent } from './pages/profile/profile.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'public/properties/:id', component: PropertyDetailComponent, data: { publicView: true } },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'properties', component: PropertyListComponent },
      { path: 'properties/add', component: PropertyFormComponent },
      { path: 'properties/:id', component: PropertyDetailComponent },
      { path: 'properties/:id/edit', component: PropertyFormComponent },
      { path: 'reservations', component: ReservationListComponent },
      { path: 'reservations/add', component: ReservationFormComponent },
      { path: 'reservations/:id', component: ReservationDetailComponent },
      { path: 'reservations/:id/edit', component: ReservationFormComponent },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'profile', component: ProfileComponent },
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];
