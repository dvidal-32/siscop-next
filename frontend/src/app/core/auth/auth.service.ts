import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TokenService } from './token.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private tokenService = inject(TokenService);
  private readonly apiUrl = 'http://localhost:3000/auth';

  currentUser = signal<any | null>(null);

  constructor() {
    if (this.tokenService.getAccessToken()) {
      this.loadCurrentUser().catch(() => {
        this.tokenService.clearTokens();
      });
    }
  }

  async login(credentials: any): Promise<any> {
    const res = await firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/login`, credentials)
    );
    this.tokenService.setAccessToken(res.accessToken);
    this.tokenService.setRefreshToken(res.refreshToken);
    await this.loadCurrentUser();
    return res;
  }

  async registerTenant(data: any): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/register-tenant`, data)
    );
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = this.tokenService.getRefreshToken();
      await firstValueFrom(this.http.post(`${this.apiUrl}/logout`, { refreshToken }));
    } catch {
      // Ignore network errors on logout
    } finally {
      this.tokenService.clearTokens();
      this.currentUser.set(null);
    }
  }

  async refreshToken(): Promise<any> {
    const refreshToken = this.tokenService.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const res = await firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/refresh`, { refreshToken })
    );
    this.tokenService.setAccessToken(res.accessToken);
    if (res.refreshToken) {
      this.tokenService.setRefreshToken(res.refreshToken);
    }
    return res;
  }

  async loadCurrentUser(): Promise<any> {
    const user = await firstValueFrom(
      this.http.get<any>(`${this.apiUrl}/me`)
    );
    this.currentUser.set(user);
    return user;
  }

  hasPermission(permission: string): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return user.permissions?.includes(permission) || false;
  }

  async forgotPassword(email: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${this.apiUrl}/forgot-password`, { email })
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${this.apiUrl}/reset-password`, { token, newPassword })
    );
  }

  async verifyEmail(token: string): Promise<void> {
    await firstValueFrom(
      this.http.get<void>(`${this.apiUrl}/verify-email?token=${token}`)
    );
  }
}
