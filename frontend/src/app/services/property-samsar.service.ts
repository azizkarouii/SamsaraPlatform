import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SamsarDeal } from '../shared/samsar-deal';
import { PropertySamsar, PropertySamsarInviteDto } from '../models/property-samsar.model';

@Injectable({
  providedIn: 'root'
})
export class PropertySamsarService {
  private apiUrl = `${environment.apiUrl}/property-samsars`;

  constructor(private http: HttpClient) {}

  findMine(): Observable<PropertySamsar[]> {
    return this.http.get<PropertySamsar[]>(`${this.apiUrl}/mine`);
  }

  findByOwner(): Observable<PropertySamsar[]> {
    return this.http.get<PropertySamsar[]>(`${this.apiUrl}/by-owner`);
  }

  findByProperty(propertyId: number): Observable<PropertySamsar[]> {
    return this.http.get<PropertySamsar[]>(`${this.apiUrl}/property/${propertyId}`);
  }

  invite(dto: PropertySamsarInviteDto): Observable<PropertySamsar> {
    return this.http.post<PropertySamsar>(this.apiUrl, dto);
  }

  /** Shares every house of the connected owner with the samsar (already shared houses are skipped). */
  inviteToAllProperties(dto: Omit<PropertySamsarInviteDto, 'propertyId'>): Observable<PropertySamsar[]> {
    return this.http.post<PropertySamsar[]>(`${this.apiUrl}/all-properties`, dto);
  }

  updateDeal(propertyId: number, samsarId: number, deal: SamsarDeal): Observable<PropertySamsar> {
    return this.http.patch<PropertySamsar>(`${this.apiUrl}/${propertyId}/${samsarId}/price-increase`, deal);
  }

  remove(propertyId: number, samsarId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${propertyId}/${samsarId}`);
  }

  removeSamsarFromAll(samsarId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/by-owner/samsar/${samsarId}`);
  }
}
