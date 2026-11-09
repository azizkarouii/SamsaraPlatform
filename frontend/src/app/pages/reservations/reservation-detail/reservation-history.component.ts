import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { UiPreferencesService } from '../../../services/ui-preferences.service';
import { ReservationEvent, statusKey } from '../../../models/reservation.model';
import { t } from '../../../shared/translations';

/** Who did what on a booking, in the reader's language. */
@Component({
  selector: 'app-reservation-history',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card>
      <mat-card-content>
        <h3>{{ t('history') }}</h3>
        <ol class="history">
          <li *ngFor="let event of events">
            <span class="when">{{ event.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
            <span>{{ describe(event) }}</span>
          </li>
        </ol>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    h3 { margin: 1rem 0 0.25rem; font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); }
    .history { list-style: none; margin: 0.5rem 0 0; padding: 0; display: grid; gap: 0.4rem; }
    .history li { display: flex; flex-direction: column; font-size: 0.85rem; }
    .history .when { font-size: 0.8rem; color: var(--text-secondary); }
  `]
})
export class ReservationHistoryComponent {
  @Input() events: ReservationEvent[] = [];

  constructor(private uiPrefs: UiPreferencesService) {}

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  /** One line of the history, in the reader's language. */
  describe(event: ReservationEvent): string {
    let details: Record<string, unknown> = {};
    try {
      details = JSON.parse(event.details || '{}');
    } catch {
      details = {};
    }
    const who = event.actorName || this.t('history_system');
    const status = (value: unknown) => this.t(statusKey(String(value)));
    const amount = (value: unknown) => `${Number(value || 0).toLocaleString(this.locale)} TND`;
    const date = (value: unknown) => String(value || '').split('-').reverse().join('/');
    const text = this.t('history_' + event.action)
      .replace('{{actor}}', who)
      .replace('{{to}}', status(details['to']))
      .replace('{{from}}', status(details['from']))
      .replace('{{amount}}', amount(details['amount']))
      .replace('{{total}}', amount(details['total']))
      .replace('{{newEnd}}', date(details['to']))
      .replace('{{plannedEnd}}', date(details['from']));
    return text.startsWith('history_') ? `${who} — ${event.action}` : text;
  }

  private get locale(): string {
    return { fr: 'fr-FR', en: 'en-GB', ar: 'ar-TN' }[this.uiPrefs.getLanguage()] ?? 'fr-FR';
  }
}
