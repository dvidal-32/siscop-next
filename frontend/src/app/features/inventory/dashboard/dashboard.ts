import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InventoryService } from '../../../core/services/inventory.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, TableModule, ButtonModule, 
    InputNumberModule, InputTextModule, IconFieldModule, InputIconModule, DialogModule, ToastModule, TagModule, SelectModule
  ],
  providers: [MessageService],
  templateUrl: './dashboard.html',
})
export class InventoryDashboardComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);

  items = signal<any[]>([]);
  lowStockItems = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  
  showMinMaxModal = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  selectedItem = signal<any | null>(null);

  minMaxForm: FormGroup = this.fb.group({
    stock_min: [0, [Validators.required, Validators.min(0)]],
    stock_max: [0, [Validators.required, Validators.min(0)]]
  });

  statusOptions = [
    { label: 'Óptimo', value: 'Óptimo' },
    { label: 'Bajo', value: 'Bajo' },
    { label: 'Agotado', value: 'Agotado' }
  ];
  selectedStatus = signal<string | null>(null);

  totalItems = computed(() => this.items().length);
  totalValue = computed(() => {
    return this.items().reduce((sum, item) => {
      const stock = Number(item.current_stock) || 0;
      const cost = Number(item.catalog_item?.cost) || 0;
      return sum + (stock * cost);
    }, 0);
  });
  lowStockCount = computed(() => this.lowStockItems().length);

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const [allItems, lowStock] = await Promise.all([
        this.inventoryService.getInventoryItems(),
        this.inventoryService.getLowStockItems()
      ]);
      
      const enrichedItems = allItems.map(item => {
        const severity = this.getSeverity(item);
        const label = severity === 'danger' ? 'Agotado' : (severity === 'warn' ? 'Bajo' : 'Óptimo');
        return { ...item, status_label: label };
      });
      
      this.items.set(enrichedItems);
      this.lowStockItems.set(lowStock);
    } catch (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el inventario.' });
    } finally {
      this.isLoading.set(false);
    }
  }

  openMinMax(item: any) {
    this.selectedItem.set(item);
    this.minMaxForm.patchValue({
      stock_min: Number(item.stock_min) || 0,
      stock_max: Number(item.stock_max) || 0
    });
    this.showMinMaxModal.set(true);
  }

  async saveMinMax() {
    if (this.minMaxForm.invalid) {
      this.minMaxForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    try {
      const data = this.minMaxForm.value;
      await this.inventoryService.updateMinMax(this.selectedItem().id, data);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Límites actualizados correctamente.' });
      this.showMinMaxModal.set(false);
      this.loadData();
    } catch (err: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al guardar.' });
    } finally {
      this.isSaving.set(false);
    }
  }

  getSeverity(item: any): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    const stock = Number(item.current_stock);
    const min = Number(item.stock_min);
    
    if (stock <= 0) return 'danger';
    if (stock <= min) return 'warn';
    return 'success';
  }
}
