import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { RoleService } from '../../../core/services/role.service';
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

  roles = signal<any[]>([]);
  permissions = signal<any[]>([]);
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
    } catch (err) {
      console.error('Error cargando permisos', err);
    }
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

  async deleteRole(id: string) {
    if (!confirm('¿Está seguro de que desea eliminar este rol?')) return;

    try {
      await this.roleService.delete(id);
      await this.loadRoles();
    } catch (err: any) {
      alert(err.error?.message || 'No se pudo eliminar el rol.');
    }
  }

  closeModal() {
    this.showModal.set(false);
  }
}
