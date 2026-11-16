import { Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as L from 'leaflet';
import { UiPreferencesService } from '../services/ui-preferences.service';
import { TRANSLATIONS } from './translations';
import { HOUSE_PIN_HTML, LatLng, formatCoordinates, mapsLink } from './geo';
import { LocationPickerDialogComponent } from './location-picker-dialog.component';

/**
 * Where a house is: a small map with its pin, the link to copy or open in Maps and, when editable,
 * the buttons to place, move or remove the pin.
 */
@Component({
  selector: 'app-house-location',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule, MatTooltipModule],
  template: `
    <button *ngIf="!point && editable" type="button" class="empty" (click)="pick()">
      <span class="empty-icon" aria-hidden="true"><mat-icon>add_location_alt</mat-icon></span>
      <span class="empty-text"><b>{{ t('location_place') }}</b><small>{{ t('location_place_hint') }}</small></span>
      <mat-icon class="go" aria-hidden="true">chevron_right</mat-icon>
    </button>

    <div *ngIf="point" class="card">
      <div #map class="mini-map" [attr.aria-label]="t('location')"></div>
      <div class="bar">
        <span class="coords"><mat-icon>place</mat-icon>{{ coordinates }}</span>
        <span class="actions">
          <button mat-stroked-button type="button" (click)="copy()" [class.copied]="copied">
            <mat-icon>{{ copied ? 'check' : 'link' }}</mat-icon> {{ copied ? t('link_copied') : t('copy_location_link') }}
          </button>
          <a mat-stroked-button [href]="link" target="_blank" rel="noopener"><mat-icon>directions</mat-icon> {{ t('open_in_maps') }}</a>
          <ng-container *ngIf="editable">
            <button mat-icon-button type="button" (click)="pick()" [matTooltip]="t('location_move')" [attr.aria-label]="t('location_move')"><mat-icon>edit_location_alt</mat-icon></button>
            <button mat-icon-button type="button" class="remove" (click)="pointChange.emit(null)" [matTooltip]="t('location_remove')" [attr.aria-label]="t('location_remove')"><mat-icon>wrong_location</mat-icon></button>
          </ng-container>
        </span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .empty { width: 100%; display: flex; align-items: center; gap: 0.85rem; padding: 0.9rem 1rem; border: 1.5px dashed var(--border-color); border-radius: 16px; background: transparent; color: var(--text-primary); font: inherit; text-align: start; cursor: pointer; transition: border-color 0.2s, background 0.2s, transform 0.2s; }
    .empty:hover, .empty:focus-visible { border-color: var(--primary); background: var(--primary-soft); transform: translateY(-1px); outline: 0; }
    .empty-icon { width: 44px; height: 44px; flex-shrink: 0; display: grid; place-items: center; border-radius: 12px; background: var(--primary-soft); color: var(--primary); transition: transform 0.3s; }
    .empty:hover .empty-icon { transform: rotate(-8deg) scale(1.08); }
    .empty-text { display: flex; flex-direction: column; gap: 2px; }
    .empty-text small { color: var(--text-secondary); font-size: 0.8rem; }
    .go { margin-inline-start: auto; color: var(--text-secondary); }
    .card { border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; background: var(--bg-card); }
    .mini-map { height: 220px; z-index: 0; }
    .bar { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; padding: 0.6rem 0.75rem; border-top: 1px solid var(--border-color); }
    .coords { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
    .coords mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--primary); }
    .actions { display: flex; align-items: center; flex-wrap: wrap; gap: 0.35rem; margin-inline-start: auto; }
    .actions [mat-stroked-button] { border-radius: 999px; }
    .copied { color: var(--primary) !important; border-color: var(--primary) !important; }
    .remove:hover { color: var(--status-cancelled); }
  `],
})
export class HouseLocationComponent implements OnChanges, OnDestroy {
  @Input() point: LatLng | null = null;
  @Input() editable = false;
  @Output() pointChange = new EventEmitter<LatLng | null>();

  copied = false;
  private map?: L.Map;
  private marker?: L.Marker;
  private mapElement?: HTMLDivElement;

  constructor(private dialog: MatDialog, private uiPrefs: UiPreferencesService, private zone: NgZone) {}

  /** The map element only exists while there is a pin: the map follows it. */
  @ViewChild('map') set mapRef(ref: ElementRef<HTMLDivElement> | undefined) {
    if (ref?.nativeElement === this.mapElement) return;
    this.map?.remove();
    this.map = this.marker = undefined;
    this.mapElement = ref?.nativeElement;
    if (this.mapElement) this.draw();
  }

  get coordinates(): string {
    return this.point ? formatCoordinates(this.point) : '';
  }

  get link(): string {
    return this.point ? mapsLink(this.point) : '';
  }

  ngOnChanges(): void {
    if (this.map && this.point) {
      this.marker?.setLatLng([this.point.lat, this.point.lng]);
      this.map.setView([this.point.lat, this.point.lng], this.map.getZoom());
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  pick(): void {
    this.dialog.open(LocationPickerDialogComponent, {
      data: { point: this.point },
      width: '860px',
      maxWidth: '96vw',
      autoFocus: false,
      panelClass: 'location-dialog',
    }).afterClosed().subscribe(point => {
      if (point) this.pointChange.emit(point);
    });
  }

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.link);
    } catch {
      // Older browsers or http: a hidden field does the copy
      const field = document.createElement('textarea');
      field.value = this.link;
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }
    this.copied = true;
    setTimeout(() => (this.copied = false), 2000);
  }

  private draw(): void {
    const element = this.mapElement;
    const point = this.point;
    if (!element || !point) return;
    this.zone.runOutsideAngular(() => {
      this.map = L.map(element, { scrollWheelZoom: false, attributionControl: true }).setView([point.lat, point.lng], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(this.map);
      const icon = L.divIcon({ className: 'house-pin-icon', html: HOUSE_PIN_HTML, iconSize: [40, 48], iconAnchor: [20, 46] });
      this.marker = L.marker([point.lat, point.lng], { icon, keyboard: false }).addTo(this.map);
      setTimeout(() => this.map?.invalidateSize(), 120);
    });
  }

  t(key: string): string {
    return TRANSLATIONS[key]?.[this.uiPrefs.getLanguage()] ?? key;
  }
}
