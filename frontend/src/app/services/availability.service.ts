import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Property } from '../models/property.model';
import { PropertyAvailability } from '../models/property-availability.model';
import { Occupancy } from '../shared/calendar-utils';

export type ManualAvailabilityStatus = 'available' | 'pending' | 'unavailable';

@Injectable({
  providedIn: 'root'
})
export class AvailabilityService {
  private readonly propertyApiUrl = `${environment.apiUrl}/properties`;
  private readonly availabilityApiUrl = `${environment.apiUrl}/availabilities`;

  constructor(private http: HttpClient) {}

  /** Properties owned or shared with the current user that are free on the whole period. */
  findAvailable(startDate: string, endDate: string): Observable<Property[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<Property[]>(`${this.propertyApiUrl}/available`, { params });
  }

  findByProperty(propertyId: number): Observable<PropertyAvailability[]> {
    return this.http.get<PropertyAvailability[]>(`${this.availabilityApiUrl}/property/${propertyId}`);
  }

  /** Public occupied periods + blocked days of a property (no client data). */
  getOccupancy(propertyId: number): Observable<Occupancy> {
    return this.http.get<Occupancy>(`${this.propertyApiUrl}/${propertyId}/occupancy`);
  }

  setRange(propertyId: number, startDate: string, endDate: string, status: ManualAvailabilityStatus): Observable<PropertyAvailability[]> {
    return this.http.post<PropertyAvailability[]>(`${this.availabilityApiUrl}/range`, { propertyId, startDate, endDate, status });
  }
}
