import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-email.html',
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  status = signal<'loading' | 'success' | 'error'>('loading');
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (!token) {
        this.status.set('error');
        this.errorMessage.set('El enlace de verificación es inválido o no contiene un token.');
        return;
      }

      this.verifyToken(token);
    });
  }

  async verifyToken(token: string) {
    try {
      await this.authService.verifyEmail(token);
      this.status.set('success');
    } catch (error: any) {
      this.status.set('error');
      this.errorMessage.set(
        error.error?.message || 'El enlace de verificación ha expirado o es inválido.'
      );
    }
  }
}
