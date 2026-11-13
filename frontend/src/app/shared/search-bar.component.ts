import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

/**
 * Search field of the lists: examples of what can be searched roll in while it is empty, "/" puts the cursor
 * in it from anywhere on the page, Escape clears it, and the number of results follows the typing.
 */
@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <label class="bar" [class.focused]="focused" [class.filled]="!!value">
      <mat-icon class="lens" aria-hidden="true">search</mat-icon>
      <span class="field">
        <input #input type="search" [value]="value" [attr.aria-label]="label" autocomplete="off" spellcheck="false"
               (input)="onInput($any($event.target).value)" (focus)="focused = true" (blur)="focused = false"
               (keydown.escape)="clear()" />
        <span class="hint" *ngIf="!value" aria-hidden="true">
          <span class="hint-label">{{ label }}</span>
          <span class="hint-example" *ngIf="hints.length" [class.out]="swapping">« {{ hints[hintIndex] }} »</span>
        </span>
      </span>
      <span class="count" *ngIf="count !== null && count !== undefined && value" [attr.aria-live]="'polite'">
        <b [class.pop]="popping">{{ count }}</b> {{ count === 1 && countLabelOne ? countLabelOne : countLabel }}
      </span>
      <button type="button" class="clear" *ngIf="value" (click)="clear(); input.focus()" [attr.aria-label]="clearLabel">
        <mat-icon>close</mat-icon>
      </button>
      <kbd *ngIf="!value && !focused" aria-hidden="true">/</kbd>
      <span class="busy" *ngIf="busy" aria-hidden="true"></span>
    </label>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .bar {
      position: relative; display: flex; align-items: center; gap: 0.5rem; height: 48px; padding: 0 0.6rem 0 1rem;
      border: 1px solid var(--border-color); border-radius: 999px; background: var(--bg-card); cursor: text; overflow: hidden;
      box-shadow: var(--shadow-sm); transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
    }
    .bar:hover { border-color: color-mix(in srgb, var(--primary) 45%, var(--border-color)); }
    .bar.focused { border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-soft), var(--shadow-md); transform: translateY(-1px); }
    .lens { color: var(--text-secondary); transition: color 0.2s ease, transform 0.3s ease; flex-shrink: 0; }
    .bar.focused .lens { color: var(--primary); transform: scale(1.12) rotate(-8deg); }
    .bar.filled .lens { color: var(--primary-strong); }
    .field { position: relative; flex: 1; min-width: 0; height: 100%; display: flex; align-items: center; }
    input { width: 100%; height: 100%; border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 0.95rem; position: relative; z-index: 1; }
    input::-webkit-search-cancel-button { display: none; }
    .hint { position: absolute; inset: 0; display: flex; align-items: center; gap: 0.4rem; pointer-events: none; white-space: nowrap; overflow: hidden; color: var(--text-secondary); font-size: 0.95rem; }
    .hint-example { color: color-mix(in srgb, var(--text-secondary) 70%, transparent); font-style: italic; transition: opacity 0.25s ease, transform 0.25s ease; }
    .hint-example.out { opacity: 0; transform: translateY(6px); }
    .bar.focused .hint-label { opacity: 0.7; }
    .count { flex-shrink: 0; font-size: 0.78rem; color: var(--text-secondary); padding: 2px 10px; border-radius: 999px; background: var(--surface-subtle); white-space: nowrap; }
    .count b { display: inline-block; color: var(--text-primary); }
    .count b.pop { animation: pop 0.3s ease; }
    @keyframes pop { 40% { transform: scale(1.35); color: var(--primary); } }
    .clear { flex-shrink: 0; width: 32px; height: 32px; border: 0; border-radius: 50%; display: grid; place-items: center; cursor: pointer; background: var(--surface-subtle); color: var(--text-secondary); animation: grow 0.18s ease; }
    .clear:hover { background: var(--primary-soft); color: var(--primary); }
    .clear mat-icon { font-size: 18px; width: 18px; height: 18px; }
    @keyframes grow { from { transform: scale(0.4); opacity: 0; } }
    kbd { flex-shrink: 0; min-width: 24px; height: 24px; display: grid; place-items: center; border: 1px solid var(--border-color); border-bottom-width: 2px; border-radius: 6px; font: inherit; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); background: var(--surface-subtle); margin-inline-end: 0.3rem; }
    .busy { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; overflow: hidden; }
    .busy::after { content: ''; position: absolute; inset: 0; width: 35%; background: var(--primary); border-radius: 2px; animation: slide 1s ease-in-out infinite; }
    @keyframes slide { from { transform: translateX(-100%); } to { transform: translateX(300%); } }
    @media (prefers-reduced-motion: reduce) {
      .bar, .lens, .hint-example { transition: none; }
      .count b.pop, .clear, .busy::after { animation: none; }
    }
  `]
})
export class SearchBarComponent implements OnInit, OnDestroy {
  @Input() value = '';
  /** What can be searched, said in the field ("Search a house or a client…"). */
  @Input() label = '';
  /** Examples rolling after the label while the field is empty. */
  @Input() hints: string[] = [];
  /** Number of results, shown once something is typed (null: not shown). */
  @Input() count: number | null = null;
  @Input() countLabel = '';
  /** Said after a single result ("1 house"); countLabel otherwise. */
  @Input() countLabelOne = '';
  @Input() clearLabel = 'Effacer';
  /** A thin bar slides under the field while the results load. */
  @Input() busy = false;
  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('input', { static: true }) input!: ElementRef<HTMLInputElement>;

  focused = false;
  hintIndex = 0;
  swapping = false;
  popping = false;
  private timer?: ReturnType<typeof setInterval>;
  private lastCount: number | null = null;

  ngOnInit(): void {
    this.timer = setInterval(() => this.nextHint(), 2800);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  /** "/" anywhere on the page, but not while typing in another field. */
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const typing = !!target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
    if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      this.input.nativeElement.focus();
    }
  }

  ngDoCheck(): void {
    // A short bounce of the number each time the results change
    if (this.count !== this.lastCount) {
      this.lastCount = this.count;
      this.popping = false;
      setTimeout(() => this.popping = true);
    }
  }

  onInput(value: string): void {
    this.value = value;
    this.valueChange.emit(value);
  }

  clear(): void {
    if (!this.value) return;
    this.onInput('');
  }

  private nextHint(): void {
    if (this.hints.length < 2 || this.value || this.focused) return;
    this.swapping = true;
    setTimeout(() => {
      this.hintIndex = (this.hintIndex + 1) % this.hints.length;
      this.swapping = false;
    }, 250);
  }
}
