import { AfterViewInit, Component, ElementRef, Inject, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as L from 'leaflet';
import { UiPreferencesService } from '../services/ui-preferences.service';
import { TRANSLATIONS } from './translations';
import { DEFAULT_CENTER, HOUSE_PIN_HTML, LatLng, PlaceResult, formatCoordinates, searchPlaces } from './geo';

export interface LocationPickerData {
  point: LatLng | null;
}

/**
 * Full map to pin a house: search an address, jump to where the user stands, then click or drag the pin
 * to the exact door. Closes with the chosen position.
 */
@Component({
  selector: 'app-location-picker-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="head">
      <span class="head-icon" aria-hidden="true"><mat-icon>pin_drop</mat-icon></span>
      <div>
        <h2>{{ t('location_pick_title') }}</h2>
        <p>{{ t('location_pick_hint') }}</p>
      </div>
      <button mat-icon-button type="button" class="close" mat-dialog-close [attr.aria-label]="t('close')"><mat-icon>close</mat-icon></button>
    </div>

    <div class="tools">
      <form class="search" (ngSubmit)="search()" role="search">
        <mat-icon aria-hidden="true">search</mat-icon>
        <input name="q" [(ngModel)]="query" [placeholder]="t('location_search_placeholder')" [attr.aria-label]="t('location_search_placeholder')" autocomplete="off" />
        <mat-spinner *ngIf="searching" diameter="18"></mat-spinner>
      </form>
      <button mat-stroked-button type="button" class="locate" (click)="locateMe()" [disabled]="locating">
        <mat-icon [class.pulse]="locating">my_location</mat-icon> {{ t('location_my_position') }}
      </button>
    </div>
    <ul class="results" *ngIf="results.length">
      <li *ngFor="let r of results; trackBy: trackLabel"><button type="button" (click)="choose(r)"><mat-icon>place</mat-icon>{{ r.label }}</button></li>
    </ul>
    <p class="message" *ngIf="message" role="status">{{ message }}</p>

    <div class="map-wrap">
      <div #map class="map" [attr.aria-label]="t('location_pick_title')"></div>
      <div class="tap-hint" *ngIf="!point"><mat-icon>touch_app</mat-icon>{{ t('location_tap_hint') }}</div>
    </div>

    <div class="foot">
      <span class="coords" *ngIf="point"><mat-icon>place</mat-icon>{{ coordinates }}</span>
      <span class="spacer"></span>
      <button mat-button type="button" mat-dialog-close>{{ t('cancel') }}</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!point" (click)="confirm()">
        <mat-icon>check</mat-icon> {{ t('location_confirm') }}
      </button>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; gap: 0.7rem; padding: 1.1rem; max-height: 92dvh; }
    .head { display: flex; align-items: flex-start; gap: 0.75rem; }
    .head h2 { margin: 0; font-family: var(--display-font); font-size: 1.5rem; line-height: 1.1; }
    .head p { margin: 0.15rem 0 0; font-size: 0.82rem; color: var(--text-secondary); }
    .head-icon { width: 42px; height: 42px; flex-shrink: 0; border-radius: 12px; display: grid; place-items: center; background: var(--primary-soft); color: var(--primary); }
    .close { margin-inline-start: auto; }
    .tools { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .search { flex: 1 1 260px; display: flex; align-items: center; gap: 0.5rem; height: 44px; padding: 0 0.9rem; border: 1px solid var(--border-color); border-radius: 999px; background: var(--bg-card); transition: border-color 0.2s, box-shadow 0.2s; }
    .search:focus-within { border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-soft); }
    .search mat-icon { color: var(--text-secondary); }
    .search:focus-within mat-icon { color: var(--primary); }
    .search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; }
    .locate { height: 44px; border-radius: 999px !important; }
    .pulse { animation: pulse 1s ease-in-out infinite; }
    @keyframes pulse { 50% { transform: scale(1.25); opacity: 0.6; } }
    .results { list-style: none; margin: 0; padding: 0.3rem; border: 1px solid var(--border-color); border-radius: 14px; background: var(--bg-card); box-shadow: var(--shadow-md); max-height: 180px; overflow: auto; }
    .results button { width: 100%; display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.6rem; border: 0; border-radius: 10px; background: transparent; color: var(--text-primary); font: inherit; font-size: 0.85rem; text-align: start; cursor: pointer; }
    .results button:hover { background: var(--primary-soft); }
    .results mat-icon { color: var(--primary); flex-shrink: 0; }
    .message { margin: 0; font-size: 0.82rem; color: var(--text-secondary); }
    .map-wrap { position: relative; flex: 1; min-height: 300px; height: 52dvh; border-radius: 16px; overflow: hidden; border: 1px solid var(--border-color); }
    .map { position: absolute; inset: 0; }
    .tap-hint { position: absolute; z-index: 500; left: 50%; bottom: 14px; transform: translateX(-50%); display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.85rem; border-radius: 999px; background: var(--bg-card); box-shadow: var(--shadow-md); font-size: 0.82rem; white-space: nowrap; pointer-events: none; }
    .foot { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .coords { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
    .coords mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--primary); }
    .spacer { flex: 1; }
  `],
})
export class LocationPickerDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('map', { static: true }) mapElement!: ElementRef<HTMLDivElement>;

  point: LatLng | null;
  query = '';
  results: PlaceResult[] = [];
  searching = false;
  locating = false;
  message = '';

  private map?: L.Map;
  private marker?: L.Marker;
  private accuracy?: L.Circle;
  private searchAbort?: AbortController;

  constructor(
    @Inject(MAT_DIALOG_DATA) data: LocationPickerData,
    private dialogRef: MatDialogRef<LocationPickerDialogComponent, LatLng>,
    private uiPrefs: UiPreferencesService,
    private zone: NgZone,
  ) {
    this.point = data?.point ?? null;
  }

  get coordinates(): string {
    return this.point ? formatCoordinates(this.point) : '';
  }

  ngAfterViewInit(): void {
    const start = this.point ?? DEFAULT_CENTER;
    // Leaflet's own events need no change detection: only the ones that change the view re-enter the zone
    this.zone.runOutsideAngular(() => {
      this.map = L.map(this.mapElement.nativeElement, { zoomControl: true, attributionControl: true })
        .setView([start.lat, start.lng], this.point ? 17 : 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(this.map);
      this.map.on('click', (event: L.LeafletMouseEvent) => this.zone.run(() => this.place({ lat: event.latlng.lat, lng: event.latlng.lng })));
    });
    if (this.point) this.place(this.point, false);
    // The dialog grows with an animation: the map measures itself again once it is in place
    this.dialogRef.afterOpened().subscribe(() => this.map?.invalidateSize());
    setTimeout(() => this.map?.invalidateSize(), 250);
    if (!this.point) this.locateMe(true);
  }

  ngOnDestroy(): void {
    this.searchAbort?.abort();
    this.map?.remove();
  }

  /** Puts (or moves) the pin; the pin itself can then be dragged. */
  place(point: LatLng, pan = true): void {
    this.point = point;
    if (!this.map) return;
    if (!this.marker) {
      const icon = L.divIcon({ className: 'house-pin-icon', html: HOUSE_PIN_HTML, iconSize: [40, 48], iconAnchor: [20, 46] });
      this.marker = L.marker([point.lat, point.lng], { icon, draggable: true, autoPan: true }).addTo(this.map);
      this.marker.on('dragend', () => this.zone.run(() => {
        const at = this.marker!.getLatLng();
        this.point = { lat: at.lat, lng: at.lng };
      }));
    } else {
      this.marker.setLatLng([point.lat, point.lng]);
    }
    if (pan) this.map.panTo([point.lat, point.lng]);
  }

  /** The browser asks once for permission; quietly on opening, with a message when asked by the button. */
  locateMe(quiet = false): void {
    if (!('geolocation' in navigator)) {
      if (!quiet) this.message = this.t('location_unavailable');
      return;
    }
    this.locating = true;
    this.message = '';
    navigator.geolocation.getCurrentPosition(
      position => this.zone.run(() => {
        this.locating = false;
        const here = { lat: position.coords.latitude, lng: position.coords.longitude };
        this.accuracy?.remove();
        if (this.map) {
          this.accuracy = L.circle([here.lat, here.lng], { radius: position.coords.accuracy, color: '#16a34a', weight: 1, fillOpacity: 0.08 }).addTo(this.map);
          this.map.flyTo([here.lat, here.lng], 17, { duration: 0.8 });
        }
        this.place(here, false);
      }),
      () => this.zone.run(() => {
        this.locating = false;
        if (!quiet) this.message = this.t('location_denied');
      }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  async search(): Promise<void> {
    const text = this.query.trim();
    if (text.length < 3) return;
    this.searchAbort?.abort();
    this.searchAbort = new AbortController();
    this.searching = true;
    this.message = '';
    try {
      this.results = await searchPlaces(text, this.uiPrefs.getLanguage(), this.searchAbort.signal);
      if (!this.results.length) this.message = this.t('location_no_result');
    } catch {
      this.message = this.t('location_search_failed');
    } finally {
      this.searching = false;
    }
  }

  choose(result: PlaceResult): void {
    this.results = [];
    this.map?.flyTo([result.point.lat, result.point.lng], 17, { duration: 0.8 });
    this.place(result.point, false);
  }

  trackLabel(_: number, result: PlaceResult): string {
    return result.label;
  }

  confirm(): void {
    if (this.point) this.dialogRef.close(this.point);
  }

  t(key: string): string {
    return TRANSLATIONS[key]?.[this.uiPrefs.getLanguage()] ?? key;
  }
}
