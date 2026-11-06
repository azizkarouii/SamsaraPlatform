import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { Notification } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;
  unreadCountChange$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  findAll(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl);
  }

  findPage(unreadOnly: boolean, page: number, size: number): Observable<{ content: Notification[]; totalElements: number }> {
    return this.http.get<{ content: Notification[]; totalElements: number }>(
      `${this.apiUrl}/page?unreadOnly=${unreadOnly}&page=${page}&size=${size}`);
  }

  markAsRead(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/read-all`, {});
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/unread-count`);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
