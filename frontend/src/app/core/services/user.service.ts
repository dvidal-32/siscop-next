import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/users';

  async findAll(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(this.apiUrl));
  }

  async findOne(id: string): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${this.apiUrl}/${id}`));
  }

  async create(data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(this.apiUrl, data));
  }

  async update(id: string, data: any): Promise<any> {
    return firstValueFrom(this.http.patch<any>(`${this.apiUrl}/${id}`, data));
  }

  async updateStatus(id: string, status: string): Promise<any> {
    return firstValueFrom(
      this.http.patch<any>(`${this.apiUrl}/${id}/status`, { status })
    );
  }
}
