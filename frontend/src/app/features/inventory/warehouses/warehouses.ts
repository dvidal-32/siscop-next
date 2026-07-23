import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InventoryService } from '../../../core/services/inventory.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-warehouses',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, TableModule, ButtonModule, 
    InputTextModule, DialogModule, CheckboxModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './warehouses.html',
})
export class WarehousesComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);

  warehouses = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  selectedWarehouse = signal<any | null>(null);

  warehouseForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    is_main: [false]
  });

  ngOnInit() {
    this.loadWarehouses();
  }

  async loadWarehouses() {
    this.isLoading.set(true);
    try {
      const data = await this.inventoryService.getWarehouses();
      this.warehouses.set(data);
    } catch (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las bodegas.' });
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate() {
    this.selectedWarehouse.set(null);
    this.warehouseForm.reset({
      name: '',
      description: '',
      is_main: false
    });
    this.showModal.set(true);
  }

  openEdit(warehouse: any) {
    this.selectedWarehouse.set(warehouse);
    this.warehouseForm.patchValue({
      name: warehouse.name,
      description: warehouse.description,
      is_main: warehouse.is_main
    });
    this.showModal.set(true);
  }

  async save() {
    if (this.warehouseForm.invalid) {
      this.warehouseForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    try {
      const data = this.warehouseForm.value;
      if (this.selectedWarehouse()) {
        await this.inventoryService.updateWarehouse(this.selectedWarehouse().id, data);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Bodega actualizada correctamente.' });
      } else {
        await this.inventoryService.createWarehouse(data);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Bodega creada correctamente.' });
      }
      this.showModal.set(false);
      this.loadWarehouses();
    } catch (err: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al guardar la bodega.' });
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteWarehouse(warehouse: any) {
    if (!confirm(`¿Estás seguro de que deseas eliminar la bodega "${warehouse.name}"?`)) return;

    try {
      await this.inventoryService.deleteWarehouse(warehouse.id);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Bodega eliminada.' });
      this.loadWarehouses();
    } catch (err: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al eliminar la bodega.' });
    }
  }
}
