import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { WidgetTokenResponse } from '../types/widget-token-response';

@Injectable({
  providedIn: 'root',
})
export class WidgetTokenHttpService {
  private baseUrl = `${environment.API_BASE_URL}/widget/token`;

  constructor(private http: HttpClient) {}

  issueToken(
    tenantId: string,
    origin: string,
    ttlMinutes: number = 0
  ): Observable<WidgetTokenResponse> {
    return this.http.post<WidgetTokenResponse>(`${this.baseUrl}/${tenantId}`, {
      origin,
      ttlMinutes,
    });
  }
}
