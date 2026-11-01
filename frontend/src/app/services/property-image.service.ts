import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PropertyImage } from '../models/property.model';

@Injectable({
  providedIn: 'root'
})
export class PropertyImageService {
  constructor(private http: HttpClient) {}

  private url(propertyId: number): string {
    return `${environment.apiUrl}/properties/${propertyId}/images`;
  }

  findByProperty(propertyId: number): Observable<PropertyImage[]> {
    return this.http.get<PropertyImage[]>(this.url(propertyId));
  }

  /** Returns the whole gallery after the upload. */
  upload(propertyId: number, files: File[]): Observable<PropertyImage[]> {
    const body = new FormData();
    files.forEach(file => body.append('files', file, file.name));
    return this.http.post<PropertyImage[]>(this.url(propertyId), body);
  }

  replace(propertyId: number, imageId: number, file: File): Observable<PropertyImage> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.put<PropertyImage>(`${this.url(propertyId)}/${imageId}`, body);
  }

  /** The first id becomes the cover. */
  reorder(propertyId: number, orderedIds: number[]): Observable<PropertyImage[]> {
    return this.http.put<PropertyImage[]>(`${this.url(propertyId)}/order`, orderedIds);
  }

  delete(propertyId: number, imageId: number): Observable<PropertyImage[]> {
    return this.http.delete<PropertyImage[]>(`${this.url(propertyId)}/${imageId}`);
  }
}
