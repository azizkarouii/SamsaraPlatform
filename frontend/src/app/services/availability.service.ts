import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Property } from '../models/property.model';
import { PropertyAvailability } from '../models/property-availability.model';

@Injectable({
  providedIn: 'root'
})
export class AvailabilityService {
  private readonly propertyApiUrl = `${environment.apiUrl}/properties`;
  private readonly availabilityApiUrl = `${environment.apiUrl}/availabilities`;

  constructor(private http: HttpClient) {}

  findAvailable(startDate: string, endDate: string): Observable<Property[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<Property[]>(`${this.propertyApiUrl}/available`, { params });
  }

  findByProperty(propertyId: number): Observable<PropertyAvailability[]> {
    return this.http.get<PropertyAvailability[]>(`${this.availabilityApiUrl}/property/${propertyId}`);
  }
}
