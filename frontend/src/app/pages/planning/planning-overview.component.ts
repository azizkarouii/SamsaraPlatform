import { AfterViewInit, Component, ElementRef, Input, NgZone, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanningOverview } from '../../models/reservation.model';
import { UiPreferencesService } from '../../services/ui-preferences.service';
import { t } from '../../shared/translations';
import { getShortMonthLabel, todayIso } from '../../shared/calendar-utils';
import { addDays, daysBetween, startOfWeek } from './planning-utils';

/** label and value left empty on every other month when the chart is too narrow for all of them. */
interface Point { x: number; y: number; value: number; label: string; year?: string; current: boolean; occupancy: number }
interface DotMonth { label: string; weeks: { iso: string; level: number; today: boolean; inMonth: boolean }[][] }

const HEIGHT = 150;
const PAD = 24;

/** The year ahead at a glance: booked nights month by month (curve), or every booked day (dots). */
@Component({
  selector: 'app-planning-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="overview">
      <div class="overview-head">
        <p class="overview-title">
          <strong>{{ t(mode === 'month' ? 'planning_months_ahead' : 'planning_days_ahead') }}</strong>
          <span class="pill" *ngIf="overview.toConfirmCount"><i class="dot pending"></i>{{ overview.toConfirmCount }} {{ t('planning_to_confirm_short') }}</span>
          <span class="muted">{{ totalNights }} {{ t('planning_nights_booked') }}</span>
        </p>
        <div class="segmented" role="group">
          <button type="button" [class.active]="mode === 'day'" (click)="mode = 'day'">{{ t('planning_day_by_day') }}</button>
          <button type="button" [class.active]="mode === 'month'" (click)="mode = 'month'">{{ t('planning_month_by_month') }}</button>
        </div>
      </div>

      <div class="chart" *ngIf="mode === 'month'">
        <svg [attr.viewBox]="'0 0 ' + width + ' ' + (height + 34)" [attr.width]="width" [attr.height]="height + 34" role="img" [attr.aria-label]="t('planning_months_ahead')">
          <rect *ngFor="let p of points" [attr.x]="p.x - step / 2" y="0" [attr.width]="step" [attr.height]="height"
                [class]="p.current ? 'band current' : 'band'"></rect>
          <line [attr.x1]="pad" [attr.x2]="width - pad" [attr.y1]="height" [attr.y2]="height" class="axis"></line>
          <path [attr.d]="area" class="area"></path>
          <path [attr.d]="occupancyLine" class="occupancy"></path>
          <path [attr.d]="line" class="line"></path>
          <g *ngFor="let p of points">
            <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3.5" class="point"></circle>
            <text *ngIf="p.value" [attr.x]="p.x" [attr.y]="p.y - 9" class="value">{{ p.value }}</text>
            <text [attr.x]="p.x" [attr.y]="height + 16" [class]="p.current ? 'month current' : 'month'">{{ p.label }}</text>
            <text *ngIf="p.year" [attr.x]="p.x" [attr.y]="height + 29" class="year">{{ p.year }}</text>
          </g>
        </svg>
        <div class="legend">
          <span><i class="swatch line"></i>{{ t('planning_nights_booked') }}</span>
          <span><i class="swatch dashed"></i>{{ t('planning_occupancy_rate') }}</span>
          <span><i class="swatch band"></i>{{ t('planning_this_month') }}</span>
        </div>
      </div>

      <div class="dots" *ngIf="mode === 'day'">
        <div class="dot-month" *ngFor="let month of dotMonths">
          <span class="dot-label">{{ month.label }}</span>
          <div class="dot-grid">
            <div class="dot-week" *ngFor="let week of month.weeks">
              <i *ngFor="let day of week" [class]="'d l' + day.level" [class.today]="day.today" [class.out]="!day.inMonth"
                 [attr.title]="day.inMonth ? day.iso : null"></i>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .overview { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 18px; padding: 1rem 1.25rem; box-shadow: var(--shadow-sm); }
    .overview-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; }
    .overview-title { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; margin: 0; font-size: 0.9rem; }
    .pill { display: inline-flex; align-items: center; gap: 0.35rem; color: var(--note-text); font-weight: 600; }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dot.pending { background: var(--status-pending); }
    .muted { color: var(--text-secondary); }

    .chart { margin-top: 0.5rem; }
    .chart svg { display: block; max-width: 100%; overflow: visible; }
    .band { fill: transparent; }
    .band.current { fill: var(--accent-gold-soft); }
    .axis { stroke: var(--border-color); }
    .area { fill: var(--primary-soft); }
    .line { fill: none; stroke: var(--primary-strong); stroke-width: 2.5; vector-effect: non-scaling-stroke; }
    .occupancy { fill: none; stroke: var(--text-secondary); stroke-width: 1.5; stroke-dasharray: 5 5; vector-effect: non-scaling-stroke; }
    .point { fill: var(--bg-card); stroke: var(--primary-strong); stroke-width: 2; vector-effect: non-scaling-stroke; }
    text { font-size: 12px; text-anchor: middle; fill: var(--text-secondary); }
    text.value { font-weight: 700; fill: var(--text-primary); }
    text.month.current { fill: var(--accent-gold); font-weight: 700; }
    text.year { font-size: 10px; }
    .legend { display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.25rem; }
    .legend span { display: inline-flex; align-items: center; gap: 0.4rem; }
    .swatch { display: inline-block; width: 18px; height: 0; border-top: 2.5px solid var(--primary-strong); }
    .swatch.dashed { border-top: 1.5px dashed var(--text-secondary); }
    .swatch.band { width: 12px; height: 12px; border: 1px solid var(--accent-gold); background: var(--accent-gold-soft); border-radius: 3px; }

    .dots { display: flex; justify-content: space-between; gap: 1rem; overflow-x: auto; padding: 0.75rem 0 0.25rem; }
    .dot-month { display: flex; flex-direction: column; gap: 0.35rem; flex-shrink: 0; }
    .dot-label { font-size: 0.75rem; font-weight: 600; }
    .dot-grid { display: flex; gap: 4px; }
    .dot-week { display: grid; grid-template-rows: repeat(7, 12px); gap: 4px; }
    .d { width: 12px; height: 12px; border-radius: 50%; display: block; margin: auto; }
    .d.l0 { width: 4px; height: 4px; background: var(--border-color); }
    .d.l1 { width: 7px; height: 7px; background: var(--primary-strong); opacity: 0.55; }
    .d.l2 { width: 10px; height: 10px; background: var(--primary-strong); opacity: 0.8; }
    .d.l3 { background: var(--primary-strong); }
    .d.out { visibility: hidden; }
    .d.today { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  `]
})
export class PlanningOverviewComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input({ required: true }) overview!: PlanningOverview;

  mode: 'month' | 'day' = 'month';
  points: Point[] = [];
  dotMonths: DotMonth[] = [];
  line = '';
  area = '';
  occupancyLine = '';
  totalNights = 0;
  /** The chart is drawn at the width it really has, so its texts and dots keep their shape. */
  width = 900;
  readonly height = HEIGHT;
  readonly pad = PAD;
  step = 0;

  private resize?: ResizeObserver;

  constructor(private uiPrefs: UiPreferencesService, private host: ElementRef<HTMLElement>, private zone: NgZone) {}

  ngAfterViewInit(): void {
    const section = this.host.nativeElement.querySelector('.overview') as HTMLElement;
    this.resize = new ResizeObserver(entries => {
      const width = Math.round(entries[0].contentRect.width);
      if (width > 0 && Math.abs(width - this.width) > 2) {
        this.zone.run(() => {
          this.width = width;
          this.drawCurve();
        });
      }
    });
    this.resize.observe(section);
  }

  ngOnDestroy(): void {
    this.resize?.disconnect();
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  ngOnChanges(): void {
    this.totalNights = this.overview.months.reduce((sum, m) => sum + m.nights, 0);
    this.drawCurve();
    this.buildDots(this.uiPrefs.getLanguage());
  }

  private drawCurve(): void {
    const months = this.overview.months;
    const language = this.uiPrefs.getLanguage();
    const max = Math.max(1, ...months.map(m => m.nights));
    this.step = (this.width - 2 * PAD) / months.length;
    const top = 22;
    const today = todayIso();
    const roomy = this.step >= 46;
    this.points = months.map((m, i) => {
      const [year, month] = m.month.split('-').map(Number);
      const shown = roomy || i % 2 === 0;
      return {
        x: PAD + this.step * (i + 0.5),
        y: HEIGHT - (m.nights / max) * (HEIGHT - top),
        value: shown ? m.nights : 0,
        label: shown ? getShortMonthLabel(month - 1, language) : '',
        year: shown && (month === 1 || i === 0) ? String(year) : undefined,
        current: m.month === today.slice(0, 7),
        occupancy: m.capacity ? m.nights / m.capacity : 0,
      };
    });
    this.line = this.points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
    const first = this.points[0];
    const last = this.points[this.points.length - 1];
    this.area = first ? `${this.line} L${last.x},${HEIGHT} L${first.x},${HEIGHT} Z` : '';
    this.occupancyLine = this.points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${HEIGHT - p.occupancy * (HEIGHT - top)}`).join(' ');
  }

  /** One block per month, a column per week, a dot per day: bigger as more houses are booked. */
  private buildDots(language: 'fr' | 'en' | 'ar'): void {
    const houses = Math.max(1, this.overview.houseCount);
    const today = todayIso();
    this.dotMonths = this.overview.months.map(m => {
      const [year, month] = m.month.split('-').map(Number);
      const first = `${m.month}-01`;
      const last = `${m.month}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
      const weeks: DotMonth['weeks'] = [];
      for (let monday = startOfWeek(first); monday <= last; monday = addDays(monday, 7)) {
        weeks.push(daysBetween(monday, addDays(monday, 6)).map(iso => {
          const booked = this.overview.bookedHousesByDay[iso] || 0;
          const ratio = booked / houses;
          return { iso, today: iso === today, inMonth: iso >= first && iso <= last, level: booked === 0 ? 0 : ratio < 0.34 ? 1 : ratio < 0.67 ? 2 : 3 };
        }));
      }
      return { label: getShortMonthLabel(month - 1, language), weeks };
    });
  }
}
