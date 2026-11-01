import { Component, ElementRef, HostListener, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PropertyImage } from '../models/property.model';
import { PropertyImageService } from '../services/property-image.service';
import { UiPreferencesService } from '../services/ui-preferences.service';
import { imageUrl } from './image-utils';
import { t } from './translations';

/** Photo gallery of a property page: large photo + thumbnails, and a full-screen viewer. Renders nothing without photos. */
@Component({
  selector: 'app-property-gallery',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <section class="gallery" *ngIf="images.length" [attr.aria-label]="t('photos')">
      <button type="button" class="main" (click)="open(current)" [attr.aria-label]="t('open_photo_viewer')">
        <img [src]="url(images[current])" [alt]="alt(current)" decoding="async" />
        <span class="counter" aria-hidden="true">{{ current + 1 }}/{{ images.length }}</span>
      </button>
      <div class="thumbs" *ngIf="images.length > 1">
        <button type="button" class="thumb" *ngFor="let image of images; let i = index"
                [class.active]="i === current" [attr.aria-current]="i === current ? 'true' : null"
                [attr.aria-label]="alt(i)" (click)="current = i">
          <img [src]="url(image)" alt="" loading="lazy" decoding="async" />
        </button>
      </div>
    </section>

    <div class="viewer" *ngIf="viewerOpen" role="dialog" aria-modal="true" [attr.aria-label]="t('photos') + ' — ' + title"
         (click)="close()">
      <img [src]="url(images[current])" [alt]="alt(current)" (click)="$event.stopPropagation()" />
      <button #closeButton mat-icon-button type="button" class="close" (click)="close()" [attr.aria-label]="t('close')">
        <mat-icon>close</mat-icon>
      </button>
      <ng-container *ngIf="images.length > 1">
        <button mat-icon-button type="button" class="nav prev" (click)="step(-1); $event.stopPropagation()" [attr.aria-label]="t('previous_photo')">
          <mat-icon>{{ isRtl ? 'chevron_right' : 'chevron_left' }}</mat-icon>
        </button>
        <button mat-icon-button type="button" class="nav next" (click)="step(1); $event.stopPropagation()" [attr.aria-label]="t('next_photo')">
          <mat-icon>{{ isRtl ? 'chevron_left' : 'chevron_right' }}</mat-icon>
        </button>
      </ng-container>
      <span class="viewer-counter" aria-live="polite">{{ current + 1 }}/{{ images.length }}</span>
    </div>
  `,
  styles: [`
    .gallery { display: grid; gap: 0.5rem; }
    .main {
      position: relative; display: block; width: 100%; padding: 0; border: 0; cursor: zoom-in;
      aspect-ratio: 16 / 9; border-radius: var(--radius-lg); overflow: hidden; background: var(--surface-subtle);
    }
    .main img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .counter {
      position: absolute; bottom: 10px; inset-inline-end: 10px; padding: 2px 10px; border-radius: 999px;
      background: rgba(0, 0, 0, 0.6); color: #fff; font-size: 0.8rem; font-variant-numeric: tabular-nums;
    }
    .thumbs { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 2px; }
    .thumb {
      flex: 0 0 auto; width: 84px; aspect-ratio: 4 / 3; padding: 0; border: 2px solid transparent;
      border-radius: 10px; overflow: hidden; background: var(--surface-subtle); opacity: 0.7;
      transition: opacity var(--duration-fast) ease, border-color var(--duration-fast) ease;
    }
    .thumb:hover, .thumb.active { opacity: 1; }
    .thumb.active { border-color: var(--primary); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .viewer {
      position: fixed; inset: 0; z-index: 3000; display: flex; align-items: center; justify-content: center;
      background: rgba(2, 6, 23, 0.92); padding: 3.5rem 1rem;
      --mdc-icon-button-icon-color: #fff;
    }
    .viewer img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; }
    .close { position: absolute; top: 12px; inset-inline-end: 12px; }
    .nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255, 255, 255, 0.12); }
    .nav.prev { inset-inline-start: 12px; }
    .nav.next { inset-inline-end: 12px; }
    .viewer-counter { position: absolute; bottom: 16px; color: #fff; font-size: 0.85rem; font-variant-numeric: tabular-nums; }
  `]
})
export class PropertyGalleryComponent implements OnChanges {
  @Input() propertyId?: number;
  @Input() title = '';
  @ViewChild('closeButton', { read: ElementRef }) closeButton?: ElementRef<HTMLButtonElement>;

  images: PropertyImage[] = [];
  current = 0;
  viewerOpen = false;
  private returnFocus?: HTMLElement | null;

  constructor(private imageService: PropertyImageService, private uiPrefs: UiPreferencesService) {}

  get isRtl(): boolean {
    return this.uiPrefs.getLanguage() === 'ar';
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['propertyId'] && this.propertyId) {
      this.imageService.findByProperty(this.propertyId).subscribe({
        next: images => {
          this.images = images;
          this.current = 0;
        },
      });
    }
  }

  url(image: PropertyImage): string {
    return imageUrl(image.imagePath)!;
  }

  alt(index: number): string {
    return `${this.title} — ${this.t('photo_n').replace('{{n}}', '' + (index + 1))}`;
  }

  open(index: number): void {
    this.current = index;
    this.returnFocus = document.activeElement as HTMLElement | null;
    this.viewerOpen = true;
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.closeButton?.nativeElement.focus());
  }

  close(): void {
    this.viewerOpen = false;
    document.body.style.overflow = '';
    this.returnFocus?.focus();
  }

  step(direction: number): void {
    this.current = (this.current + direction + this.images.length) % this.images.length;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.viewerOpen) return;
    const forward = this.isRtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = this.isRtl ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === 'Escape') this.close();
    else if (event.key === forward) this.step(1);
    else if (event.key === backward) this.step(-1);
  }
}
