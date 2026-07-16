import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CatalogService } from '../../../core/services/catalog.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lines-colors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lines-colors.html',
})
export class LinesColorsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private catalogService = inject(CatalogService);

  activeTab = signal<'systems' | 'finishes'>('systems');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Systems State
  systems = signal<any[]>([]);
  showSystemModal = signal<boolean>(false);
  selectedSystem = signal<any | null>(null);

  systemForm = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    isActive: [true],
  });

  // Finishes State
  finishes = signal<any[]>([]);
  showFinishModal = signal<boolean>(false);
  selectedFinish = signal<any | null>(null);

  finishForm = this.fb.group({
    name: ['', [Validators.required]],
    code: [''],
    priceMultiplier: [1.00, [Validators.required, Validators.min(0)]],
    isActive: [true],
  });

  async ngOnInit() {
    this.isLoading.set(true);
    await Promise.all([this.loadSystems(), this.loadFinishes()]);
    this.isLoading.set(false);
  }

  async loadSystems() {
    try {
      const data = await this.catalogService.getSystems();
      this.systems.set(data);
    } catch (err) {
      console.error('Error cargando sistemas', err);
    }
  }

  async loadFinishes() {
    try {
      const data = await this.catalogService.getFinishes();
      this.finishes.set(data);
    } catch (err) {
      console.error('Error cargando acabados', err);
    }
  }

  setTab(tab: 'systems' | 'finishes') {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  // System Handlers
  openCreateSystem() {
    this.selectedSystem.set(null);
    this.systemForm.reset({
      name: '',
      description: '',
      isActive: true,
    });
    this.showSystemModal.set(true);
  }

  openEditSystem(system: any) {
    this.selectedSystem.set(system);
    this.systemForm.patchValue({
      name: system.name,
      description: system.description || '',
      isActive: system.is_active,
    });
    this.showSystemModal.set(true);
  }

  closeSystemModal() {
    this.showSystemModal.set(false);
    this.selectedSystem.set(null);
  }

  async saveSystem() {
    if (this.systemForm.invalid) {
      this.systemForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const data = this.systemForm.value;
      if (this.selectedSystem()) {
        await this.catalogService.updateSystem(this.selectedSystem().id, data);
        this.successMessage.set('Línea/Sistema actualizada con éxito.');
      } else {
        await this.catalogService.createSystem(data);
        this.successMessage.set('Línea/Sistema creada con éxito.');
      }
      this.showSystemModal.set(false);
      await this.loadSystems();
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Error al guardar la línea/sistema.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteSystem(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta línea/sistema?')) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.catalogService.deleteSystem(id);
      this.successMessage.set('Línea/Sistema eliminada con éxito.');
      await this.loadSystems();
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Error al eliminar la línea/sistema.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // Finish Handlers
  openCreateFinish() {
    this.selectedFinish.set(null);
    this.finishForm.reset({
      name: '',
      code: '',
      priceMultiplier: 1.00,
      isActive: true,
    });
    this.showFinishModal.set(true);
  }

  openEditFinish(finish: any) {
    this.selectedFinish.set(finish);
    this.finishForm.patchValue({
      name: finish.name,
      code: finish.code || '',
      priceMultiplier: Number(finish.price_multiplier),
      isActive: finish.is_active,
    });
    this.showFinishModal.set(true);
  }

  closeFinishModal() {
    this.showFinishModal.set(false);
    this.selectedFinish.set(null);
  }

  async saveFinish() {
    if (this.finishForm.invalid) {
      this.finishForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const data = this.finishForm.value;
      if (this.selectedFinish()) {
        await this.catalogService.updateFinish(this.selectedFinish().id, data);
        this.successMessage.set('Acabado/Color actualizado con éxito.');
      } else {
        await this.catalogService.createFinish(data);
        this.successMessage.set('Acabado/Color creado con éxito.');
      }
      this.showFinishModal.set(false);
      await this.loadFinishes();
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Error al guardar el acabado/color.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteFinish(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar este acabado/color?')) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.catalogService.deleteFinish(id);
      this.successMessage.set('Acabado/Color eliminado con éxito.');
      await this.loadFinishes();
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Error al eliminar el acabado/color.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
