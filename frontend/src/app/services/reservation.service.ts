import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Reservation, ReservationEarning, ReservationPage, DashboardSummary, RentalEarning, ReservationEvent, ReservationPayment } from '../models/reservation.model';

export interface CreateReservationDto {
  propertyId: number;
  startDate: string;
  endDate: string;
  checkInTime: string;
  checkOutTime: string;
  clientName: string;
  clientPhone?: string;
  advanceAmount: number;
  totalAmount: number;
  notes?: string;
  /** Agreed nightly price; on an edit, 0 removes it. */
  negotiatedPricePerDay?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private apiUrl = `${environment.apiUrl}/reservations`;

  constructor(private http: HttpClient) {}

  create(dto: CreateReservationDto): Observable<Reservation> {
    return this.http.post<Reservation>(this.apiUrl, dto);
  }

  findAll(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(this.apiUrl);
  }

  findByProperty(propertyId: number): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.apiUrl}/property/${propertyId}`);
  }

  findMine(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.apiUrl}/mine`);
  }

  findByOwner(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.apiUrl}/by-owner`);
  }

  findOne(id: number): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}/${id}`);
  }

  update(id: number, dto: CreateReservationDto): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.apiUrl}/${id}`, dto);
  }

  updateStatus(id: number, status: string): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.apiUrl}/${id}/status`, { status });
  }

  findPayments(id: number): Observable<ReservationPayment[]> {
    return this.http.get<ReservationPayment[]>(`${this.apiUrl}/${id}/payments`);
  }

  addPayment(id: number, payment: { amount: number; paidOn?: string; note?: string }): Observable<ReservationPayment> {
    return this.http.post<ReservationPayment>(`${this.apiUrl}/${id}/payments`, payment);
  }

  removePayment(id: number, paymentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/payments/${paymentId}`);
  }

  findHistory(id: number): Observable<ReservationEvent[]> {
    return this.http.get<ReservationEvent[]>(`${this.apiUrl}/${id}/history`);
  }

  summary(from?: string, to?: string): Observable<DashboardSummary> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<DashboardSummary>(`${environment.apiUrl}/dashboard/summary`, { params });
  }

  earningsReport(from?: string, to?: string): Observable<RentalEarning[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<RentalEarning[]>(`${environment.apiUrl}/reports/earnings`, { params });
  }

  /** The Excel file of the report, downloaded with the session cookie. */
  earningsReportXlsx(from: string | undefined, to: string | undefined, lang: string): Observable<Blob> {
    let params = new HttpParams().set('lang', lang);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get(`${environment.apiUrl}/reports/earnings.xlsx`, { params, responseType: 'blob' });
  }

  findEarnings(): Observable<ReservationEarning[]> {
    return this.http.get<ReservationEarning[]>(`${this.apiUrl}/earnings`);
  }

  findPage(query: { status: string; search: string; page: number; size: number; sort: string; direction: string }): Observable<ReservationPage> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => params = params.set(key, String(value)));
    return this.http.get<ReservationPage>(`${this.apiUrl}/page`, { params });
  }

  /** The stay stops before its planned end; the following days become free again. */
  endEarly(id: number, endDate: string, refundAmount?: number): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.apiUrl}/${id}/early-end`, { endDate, refundAmount });
  }

  /** What the owner gave back to the client (0 removes it). */
  setRefund(id: number, amount: number): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}/${id}/refund`, { amount });
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
