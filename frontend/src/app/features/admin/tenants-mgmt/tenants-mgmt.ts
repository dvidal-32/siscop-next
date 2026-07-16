import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlatformService } from '../../../core/services/platform.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-tenants-mgmt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tenants-mgmt.html',
})
export class TenantsMgmtComponent implements OnInit {
  private platformService = inject(PlatformService);
  public authService = inject(AuthService);

  tenants = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  async ngOnInit() {
    this.isLoading.set(true);
    await this.loadTenants();
    this.isLoading.set(false);
  }

  async loadTenants() {
    try {
      const data = await this.platformService.getAllTenants();
      this.tenants.set(data);
    } catch (err) {
      console.error('Error cargando empresas (tenants)', err);
      this.errorMessage.set('Error al cargar la lista de empresas.');
    }
  }

  async activateTenant(tenant: any) {
    if (!this.authService.hasPermission('tenants.activate')) {
      this.errorMessage.set('No tienes permisos suficientes para realizar esta acción.');
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas activar manualmente la empresa "${tenant.name}"? Esto también activará la cuenta de su administrador.`)) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.platformService.activateTenant(tenant.id);
      this.successMessage.set(`La empresa "${tenant.name}" y su cuenta de administrador han sido activadas con éxito.`);
      await this.loadTenants();
    } catch (err: any) {
      console.error('Error al activar tenant', err);
      this.errorMessage.set(err.error?.message || 'Error al intentar activar la empresa.');
    } finally {
      this.isLoading.set(false);
    }
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      suspended: 'bg-red-500/10 text-red-400 border border-red-500/20',
      cancelled: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
    };
    return classes[status] || 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pendiente',
      active: 'Activa',
      suspended: 'Suspendida',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  }
}
