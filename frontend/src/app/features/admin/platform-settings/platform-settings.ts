import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { PlatformService } from '../../../core/services/platform.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-platform-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './platform-settings.html',
})
export class PlatformSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private platformService = inject(PlatformService);
  authService = inject(AuthService);

  get canSave() {
    const user = this.authService.currentUser();
    return this.authService.hasPermission('platform-settings.update') || user?.roles?.some((r: any) => r.name === 'Super Administrador');
  }

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  rawSettings = signal<any[]>([]);

  settingsForm = this.fb.group({
    DEFAULT_TRIAL_DAYS: [30, [Validators.required, Validators.min(0)]],
    PAYPAL_SANDBOX_CLIENT_ID: ['', [Validators.required]],
    PAYPAL_SANDBOX_CLIENT_SECRET: ['', [Validators.required]],
    PAYPAL_LIVE_CLIENT_ID: [''],
    PAYPAL_LIVE_CLIENT_SECRET: [''],
    PAYPAL_MODE: ['sandbox', [Validators.required]],
    MAINTENANCE_MODE: [false],
  });

  async ngOnInit() {
    this.isLoading.set(true);
    await this.loadSettings();
    this.isLoading.set(false);
  }

  async loadSettings() {
    try {
      const data = await this.platformService.getSettings();
      this.rawSettings.set(data);

      const formValues: any = {};
      data.forEach((item) => {
        let val: any = item.value;
        if (item.value_type === 'number') {
          val = Number(item.value);
        } else if (item.value_type === 'boolean') {
          val = item.value === 'true';
        }
        formValues[item.key] = val;
      });

      this.settingsForm.patchValue(formValues);
    } catch (err) {
      console.error('Error cargando ajustes', err);
      this.errorMessage.set('Error al cargar las configuraciones del sistema.');
    }
  }

  async saveSettings() {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const formValue = this.settingsForm.value;
      const payload = Object.keys(formValue).map((key) => {
        const val = (formValue as any)[key];
        return {
          key,
          value: String(val),
        };
      });

      await this.platformService.updateSettings(payload);
      this.successMessage.set('Ajustes de plataforma guardados con éxito.');
      await this.loadSettings();
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Error al guardar los ajustes.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
