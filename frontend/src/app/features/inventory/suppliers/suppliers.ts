import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InventoryService } from '../../../core/services/inventory.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, TableModule, ButtonModule, 
    InputTextModule, DialogModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './suppliers.html',
})
export class SuppliersComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);

  suppliers = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  selectedSupplier = signal<any | null>(null);

  supplierForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    contact_name: [''],
    email: ['', [Validators.email]],
    phone: [''],
    address: ['']
  });

  ngOnInit() {
    this.loadSuppliers();
  }

  async loadSuppliers() {
    this.isLoading.set(true);
    try {
      const data = await this.inventoryService.getSuppliers();
      this.suppliers.set(data);
    } catch (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los proveedores.' });
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate() {
    this.selectedSupplier.set(null);
    this.supplierForm.reset({
      name: '',
      contact_name: '',
      email: '',
      phone: '',
      address: ''
    });
    this.showModal.set(true);
  }

  openEdit(supplier: any) {
    this.selectedSupplier.set(supplier);
    this.supplierForm.patchValue({
      name: supplier.name,
      contact_name: supplier.contact_name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address
    });
    this.showModal.set(true);
  }

  async save() {
    if (this.supplierForm.invalid) {
      this.supplierForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    try {
      const data = this.supplierForm.value;
      if (this.selectedSupplier()) {
        await this.inventoryService.updateSupplier(this.selectedSupplier().id, data);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Proveedor actualizado correctamente.' });
      } else {
        await this.inventoryService.createSupplier(data);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Proveedor creado correctamente.' });
      }
      this.showModal.set(false);
      this.loadSuppliers();
    } catch (err: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al guardar el proveedor.' });
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteSupplier(supplier: any) {
    if (!confirm(`¿Estás seguro de que deseas eliminar el proveedor "${supplier.name}"?`)) return;

    try {
      await this.inventoryService.deleteSupplier(supplier.id);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Proveedor eliminado.' });
      this.loadSuppliers();
    } catch (err: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al eliminar el proveedor.' });
    }
  }
}
