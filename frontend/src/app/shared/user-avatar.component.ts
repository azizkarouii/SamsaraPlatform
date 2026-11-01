import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { imageUrl } from './image-utils';

/** Round user picture: the profile photo when there is one, the initials otherwise. Decorative (name is shown next to it). */
@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <img *ngIf="src && !broken; else initialsTpl" [src]="src" alt="" (error)="broken = true" decoding="async" />
    <ng-template #initialsTpl><span>{{ initials }}</span></ng-template>
  `,
  styles: [`
    :host {
      display: inline-grid; place-items: center; flex-shrink: 0; overflow: hidden; border-radius: 50%;
      width: var(--avatar-size, 36px); height: var(--avatar-size, 36px);
      background: var(--avatar-bg, var(--primary)); color: var(--avatar-fg, var(--on-primary));
      font-weight: 700; font-size: calc(var(--avatar-size, 36px) * 0.36); line-height: 1;
    }
    img { width: 100%; height: 100%; object-fit: cover; display: block; }
  `]
})
export class UserAvatarComponent {
  @Input() set name(value: string | null | undefined) {
    this.initials = (value || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('') || '?';
  }

  @Input() set photo(value: string | null | undefined) {
    this.src = imageUrl(value);
    this.broken = false;
  }

  initials = '?';
  src: string | null = null;
  broken = false;
}
