import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Property, CreatePropertyDto } from '../models/property.model';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private apiUrl = `${environment.apiUrl}/properties`;

  constructor(private http: HttpClient) {}

  create(dto: CreatePropertyDto): Observable<Property> {
    return this.http.post<Property>(this.apiUrl, dto);
  }

  findAll(date?: string): Observable<Property[]> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<Property[]>(this.apiUrl, { params });
  }

  findMine(date?: string): Observable<Property[]> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<Property[]>(`${this.apiUrl}/mine`, { params });
  }

  findOne(id: number): Observable<Property> {
    return this.http.get<Property>(`${this.apiUrl}/${id}`);
  }

  update(id: number, dto: CreatePropertyDto): Observable<Property> {
    return this.http.patch<Property>(`${this.apiUrl}/${id}`, dto);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
