import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { PropertyImage } from '../models/property.model';
import { PropertyImageService } from '../services/property-image.service';
import { UiPreferencesService } from '../services/ui-preferences.service';
import { ACCEPT_ATTRIBUTE, MAX_PROPERTY_IMAGES, checkImageFile, compressImage, imageUrl } from './image-utils';
import { t } from './translations';

/** One tile of the editor: a saved photo, or a file waiting for the property to be created. */
interface PhotoTile {
  key: string;
  url: string;
  image?: PropertyImage;
  file?: File;
}

/**
 * Photos section of the property form.
 * - With a propertyId (edit): every action is saved right away.
 * - Without (creation): files are kept locally and sent by uploadPending() once the property exists.
 */
@Component({
  selector: 'app-property-photos-editor',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    <div class="photos-head">
      <span class="count" [class.full]="isFull">{{ tiles.length }}/{{ max }}</span>
      <span class="hint">{{ t('photos_hint') }}</span>
    </div>

    <div class="grid">
      <figure class="tile" *ngFor="let tile of tiles; let i = index; let last = last; trackBy: trackTile">
        <img [src]="tile.url" [alt]="t('photo_n').replace('{{n}}', '' + (i + 1))" loading="lazy" decoding="async" />
        <span class="cover-badge" *ngIf="i === 0"><mat-icon inline aria-hidden="true">star</mat-icon> {{ t('cover_photo') }}</span>
        <figcaption class="tile-actions">
          <button mat-icon-button type="button" (click)="move(i, -1)" [disabled]="i === 0 || busy"
                  [matTooltip]="t('move_before')" [attr.aria-label]="t('move_before')">
            <mat-icon>{{ isRtl ? 'chevron_right' : 'chevron_left' }}</mat-icon>
          </button>
          <button mat-icon-button type="button" (click)="makeCover(i)" [disabled]="i === 0 || busy"
                  [matTooltip]="t('set_as_cover')" [attr.aria-label]="t('set_as_cover')">
            <mat-icon>star</mat-icon>
          </button>
          <button mat-icon-button type="button" *ngIf="tile.image" (click)="replaceInput.click(); replacing = tile" [disabled]="busy"
                  [matTooltip]="t('replace_photo')" [attr.aria-label]="t('replace_photo')">
            <mat-icon>swap_horiz</mat-icon>
          </button>
          <button mat-icon-button type="button" class="danger" (click)="remove(i)" [disabled]="busy"
                  [matTooltip]="t('delete_photo')" [attr.aria-label]="t('delete_photo')">
            <mat-icon>delete</mat-icon>
          </button>
          <button mat-icon-button type="button" (click)="move(i, 1)" [disabled]="last || busy"
                  [matTooltip]="t('move_after')" [attr.aria-label]="t('move_after')">
            <mat-icon>{{ isRtl ? 'chevron_left' : 'chevron_right' }}</mat-icon>
          </button>
        </figcaption>
      </figure>

      <label class="tile add" *ngIf="!isFull" [class.dragging]="dragging" [class.disabled]="busy"
             (dragover)="onDragOver($event)" (dragleave)="dragging = false" (drop)="onDrop($event)">
        <input type="file" multiple [accept]="accept" (change)="onPick($event)" [disabled]="busy" />
        <mat-spinner *ngIf="busy" diameter="28"></mat-spinner>
        <ng-container *ngIf="!busy">
          <mat-icon aria-hidden="true">add_photo_alternate</mat-icon>
          <strong>{{ t('add_photos') }}</strong>
          <span>{{ t('or_drop_here') }}</span>
        </ng-container>
      </label>
    </div>

    <input #replaceInput type="file" hidden [accept]="accept" (change)="onReplace($event)" />
  `,
  styles: [`
    :host { display: block; }
    .photos-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.75rem; margin-bottom: 0.75rem; }
    .count { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--primary); }
    .count.full { color: var(--status-pending); }
    .hint { font-size: 0.82rem; color: var(--text-secondary); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.75rem; }
    .tile {
      position: relative; margin: 0; aspect-ratio: 4 / 3; border-radius: var(--radius-md); overflow: hidden;
      background: var(--surface-subtle); border: 1px solid var(--border-color);
    }
    .tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .cover-badge {
      position: absolute; top: 6px; inset-inline-start: 6px; display: inline-flex; align-items: center; gap: 2px;
      padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 700;
      background: var(--primary); color: var(--on-primary);
    }
    .tile-actions {
      position: absolute; inset-inline: 0; bottom: 0; display: flex; justify-content: space-between;
      padding: 2px; background: linear-gradient(transparent, rgba(0, 0, 0, 0.65));
      --mdc-icon-button-icon-color: #fff; --mdc-icon-button-disabled-icon-color: rgba(255, 255, 255, 0.35);
    }
    .tile-actions .mat-mdc-icon-button { width: 36px; height: 36px; padding: 6px; }
    .tile-actions .danger { --mdc-icon-button-icon-color: #fca5a5; }
    .tile.add {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.2rem;
      border: 2px dashed var(--border-color); cursor: pointer; text-align: center; padding: 0.5rem;
      color: var(--text-secondary); transition: border-color var(--duration-fast) ease, background var(--duration-fast) ease;
    }
    .tile.add:hover, .tile.add.dragging, .tile.add:focus-within { border-color: var(--primary); background: var(--primary-soft); color: var(--primary); }
    .tile.add.disabled { pointer-events: none; opacity: 0.7; }
    .tile.add input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    .tile.add mat-icon { font-size: 32px; width: 32px; height: 32px; }
    .tile.add span { font-size: 0.75rem; }
  `]
})
export class PropertyPhotosEditorComponent implements OnChanges, OnDestroy {
  /** Set when editing an existing property: changes are then saved immediately. */
  @Input() propertyId?: number;

  readonly max = MAX_PROPERTY_IMAGES;
  readonly accept = ACCEPT_ATTRIBUTE;
  tiles: PhotoTile[] = [];
  busy = false;
  dragging = false;
  replacing?: PhotoTile;

  constructor(
    private imageService: PropertyImageService,
    private snackBar: MatSnackBar,
    private uiPrefs: UiPreferencesService,
  ) {}

  get isFull(): boolean {
    return this.tiles.length >= this.max;
  }

  get isRtl(): boolean {
    return this.uiPrefs.getLanguage() === 'ar';
  }

  t(key: string): string {
    return t(key, this.uiPrefs.getLanguage());
  }

  trackTile(_: number, tile: PhotoTile): string {
    return tile.key;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['propertyId'] && this.propertyId) {
      this.imageService.findByProperty(this.propertyId).subscribe({
        next: images => this.setSaved(images),
      });
    }
  }

  ngOnDestroy(): void {
    this.revokeLocalUrls();
  }

  /** Creation flow: sends the files chosen before the property existed, in their chosen order. */
  uploadPending(propertyId: number): Observable<PropertyImage[] | null> {
    const files = this.tiles.filter(tile => tile.file).map(tile => tile.file!);
    return files.length ? this.imageService.upload(propertyId, files) : of(null);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  private async addFiles(files: File[]): Promise<void> {
    if (!files.length || this.busy) return;
    const room = this.max - this.tiles.length;
    if (files.length > room) {
      this.notify(this.t('photos_limit').replace('{{n}}', '' + room));
      files = files.slice(0, room);
    }
    const valid = files.filter(file => {
      const error = checkImageFile(file);
      if (error) this.notify(`${file.name} : ${this.t(error)}`);
      return !error;
    });
    if (!valid.length) return;

    this.busy = true;
    const prepared = await Promise.all(valid.map(file => compressImage(file)));
    if (!this.propertyId) {
      this.tiles = [...this.tiles, ...prepared.map(file => this.localTile(file))];
      this.busy = false;
      return;
    }
    this.imageService.upload(this.propertyId, prepared).subscribe({
      next: images => {
        this.setSaved(images);
        this.busy = false;
        this.notify(this.t('photos_added'));
      },
      error: err => this.fail(err),
    });
  }

  async onReplace(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const tile = this.replacing;
    this.replacing = undefined;
    if (!file || !tile?.image || !this.propertyId) return;
    const error = checkImageFile(file);
    if (error) {
      this.notify(this.t(error));
      return;
    }
    this.busy = true;
    const prepared = await compressImage(file);
    this.imageService.replace(this.propertyId, tile.image.id, prepared).subscribe({
      next: image => {
        tile.image = image;
        tile.url = imageUrl(image.imagePath)!;
        this.busy = false;
        this.notify(this.t('photo_replaced'));
      },
      error: err => this.fail(err),
    });
  }

  move(index: number, step: number): void {
    const target = index + step;
    if (target < 0 || target >= this.tiles.length) return;
    const next = [...this.tiles];
    [next[index], next[target]] = [next[target], next[index]];
    this.applyOrder(next);
  }

  makeCover(index: number): void {
    const next = [...this.tiles];
    next.unshift(...next.splice(index, 1));
    this.applyOrder(next);
  }

  remove(index: number): void {
    const tile = this.tiles[index];
    if (!tile.image) {
      URL.revokeObjectURL(tile.url);
      this.tiles = this.tiles.filter(item => item !== tile);
      return;
    }
    if (!confirm(this.t('delete_photo_confirm')) || !this.propertyId) return;
    this.busy = true;
    this.imageService.delete(this.propertyId, tile.image.id).subscribe({
      next: images => {
        this.setSaved(images);
        this.busy = false;
      },
      error: err => this.fail(err),
    });
  }

  /** Optimistic: the new order shows at once and is rolled back if the server refuses it. */
  private applyOrder(next: PhotoTile[]): void {
    const previous = this.tiles;
    this.tiles = next;
    if (!this.propertyId) return;
    this.busy = true;
    this.imageService.reorder(this.propertyId, next.map(tile => tile.image!.id)).subscribe({
      next: () => this.busy = false,
      error: err => {
        this.tiles = previous;
        this.fail(err);
      },
    });
  }

  private setSaved(images: PropertyImage[]): void {
    this.tiles = images.map(image => ({ key: 'img-' + image.id, url: imageUrl(image.imagePath)!, image }));
  }

  private localTile(file: File): PhotoTile {
    return { key: 'file-' + Math.random().toString(36).slice(2), url: URL.createObjectURL(file), file };
  }

  private revokeLocalUrls(): void {
    this.tiles.filter(tile => tile.file).forEach(tile => URL.revokeObjectURL(tile.url));
  }

  private fail(err: any): void {
    this.busy = false;
    this.notify(err?.error?.message || this.t('error_generic'));
  }

  private notify(message: string): void {
    this.snackBar.open(message, this.t('close'), { duration: 4000 });
  }
}
