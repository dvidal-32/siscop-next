import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { PlatformService } from '../../../core/services/platform.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-plans-mgmt',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './plans-mgmt.html',
})
export class PlansMgmtComponent implements OnInit {
  private fb = inject(FormBuilder);
  private platformService = inject(PlatformService);

  plans = signal<any[]>([]);
  showModal = signal<boolean>(false);
  selectedPlan = signal<any | null>(null);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  planForm = this.fb.group({
    code: ['', [Validators.required]],
    name: ['', [Validators.required]],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    billing_cycle: ['monthly', [Validators.required]],
    max_users: [5, [Validators.required, Validators.min(1)]],
    max_storage_mb: [1024, [Validators.required, Validators.min(0)]],
    is_active: [true],
  });

  async ngOnInit() {
    this.isLoading.set(true);
    await this.loadPlans();
    this.isLoading.set(false);
  }

  async loadPlans() {
    try {
      const data = await this.platformService.getPlans();
      this.plans.set(data);
    } catch (err) {
      console.error('Error cargando planes', err);
    }
  }

  openCreate() {
    this.selectedPlan.set(null);
    this.planForm.reset({
      code: '',
      name: '',
      description: '',
      price: 0,
      billing_cycle: 'monthly',
      max_users: 5,
      max_storage_mb: 1024,
      is_active: true,
    });
    this.planForm.get('code')?.enable();
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.showModal.set(true);
  }

  openEdit(plan: any) {
    this.selectedPlan.set(plan);
    this.planForm.patchValue({
      code: plan.code,
      name: plan.name,
      description: plan.description || '',
      price: Number(plan.price),
      billing_cycle: plan.billing_cycle,
      max_users: plan.max_users,
      max_storage_mb: plan.max_storage_mb,
      is_active: plan.is_active,
    });
    this.planForm.get('code')?.disable(); // Code cannot be modified
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedPlan.set(null);
  }

  async savePlan() {
    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      // Get raw value because code might be disabled
      const data = this.planForm.getRawValue();

      if (this.selectedPlan()) {
        await this.platformService.updatePlan(this.selectedPlan().id, data);
        this.successMessage.set('Plan de pago actualizado con éxito.');
      } else {
        await this.platformService.createPlan(data);
        this.successMessage.set('Plan de pago creado con éxito.');
      }

      this.showModal.set(false);
      await this.loadPlans();
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Error al guardar el plan de pago.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggleActive(plan: any) {
    if (!confirm(`¿Estás seguro de que deseas ${plan.is_active ? 'desactivar' : 'activar'} el plan "${plan.name}"?`)) {
      return;
    }

    this.isLoading.set(true);
    try {
      await this.platformService.updatePlan(plan.id, { is_active: !plan.is_active });
      await this.loadPlans();
    } catch (err) {
      console.error('Error al cambiar el estado del plan', err);
    } finally {
      this.isLoading.set(false);
    }
  }
}
