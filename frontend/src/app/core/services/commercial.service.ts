import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CommercialService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000';

  // ──────────────────────────────────────────
  // CLIENTES
  // ──────────────────────────────────────────
  async getClients(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${this.baseUrl}/clients`));
  }

  async getClient(id: string): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${this.baseUrl}/clients/${id}`));
  }

  async createClient(data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/clients`, data));
  }

  async updateClient(id: string, data: any): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.baseUrl}/clients/${id}`, data));
  }

  async deleteClient(id: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${this.baseUrl}/clients/${id}`));
  }

  // ──────────────────────────────────────────
  // CONTACTOS
  // ──────────────────────────────────────────
  async getContacts(clientId: string): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${this.baseUrl}/clients/${clientId}/contacts`));
  }

  async createContact(clientId: string, data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/clients/${clientId}/contacts`, data));
  }

  async updateContact(contactId: string, data: any): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.baseUrl}/clients/contacts/${contactId}`, data));
  }

  async deleteContact(contactId: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${this.baseUrl}/clients/contacts/${contactId}`));
  }

  // ──────────────────────────────────────────
  // PROYECTOS
  // ──────────────────────────────────────────
  async getProjects(clientId?: string): Promise<any[]> {
    const params = clientId ? `?clientId=${clientId}` : '';
    return firstValueFrom(this.http.get<any[]>(`${this.baseUrl}/projects${params}`));
  }

  async getProject(id: string): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${this.baseUrl}/projects/${id}`));
  }

  async createProject(data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/projects`, data));
  }

  async updateProject(id: string, data: any): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.baseUrl}/projects/${id}`, data));
  }

  async deleteProject(id: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${this.baseUrl}/projects/${id}`));
  }

  // ──────────────────────────────────────────
  // COTIZACIONES
  // ──────────────────────────────────────────
  async getQuotes(projectId?: string): Promise<any[]> {
    const params = projectId ? `?projectId=${projectId}` : '';
    return firstValueFrom(this.http.get<any[]>(`${this.baseUrl}/quotes${params}`));
  }

  async getQuote(id: string): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${this.baseUrl}/quotes/${id}`));
  }

  async createQuote(data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/quotes`, data));
  }

  async createQuoteVersion(quoteId: string, data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/quotes/${quoteId}/versions`, data));
  }

  async approveQuote(quoteId: string): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/quotes/${quoteId}/approve`, {}));
  }

  async updateQuoteStatus(quoteId: string, status: string): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.baseUrl}/quotes/${quoteId}/status`, { status }));
  }

  async deleteQuote(id: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${this.baseUrl}/quotes/${id}`));
  }
}
