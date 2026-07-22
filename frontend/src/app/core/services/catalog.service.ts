import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CatalogService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000';

  // Systems / Líneas
  async getSystems(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${this.baseUrl}/catalog-systems`));
  }
  async createSystem(data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/catalog-systems`, data));
  }
  async updateSystem(id: string, data: any): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.baseUrl}/catalog-systems/${id}`, data));
  }
  async deleteSystem(id: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${this.baseUrl}/catalog-systems/${id}`));
  }

  // Finishes / Acabados
  async getFinishes(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${this.baseUrl}/catalog-finishes`));
  }
  async createFinish(data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/catalog-finishes`, data));
  }
  async updateFinish(id: string, data: any): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.baseUrl}/catalog-finishes/${id}`, data));
  }
  async deleteFinish(id: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${this.baseUrl}/catalog-finishes/${id}`));
  }

  // Catalog Items / Artículos
  async getItems(type?: string): Promise<any[]> {
    const url = type ? `${this.baseUrl}/catalog-items?type=${type}` : `${this.baseUrl}/catalog-items`;
    return firstValueFrom(this.http.get<any[]>(url));
  }
  async getItem(id: string): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${this.baseUrl}/catalog-items/${id}`));
  }
  async createItem(data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/catalog-items`, data));
  }
  async updateItem(id: string, data: any): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.baseUrl}/catalog-items/${id}`, data));
  }
  async deleteItem(id: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${this.baseUrl}/catalog-items/${id}`));
  }

  async bulkUpdatePrices(items: any[]): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.baseUrl}/catalog-items/bulk-prices`, { items }));
  }
}
