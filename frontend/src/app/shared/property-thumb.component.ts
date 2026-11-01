import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { imageUrl } from './image-utils';

/** Cover photo of a property in lists, with a neutral placeholder when it has no photo yet. */
@Component({
  selector: 'app-property-thumb',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <img *ngIf="src; else placeholder" [src]="src" alt="" loading="lazy" decoding="async" />
    <ng-template #placeholder><mat-icon aria-hidden="true">home</mat-icon></ng-template>
  `,
  styles: [`
    :host {
      display: grid; place-items: center; flex-shrink: 0; overflow: hidden;
      width: var(--thumb-w, 56px); aspect-ratio: var(--thumb-ratio, 4 / 3); border-radius: var(--thumb-radius, 10px);
      background: var(--surface-subtle); color: var(--text-secondary);
    }
    img { width: 100%; height: 100%; object-fit: cover; display: block; }
  `]
})
export class PropertyThumbComponent {
  @Input() set path(value: string | null | undefined) {
    this.src = imageUrl(value);
  }
  src: string | null = null;
}
