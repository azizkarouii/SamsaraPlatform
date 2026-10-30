import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

/**
 * The native adapter relies on Date.parse, which reads "20/11/2026" as invalid (or as US month/day).
 * Typed dates follow the French dd/MM/yyyy convention used everywhere in the app.
 */
@Injectable()
export class FrDateAdapter extends NativeDateAdapter {
  override parse(value: unknown, parseFormat?: unknown): Date | null {
    if (typeof value === 'string') {
      const match = value.trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
      if (match) {
        const [, day, month, year] = match.map(Number);
        const date = new Date(year, month - 1, day);
        // Reject impossible dates such as 31/02/2026
        return date.getMonth() === month - 1 && date.getDate() === day ? date : this.invalid();
      }
    }
    return super.parse(value, parseFormat);
  }

  override getFirstDayOfWeek(): number {
    return 1;
  }
}
