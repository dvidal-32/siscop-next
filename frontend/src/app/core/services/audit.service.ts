import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/audit-logs';

  async findAll(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(this.apiUrl));
  }
}
