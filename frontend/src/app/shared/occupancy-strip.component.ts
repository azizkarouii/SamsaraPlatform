import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OccupancyDay } from './house-occupancy';

/** The next days of a house as a row of small boxes: free, booked, pending, blocked; today circled. */
@Component({
  selector: 'app-occupancy-strip',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  template: `
    <div class="strip" role="img" [attr.aria-label]="label">
      <span *ngFor="let day of days" [class]="'cell ' + day.state" [class.today]="day.today" [class.weekend]="day.weekend"
            [matTooltip]="tip(day)">
        <b>{{ day.day }}</b>
      </span>
    </div>
  `,
  styles: [`
    .strip { display: grid; grid-template-columns: repeat(var(--strip-days, 14), minmax(0, 1fr)); gap: 3px; }
    .cell { height: 24px; border-radius: 5px; display: flex; align-items: center; justify-content: center; background: var(--surface-subtle); }
    .cell b { font-size: 0.62rem; font-weight: 600; color: var(--text-secondary); }
    .cell.weekend { background: var(--weekend); }
    .cell.in-progress { background: var(--status-in-progress); }
    .cell.confirmed { background: var(--status-confirmed); }
    .cell.completed { background: var(--status-completed); }
    .cell.in-progress b, .cell.confirmed b, .cell.completed b { color: #fff; }
    .cell.pending { background: var(--status-pending-bg); outline: 1px dashed var(--status-pending); outline-offset: -1px; }
    .cell.pending b { color: var(--status-pending); }
    .cell.blocked { background: repeating-linear-gradient(45deg, var(--surface-subtle) 0 3px, var(--status-completed-bg) 3px 6px); }
    .cell.today { box-shadow: 0 0 0 2px var(--accent-gold); }
  `]
})
export class OccupancyStripComponent {
  @Input() days: OccupancyDay[] = [];
  /** Translated texts: free, blocked and the statuses, keyed by state. */
  @Input() labels: Record<string, string> = {};
  @Input() label = '';

  tip(day: OccupancyDay): string {
    const date = day.iso.split('-').reverse().join('/');
    return `${date} · ${this.labels[day.state] ?? day.state}${day.client ? ' · ' + day.client : ''}`;
  }
}
