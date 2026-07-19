import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CommonModule } from '@angular/common';

import { COUNTRIES_LIST } from '../../admin/company/company';

@Component({
  selector: 'app-register-tenant',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register-tenant.html',
})
export class RegisterTenantComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  errorMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  isSuccess = signal<boolean>(false);
  countriesList = COUNTRIES_LIST;

  registerForm = this.fb.group({
    tenantName: ['', [Validators.required]],
    tenantSlug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    phone: ['', [Validators.required]],
    country: ['', [Validators.required]],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminFirstName: ['', [Validators.required]],
    adminLastName: ['', [Validators.required]],
    adminPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: this.passwordMatchValidator });

  passwordMatchValidator(g: any) {
    const password = g.get('adminPassword')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    if (password !== confirmPassword) {
      g.get('confirmPassword')?.setErrors({ mismatch: true });
    } else {
      const errors = g.get('confirmPassword')?.errors;
      if (errors) {
        delete errors['mismatch'];
        if (Object.keys(errors).length === 0) {
          g.get('confirmPassword')?.setErrors(null);
        } else {
          g.get('confirmPassword')?.setErrors(errors);
        }
      }
    }
    return null;
  }

  // Auto-generate slug from name
  onNameChange() {
    const name = this.registerForm.get('tenantName')?.value || '';
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    this.registerForm.get('tenantSlug')?.setValue(slug);
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      // Remove confirmPassword from payload
      const payload: any = { ...this.registerForm.value };
      delete payload.confirmPassword;

      // Append currency configurations based on selected country
      const countryObj = this.countriesList.find(c => c.name === payload.country);
      if (countryObj) {
        payload.currencyCode = countryObj.code;
        payload.currencySymbol = countryObj.symbol;
        payload.currencyLocale = countryObj.locale;
      }

      await this.authService.registerTenant(payload);
      this.isSuccess.set(true);
      // Removed auto-redirect so the user can read the email verification message
    } catch (err: any) {
      this.errorMessage.set(
        err.error?.message || 'Error al registrar la empresa. Por favor, valide los datos.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
