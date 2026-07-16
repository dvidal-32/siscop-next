import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { RoleService } from '../../../core/services/role.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users.html',
})
export class UsersComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private roleService = inject(RoleService);

  users = signal<any[]>([]);
  roles = signal<any[]>([]);
  showModal = signal<boolean>(false);
  selectedUser = signal<any | null>(null);
  errorMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  userForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: [''],
    lastName: [''],
    password: [''],
    roleIds: [[] as string[], [Validators.required]],
  });

  async ngOnInit() {
    this.isLoading.set(true);
    await Promise.all([this.loadUsers(), this.loadRoles()]);
    this.isLoading.set(false);
  }

  async loadUsers() {
    try {
      const data = await this.userService.findAll();
      this.users.set(data);
    } catch (err) {
      console.error('Error cargando usuarios', err);
    }
  }

  async loadRoles() {
    try {
      const data = await this.roleService.findAll();
      this.roles.set(data);
    } catch (err) {
      console.error('Error cargando roles', err);
    }
  }

  openCreate() {
    this.selectedUser.set(null);
    this.userForm.reset();
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.showModal.set(true);
  }

  openEdit(user: any) {
    this.selectedUser.set(user);
    this.userForm.patchValue({
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      password: '',
      roleIds: user.roles.map((ur: any) => ur.role.id),
    });
    // Password is optional for updates
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.showModal.set(true);
  }

  async save() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const data = this.userForm.value;
    // Remove password if empty (during edit)
    if (!data.password) {
      delete data.password;
    }

    try {
      if (this.selectedUser()) {
        await this.userService.update(this.selectedUser().id, data);
      } else {
        await this.userService.create(data);
      }
      await this.loadUsers();
      this.showModal.set(false);
    } catch (err: any) {
      this.errorMessage.set(
        err.error?.message || 'Error al guardar el usuario.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggleStatus(user: any) {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await this.userService.updateStatus(user.id, nextStatus);
      await this.loadUsers();
    } catch (err: any) {
      alert(err.error?.message || 'No se pudo cambiar el estado.');
    }
  }

  closeModal() {
    this.showModal.set(false);
  }
}
