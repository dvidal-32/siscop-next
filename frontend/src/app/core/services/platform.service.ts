import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PlatformService {
  private http = inject(HttpClient);
  private readonly plansUrl = 'http://localhost:3000/plans';
  private readonly settingsUrl = 'http://localhost:3000/platform-settings';
  private readonly tenantsUrl = 'http://localhost:3000/tenants';

  async getAllTenants(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(this.tenantsUrl));
  }

  async getPlans(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${this.plansUrl}/all`));
  }

  async createPlan(data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(this.plansUrl, data));
  }

  async updatePlan(id: string, data: any): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.plansUrl}/${id}`, data));
  }

  async deletePlan(id: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${this.plansUrl}/${id}`));
  }

  async getSettings(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(this.settingsUrl));
  }

  async updateSettings(settings: any[]): Promise<any> {
    return firstValueFrom(this.http.patch<any>(this.settingsUrl, { settings }));
  }

  async activateTenant(id: string): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.tenantsUrl}/${id}/activate`, {}));
  }
}
