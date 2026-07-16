import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EngineeringService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000';

  // Plantillas
  async getTemplates(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${this.baseUrl}/engineering/templates`));
  }

  async getTemplate(id: string): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${this.baseUrl}/engineering/templates/${id}`));
  }

  async createTemplate(data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/engineering/templates`, data));
  }

  async updateTemplate(id: string, data: any): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.baseUrl}/engineering/templates/${id}`, data));
  }

  async deleteTemplate(id: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${this.baseUrl}/engineering/templates/${id}`));
  }

  // Variables
  async createVariable(data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/engineering/variables`, data));
  }

  async updateVariable(id: string, data: any): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.baseUrl}/engineering/variables/${id}`, data));
  }

  async deleteVariable(id: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${this.baseUrl}/engineering/variables/${id}`));
  }

  // Componentes
  async createComponent(data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/engineering/components`, data));
  }

  async updateComponent(id: string, data: any): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.baseUrl}/engineering/components/${id}`, data));
  }

  async deleteComponent(id: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${this.baseUrl}/engineering/components/${id}`));
  }

  // Fórmulas
  async saveFormula(data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/engineering/formulas`, data));
  }

  // Reglas
  async createRule(data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.baseUrl}/engineering/rules`, data));
  }

  async updateRule(id: string, data: any): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.baseUrl}/engineering/rules/${id}`, data));
  }

  async deleteRule(id: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${this.baseUrl}/engineering/rules/${id}`));
  }

  // Simulador
  async simulate(templateId: string, variables: Record<string, any>): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(`${this.baseUrl}/engineering/simulate`, {
        templateId,
        variables,
      }),
    );
  }

  // Biblioteca Global (Tenant)
  async getGlobalTemplates(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${this.baseUrl}/engineering/library/templates`));
  }

  async getGlobalTemplateDetail(id: string): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${this.baseUrl}/engineering/library/templates/${id}`));
  }

  async importTemplate(globalTemplateId: string): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(`${this.baseUrl}/engineering/library/import`, {
        globalTemplateId,
      }),
    );
  }
}
