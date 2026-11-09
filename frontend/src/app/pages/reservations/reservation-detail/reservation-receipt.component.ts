import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { UiPreferencesService } from '../../../services/ui-preferences.service';
import { Reservation, ReservationPayment, countReservationDays } from '../../../models/reservation.model';
import { t } from '../../../shared/translations';

/**
 * Receipt for the client, hidden on screen: "Receipt (PDF)" prints the page, and only this shows on paper.
 * It holds what the client pays and has paid, never how the money is shared between owner and samsar.
 */
@Component({
  selector: 'app-reservation-receipt',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="receipt">
      <header>
        <div class="brand">
          <img src="assets/brand/logo-icon.png" alt="" />
        </div>
        <div class="title">
          <h1>{{ t('receipt_title') }}</h1>
          <span>#{{ reservation.id }} · {{ t('receipt_issued_on') }} {{ issuedOn | date:'dd/MM/yyyy' }}</span>
        </div>
      </header>

      <section class="columns">
        <div>
          <h2>{{ t('client') }}</h2>
          <p><strong>{{ reservation.clientName }}</strong></p>
          <p *ngIf="reservation.clientPhone"><span class="ltr">+216 {{ reservation.clientPhone }}</span></p>
        </div>
        <div>
          <h2>{{ t('property_label') }}</h2>
          <p><strong>{{ reservation.property?.title }}</strong></p>
          <p *ngIf="reservation.property?.address as address">{{ address }}</p>
        </div>
      </section>

      <section>
        <h2>{{ t('receipt_stay') }}</h2>
        <table>
          <tr><td>{{ t('arrival') }}</td><td>{{ reservation.startDate | date:'dd/MM/yyyy' }} · {{ reservation.checkInTime }}</td></tr>
          <tr><td>{{ t('departure') }}</td><td>{{ reservation.endDate | date:'dd/MM/yyyy' }} · {{ reservation.checkOutTime }}</td></tr>
          <tr><td>{{ t('days_count') }}</td><td>{{ days }}</td></tr>
        </table>
      </section>

      <section>
        <h2>{{ t('payments') }}</h2>
        <table class="money">
          <tr *ngFor="let payment of payments">
            <td>{{ payment.paidOn | date:'dd/MM/yyyy' }} · {{ label(payment) }}</td>
            <td>{{ payment.amount | number:'1.2-2' }} TND</td>
          </tr>
          <tr class="sum"><td>{{ t('total_amount_label') }}</td><td>{{ reservation.totalAmount | number:'1.2-2' }} TND</td></tr>
          <tr><td>{{ t('paid_so_far') }}</td><td>{{ paid | number:'1.2-2' }} TND</td></tr>
          <tr *ngIf="givenBack > 0"><td>{{ t('money_given_back') }}</td><td>- {{ givenBack | number:'1.2-2' }} TND</td></tr>
          <tr class="sum"><td>{{ t('still_to_pay') }}</td><td>{{ remaining | number:'1.2-2' }} TND</td></tr>
        </table>
      </section>

      <footer>
        <span>{{ t('receipt_issued_by') }} {{ issuer?.name }}<ng-container *ngIf="issuer?.phone as phone"> · <span class="ltr">+216 {{ phone }}</span></ng-container></span>
        <span>{{ t('receipt_thanks') }}</span>
      </footer>
    </article>
  `,
  styles: [`
    :host { display: none; }
    @media print {
      :host { display: block; }
    }
    .receipt { color: #111; font-size: 12pt; max-width: 720px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding-bottom: 1rem; border-bottom: 2px solid #15803d; }
    .brand { display: flex; align-items: center; }
    .brand img { width: 48px; height: 48px; object-fit: contain; }
    .title { text-align: end; }
    .title h1 { margin: 0; font-size: 18pt; }
    .title span { font-size: 10pt; color: #555; }
    section { margin-top: 1.25rem; }
    h2 { margin: 0 0 0.4rem; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.05em; color: #555; }
    p { margin: 0.15rem 0; }
    .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 0.35rem 0; border-bottom: 1px solid #ddd; }
    td:last-child { text-align: end; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .money .sum td { font-weight: 700; border-bottom: 2px solid #111; }
    footer { display: flex; justify-content: space-between; gap: 1rem; margin-top: 2rem; font-size: 10pt; color: #555; }
    .ltr { direction: ltr; unicode-bidi: embed; }
  `]
})
export class ReservationReceiptComponent {
  @Input({ required: true }) reservation!: Reservation;
  @Input() payments: ReservationPayment[] = [];
  @Input() paid = 0;
  @Input() remaining = 0;

  readonly issuedOn = new Date();

  constructor(private authService: AuthService, private uiPrefs: UiPreferencesService) {}

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  get issuer() {
    return this.authService.getCurrentUser();
  }

  get days(): number {
    return countReservationDays(this.reservation.startDate, this.reservation.endDate);
  }

  /** Money returned to the client, by the owner and by the samsar. */
  get givenBack(): number {
    return (this.reservation.refundAmount || 0) + (this.reservation.samsarRefundAmount || 0);
  }

  label(payment: ReservationPayment): string {
    if (payment.kind === 'advance') return this.t('advance_paid');
    if (payment.kind === 'balance') return this.t('balance_paid_on_arrival_short');
    return payment.note || this.t('payment');
  }
}
