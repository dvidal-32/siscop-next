import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TenantService {
  private http = inject(HttpClient);
  private readonly tenantsUrl = 'http://localhost:3000/tenants';
  private readonly settingsUrl = 'http://localhost:3000/settings';

  async get(id: string): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${this.tenantsUrl}/${id}`));
  }

  async update(id: string, data: any): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.tenantsUrl}/${id}`, data));
  }

  async getPlans(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>('http://localhost:3000/plans'));
  }

  async getSettings(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(this.settingsUrl));
  }

  async updateSettings(settings: any[]): Promise<any> {
    return firstValueFrom(this.http.patch<any>(this.settingsUrl, { settings }));
  }

  // Métodos para impuestos (Taxes)
  async getTaxes(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${this.tenantsUrl.replace('/tenants', '')}/taxes`));
  }

  async createTax(data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.tenantsUrl.replace('/tenants', '')}/taxes`, data));
  }

  async updateTax(id: string, data: any): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.tenantsUrl.replace('/tenants', '')}/taxes/${id}`, data));
  }

  async deleteTax(id: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${this.tenantsUrl.replace('/tenants', '')}/taxes/${id}`));
  }

  async deleteMyAccount(password: string): Promise<any> {
    return firstValueFrom(
      this.http.delete<any>(`${this.tenantsUrl}/me`, {
        body: { password }
      })
    );
  }
}
