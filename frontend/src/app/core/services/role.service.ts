import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private http = inject(HttpClient);
  private readonly rolesUrl = 'http://localhost:3000/roles';
  private readonly permissionsUrl = 'http://localhost:3000/permissions';

  async findAll(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(this.rolesUrl));
  }

  async findOne(id: string): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${this.rolesUrl}/${id}`));
  }

  async create(data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(this.rolesUrl, data));
  }

  async update(id: string, data: any): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.rolesUrl}/${id}`, data));
  }

  async delete(id: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${this.rolesUrl}/${id}`));
  }

  async getPermissions(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(this.permissionsUrl));
  }
}
