import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { RoleService } from '../../../core/services/role.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './roles.html',
})
export class RolesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private roleService = inject(RoleService);
  authService = inject(AuthService);

  roles = signal<any[]>([]);
  permissions = signal<any[]>([]);
  modules = signal<string[]>([]);
  activeModule = signal<string>('');
  
  filteredPermissions = computed(() => {
    const mod = this.activeModule();
    return this.permissions().filter(p => p.module === mod);
  });

  showModal = signal<boolean>(false);
  selectedRole = signal<any | null>(null);
  selectedPermissionIds = signal<string[]>([]);
  errorMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  roleForm = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
  });

  async ngOnInit() {
    this.isLoading.set(true);
    await Promise.all([this.loadRoles(), this.loadPermissions()]);
    this.isLoading.set(false);
  }

  async loadRoles() {
    try {
      const data = await this.roleService.findAll();
      this.roles.set(data);
    } catch (err) {
      console.error('Error cargando roles', err);
    }
  }

  async loadPermissions() {
    try {
      const data = await this.roleService.getPermissions();
      this.permissions.set(data);
      
      const uniqueModules = [...new Set(data.map((p: any) => p.module))];
      this.modules.set(uniqueModules as string[]);
      if (uniqueModules.length > 0) {
        this.activeModule.set(uniqueModules[0] as string);
      }
    } catch (err) {
      console.error('Error cargando permisos', err);
    }
  }

  setActiveModule(mod: string) {
    this.activeModule.set(mod);
  }

  openCreate() {
    this.selectedRole.set(null);
    this.selectedPermissionIds.set([]);
    this.roleForm.reset();
    this.showModal.set(true);
  }

  openEdit(role: any) {
    this.selectedRole.set(role);
    this.roleForm.patchValue({
      name: role.name,
      description: role.description,
    });
    const permissionIds = role.permissions.map((p: any) => p.permission.id);
    this.selectedPermissionIds.set(permissionIds);
    this.showModal.set(true);
  }

  isPermissionChecked(permissionId: string): boolean {
    return this.selectedPermissionIds().includes(permissionId);
  }

  togglePermission(permissionId: string) {
    this.selectedPermissionIds.update((ids) => {
      if (ids.includes(permissionId)) {
        return ids.filter((id) => id !== permissionId);
      } else {
        return [...ids, permissionId];
      }
    });
  }

  async save() {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const payload = {
      ...this.roleForm.value,
      permissionIds: this.selectedPermissionIds(),
    };

    try {
      if (this.selectedRole()) {
        await this.roleService.update(this.selectedRole().id, payload);
      } else {
        await this.roleService.create(payload);
      }
      await this.loadRoles();
      this.showModal.set(false);
    } catch (err: any) {
      this.errorMessage.set(
        err.error?.message || 'Error al guardar el rol.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  deleteRole(id: string) {
    if (!confirm('¿Está seguro de que desea eliminar este rol?')) return;

    try {
      this.roleService.delete(id).then(() => {
        this.loadRoles();
      });
    } catch (err: any) {
      alert(err.error?.message || 'No se pudo eliminar el rol.');
    }
  }

  getModuleLabel(moduleCode: string): string {
    const labels: Record<string, string> = {
      users: 'Usuarios',
      roles: 'Roles y Permisos',
      tenants: 'Compañías',
      engineering: 'Ingeniería',
      quotes: 'Cotizaciones',
      projects: 'Proyectos',
      clients: 'Clientes',
      catalog: 'Catálogo',
      billing: 'Facturación',
      settings: 'Mi Empresa',
      audit: 'Auditoría'
    };
    return labels[moduleCode?.toLowerCase()] || moduleCode;
  }

  closeModal() {
    this.showModal.set(false);
  }
}
