import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) return null;

  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './reset-password.html',
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  resetForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: passwordMatchValidator });

  token: string | null = null;
  isLoading = signal<boolean>(false);
  isTokenMissing = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.isTokenMissing.set(true);
      this.errorMessage.set('El token de recuperación no se encuentra o es inválido en la URL.');
    }
  }

  async onSubmit() {
    if (this.resetForm.invalid || !this.token) return;

    try {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      this.successMessage.set(null);

      const newPassword = this.resetForm.value.password!;
      await this.authService.resetPassword(this.token, newPassword);

      this.successMessage.set('Contraseña reestablecida con éxito. Redirigiendo al inicio de sesión...');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    } catch (err: any) {
      this.errorMessage.set(
        err.error?.message || 'Error al reestablecer la contraseña. El enlace puede haber expirado o ya haber sido utilizado.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
