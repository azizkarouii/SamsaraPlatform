/** Position of a house on the map (WGS84). */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Centre of Tunisia's coast, shown when nothing better is known. */
export const DEFAULT_CENTER: LatLng = { lat: 36.4, lng: 10.6 };

const EARTH_RADIUS_M = 6_371_000;

/** Link that opens the place in Google Maps (app on a phone, site elsewhere). */
export function mapsLink(point: LatLng): string {
  return `https://www.google.com/maps?q=${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
}

export function formatCoordinates(point: LatLng): string {
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

/** Metres between two points (great circle). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Metres from a point to the segment [a, b]; flat projection, exact enough over a few kilometres. */
export function distanceToSegment(point: LatLng, a: LatLng, b: LatLng): number {
  const scale = Math.cos((point.lat * Math.PI) / 180);
  const ax = (a.lng - point.lng) * scale, ay = a.lat - point.lat;
  const bx = (b.lng - point.lng) * scale, by = b.lat - point.lat;
  const dx = bx - ax, dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length));
  const closest = { lat: point.lat + ay + t * dy, lng: point.lng + (ax + t * dx) / scale };
  return distanceMeters(point, closest);
}

/** Shortest distance from a point to a line made of several points. */
export function distanceToLine(point: LatLng, line: LatLng[]): number {
  if (line.length === 1) return distanceMeters(point, line[0]);
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    best = Math.min(best, distanceToSegment(point, line[i - 1], line[i]));
  }
  return best;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  geometry?: { lat: number; lon: number }[];
  members?: { geometry?: { lat: number; lon: number }[] }[];
  tags?: Record<string, string>;
}

/** Public Overpass servers, tried in turn: one is often busy (502/504) or slow. */
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
/** A server that has not answered by then is left for the next one. */
const SERVER_TIMEOUT_MS = 12_000;
/** Beyond this, the house is not "near the sea": nothing is filled in. */
const SEARCH_RADIUS_M = 15_000;

/**
 * Distance in metres to the nearest beach (or, without a mapped beach, to the shore), from the
 * OpenStreetMap data. Null when there is no sea within 15 km; throws when the service cannot be reached.
 */
export async function beachDistance(point: LatLng, signal?: AbortSignal): Promise<number | null> {
  const around = `(around:${SEARCH_RADIUS_M},${point.lat},${point.lng})`;
  const query = `[out:json][timeout:20];(nwr["natural"="beach"]${around};way["natural"="coastline"]${around};);out geom;`;
  const elements = await overpass(query, signal);

  let beach = Infinity;
  let shore = Infinity;
  for (const element of elements) {
    const lines = shapes(element);
    if (!lines.length) continue;
    const distance = Math.min(...lines.map(line => distanceToLine(point, line)));
    if (element.tags?.['natural'] === 'beach') beach = Math.min(beach, distance);
    else shore = Math.min(shore, distance);
  }
  const best = Number.isFinite(beach) ? beach : shore;
  // Rounded to 10 m: the pin itself is not more precise than that
  return Number.isFinite(best) ? Math.round(best / 10) * 10 : null;
}

/** The first server giving an answer wins; the caller's abort stops everything. */
async function overpass(query: string, signal?: AbortSignal): Promise<OverpassElement[]> {
  let lastError: unknown = new Error('overpass unreachable');
  for (const url of OVERPASS_URLS) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), SERVER_TIMEOUT_MS);
    const stop = () => timeout.abort();
    signal?.addEventListener('abort', stop);
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: timeout.signal,
      });
      if (!response.ok) throw new Error('overpass ' + response.status);
      return (await response.json()).elements ?? [];
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', stop);
    }
  }
  throw lastError;
}

function shapes(element: OverpassElement): LatLng[][] {
  const toPoints = (geometry?: { lat: number; lon: number }[]) => (geometry ?? []).map(p => ({ lat: p.lat, lng: p.lon }));
  if (element.type === 'node' && element.lat != null && element.lon != null) return [[{ lat: element.lat, lng: element.lon }]];
  if (element.type === 'way') return [toPoints(element.geometry)].filter(line => line.length);
  return (element.members ?? []).map(member => toPoints(member.geometry)).filter(line => line.length);
}

export interface PlaceResult {
  label: string;
  point: LatLng;
}

/** Places matching a typed address (OpenStreetMap Nominatim), Tunisia first. */
export async function searchPlaces(text: string, language: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=tn&accept-language=${language}&q=${encodeURIComponent(text)}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('nominatim ' + response.status);
  const rows: { display_name: string; lat: string; lon: string }[] = await response.json();
  return rows.map(row => ({ label: row.display_name, point: { lat: Number(row.lat), lng: Number(row.lon) } }));
}

/** Pin of a house, drawn in CSS (no image file to serve). */
export const HOUSE_PIN_HTML = '<span class="house-pin"><span class="material-icons">home</span></span>';
