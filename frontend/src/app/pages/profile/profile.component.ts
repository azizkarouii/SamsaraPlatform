import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { PropertyService } from '../../services/property.service';
import { ReservationService } from '../../services/reservation.service';
import { User } from '../../models/auth.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="profile-container" *ngIf="!loading; else loadingSpinner">
      <h1>Profile</h1>

      <div class="profile-grid">
        <mat-card class="profile-card">
          <mat-card-header>
            <mat-card-title>Account Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="profile-avatar">
              <mat-icon class="avatar-icon">account_circle</mat-icon>
              <span class="user-name">{{ user?.name }}</span>
              <span class="user-email">{{ user?.email }}</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stats-card">
          <mat-card-header>
            <mat-card-title>Statistics</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stat-row">
              <mat-icon>home</mat-icon>
              <span>{{ propertyCount }} Properties</span>
            </div>
            <div class="stat-row">
              <mat-icon>book_online</mat-icon>
              <span>{{ reservationCount }} Reservations</span>
            </div>
            <div class="stat-row">
              <mat-icon>payments</mat-icon>
              <span>{{ totalRevenue | currency:'TND':'symbol':'1.0-0' }} Revenue</span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="edit-card">
        <mat-card-header>
          <mat-card-title>Edit Profile</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="profileForm" (ngSubmit)="onUpdateProfile()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Phone (+216)</mat-label>
              <input matInput formControlName="phone" placeholder="+216 12345678" />
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit" [disabled]="saving">
              <mat-spinner *ngIf="saving" diameter="20" class="spinner"></mat-spinner>
              <span *ngIf="!saving">Save Changes</span>
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="actions">
        <button mat-raised-button color="warn" (click)="logout()">
          <mat-icon>logout</mat-icon> Logout
        </button>
      </div>
    </div>

    <ng-template #loadingSpinner>
      <div class="loading-container">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    </ng-template>
  `,
  styles: [`
    .profile-container {
      padding: 1.5rem;
      max-width: 800px;
    }
    h1 {
      margin-bottom: 1.5rem;
      font-weight: 500;
    }
    .profile-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .profile-avatar {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.5rem;
    }
    .avatar-icon {
      font-size: 5rem;
      width: 5rem;
      height: 5rem;
      color: #3f51b5;
      margin-bottom: 0.5rem;
    }
    .user-name {
      font-size: 1.25rem;
      font-weight: 500;
    }
    .user-email {
      color: rgba(0,0,0,0.6);
    }
    .stat-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0;
      color: rgba(0,0,0,0.7);
    }
    .stat-row mat-icon {
      color: #3f51b5;
    }
    .edit-card {
      margin-bottom: 1.5rem;
    }
    .full-width {
      width: 100%;
      margin-bottom: 1rem;
    }
    .spinner {
      display: inline-block;
      margin-right: 0.5rem;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
    }
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }
  `]
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  propertyCount = 0;
  reservationCount = 0;
  totalRevenue = 0;
  loading = true;
  saving = false;
  private pendingLoads = 0;

  profileForm = this.fb.group({
    name: [''],
    email: [''],
    phone: [''],
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private propertyService: PropertyService,
    private reservationService: ReservationService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (this.user) {
      this.profileForm.patchValue({
        name: this.user.name,
        email: this.user.email,
        phone: this.user.phone || '',
      });
    }
    this.loadStats();
  }

  private loadStats(): void {
    this.loading = true;
    this.pendingLoads = 2;

    this.propertyService.findMine().subscribe({
      next: (props) => {
        this.propertyCount = props.length;
        this.markLoaded();
      },
      error: () => this.markLoaded(),
    });

    this.reservationService.findMine().subscribe({
      next: (res) => {
        this.reservationCount = res.length;
        this.totalRevenue = res.reduce((sum, r) => sum + r.totalAmount, 0);
        this.markLoaded();
      },
      error: () => this.markLoaded(),
    });
  }

  private markLoaded(): void {
    this.pendingLoads = Math.max(0, this.pendingLoads - 1);
    if (this.pendingLoads === 0) {
      this.loading = false;
    }
  }

  onUpdateProfile(): void {
    this.saving = true;
    this.authService.getProfile().subscribe({
      next: (user) => {
        this.user = user;
        localStorage.setItem('user', JSON.stringify(user));
        this.snackBar.open('Profile updated', 'Close', { duration: 3000 });
        this.saving = false;
      },
      error: (err) => {
        this.saving = false;
        this.snackBar.open(err.error?.message || 'Failed to update profile', 'Close', { duration: 3000 });
      },
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
