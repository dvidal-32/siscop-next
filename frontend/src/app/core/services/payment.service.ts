import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/payments';

  async findAll(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(this.apiUrl));
  }

  async getSubscription(): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${this.apiUrl}/subscription`));
  }

  async getPayPalConfig(): Promise<{ clientId: string; mode: string }> {
    return firstValueFrom(this.http.get<{ clientId: string; mode: string }>(`${this.apiUrl}/paypal-config`));
  }

  async capturePayPal(orderId: string, targetPlanId?: string): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/paypal/capture`, { orderId, targetPlanId })
    );
  }
}
