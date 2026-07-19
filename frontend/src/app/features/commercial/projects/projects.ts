import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CommercialService } from '../../../core/services/commercial.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './projects.html',
})
export class ProjectsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private commercialService = inject(CommercialService);
  authService = inject(AuthService);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isSaving = signal<boolean>(false);

  projects = signal<any[]>([]);
  clients = signal<any[]>([]);
  showModal = signal<boolean>(false);
  selectedProject = signal<any | null>(null);
  filterClientId = signal<string | null>(null);
  filterClientName = signal<string | null>(null);

  readonly STATUS_MAP: Record<string, { label: string; classes: string }> = {
    active:    { label: 'Activo',     classes: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' },
    completed: { label: 'Completado', classes: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' },
    cancelled: { label: 'Cancelado',  classes: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' },
  };

  projectForm = this.fb.group({
    client_id: ['', [Validators.required]],
    name: ['', [Validators.required]],
    description: [''],
    address: [''],
    status: ['active'],
  });

  async ngOnInit() {
    const clientId = this.route.snapshot.queryParamMap.get('clientId');
    if (clientId) {
      this.filterClientId.set(clientId);
    }
    await Promise.all([this.loadClients(), this.loadProjects()]);

    if (clientId) {
      const matched = this.clients().find((c) => c.id === clientId);
      if (matched) this.filterClientName.set(matched.name);
    }
  }

  async loadClients() {
    try {
      const data = await this.commercialService.getClients();
      this.clients.set(data);
    } catch { /* silent */ }
  }

  async loadProjects() {
    this.isLoading.set(true);
    try {
      const data = await this.commercialService.getProjects(this.filterClientId() ?? undefined);
      this.projects.set(data);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al cargar proyectos');
    } finally {
      this.isLoading.set(false);
    }
  }

  clearFilter() {
    this.filterClientId.set(null);
    this.filterClientName.set(null);
    this.loadProjects();
  }

  openCreate() {
    this.selectedProject.set(null);
    this.projectForm.reset({
      client_id: this.filterClientId() ?? '',
      status: 'active',
    });
    this.showModal.set(true);
  }

  openEdit(project: any) {
    this.selectedProject.set(project);
    this.projectForm.patchValue({
      client_id: project.client_id,
      name: project.name,
      description: project.description || '',
      address: project.address || '',
      status: project.status,
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedProject.set(null);
    this.projectForm.reset({ status: 'active' });
  }

  async save() {
    if (this.projectForm.invalid) return;
    this.isSaving.set(true);
    this.errorMessage.set(null);

    try {
      const formData = this.projectForm.value;
      if (this.selectedProject()) {
        await this.commercialService.updateProject(this.selectedProject().id, formData);
        this.successMessage.set('Proyecto actualizado correctamente');
      } else {
        await this.commercialService.createProject(formData);
        this.successMessage.set('Proyecto creado correctamente');
      }
      this.closeModal();
      await this.loadProjects();
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al guardar proyecto');
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteProject(project: any) {
    if (!confirm(`¿Eliminar el proyecto "${project.name}"?`)) return;
    try {
      await this.commercialService.deleteProject(project.id);
      this.successMessage.set('Proyecto eliminado');
      await this.loadProjects();
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al eliminar proyecto');
    }
  }

  getStatusInfo(status: string) {
    return this.STATUS_MAP[status] ?? { label: status, classes: 'bg-slate-100 text-slate-500' };
  }
}
