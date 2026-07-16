import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './forgot-password.html',
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  isLoading = signal<boolean>(false);
  successMessage = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  async onSubmit() {
    if (this.forgotForm.invalid) return;

    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      this.successMessage.set(false);

      const email = this.forgotForm.value.email!;
      await this.authService.forgotPassword(email);

      this.successMessage.set(true);
      this.forgotForm.reset();
    } catch (err: any) {
      this.errorMessage.set(
        err.error?.message || 'Ocurrió un error al enviar el correo de recuperación.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
