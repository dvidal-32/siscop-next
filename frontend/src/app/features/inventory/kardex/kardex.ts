import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { InventoryService } from '../../../core/services/inventory.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-kardex',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, TableModule, ButtonModule, 
    InputTextModule, InputNumberModule, SelectModule, DialogModule, 
    ToastModule, TagModule
  ],
  providers: [MessageService, DatePipe],
  templateUrl: './kardex.html',
})
export class KardexComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);

  movements = signal<any[]>([]);
  rawInventoryItems = signal<any[]>([]);
  inventoryItems = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  
  filterItemId = signal<string | null>(null);
  tableSortOrder = signal<number>(-1);

  onFilterChange(itemId: string | null) {
    this.filterItemId.set(itemId);
    this.tableSortOrder.set(itemId ? 1 : -1);
  }

  filteredMovements = computed(() => {
    const filterId = this.filterItemId();
    const all = this.movements();
    if (!filterId) {
      return all.map(m => ({ ...m, running_balance: null }));
    }
    
    const filtered = all.filter((m: any) => m.inventory_item_id === filterId);
    
    // Calculate running balance chronologically (oldest first)
    const chronological = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let balance = 0;
    chronological.forEach(m => {
      balance += Number(m.quantity);
      m.running_balance = balance;
    });

    // Return chronological (oldest first)
    return chronological;
  });

  selectedItemBalance = computed(() => {
    const filterId = this.filterItemId();
    if (!filterId) return null;
    const item = this.rawInventoryItems().find(i => i.id === filterId);
    return item ? item.current_stock : null;
  });

  showModal = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  movementTypes = [
    { label: 'Entrada (+)', value: 'ENTRADA' },
    { label: 'Salida (-)', value: 'SALIDA' },
    { label: 'Ajuste Positivo (+)', value: 'AJUSTE_POSITIVO' },
    { label: 'Ajuste Negativo (-)', value: 'AJUSTE_NEGATIVO' }
  ];

  movementForm: FormGroup = this.fb.group({
    inventory_item_id: ['', Validators.required],
    type: ['ENTRADA', Validators.required],
    quantity: [0, Validators.required],
    notes: ['']
  });

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const [movs, items] = await Promise.all([
        this.inventoryService.getInventoryMovements(),
        this.inventoryService.getInventoryItems()
      ]);
      this.movements.set(movs);
      this.rawInventoryItems.set(items);
      
      // Mapear items para el dropdown
      this.inventoryItems.set(items.map(i => ({
        label: `${i.catalog_item.name} (${i.warehouse.name}) - Stock: ${i.current_stock}`,
        value: i.id
      })));
    } catch (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el Kardex.' });
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate() {
    this.movementForm.reset({
      inventory_item_id: '',
      type: 'ENTRADA',
      quantity: 0,
      notes: ''
    });
    this.showModal.set(true);
  }

  async save() {
    if (this.movementForm.invalid) {
      this.movementForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    try {
      const data = { ...this.movementForm.value };
      
      // Aplicar signo negativo automáticamente
      if (data.type === 'SALIDA' || data.type === 'AJUSTE_NEGATIVO') {
        data.quantity = -Math.abs(data.quantity);
      } else {
        data.quantity = Math.abs(data.quantity);
      }

      // Normalizar tipo de ajuste para la base de datos
      if (data.type === 'AJUSTE_POSITIVO' || data.type === 'AJUSTE_NEGATIVO') {
        data.type = 'AJUSTE';
      }

      await this.inventoryService.createManualMovement(data);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Movimiento registrado correctamente.' });
      this.showModal.set(false);
      this.loadData();
    } catch (err: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al registrar movimiento.' });
    } finally {
      this.isSaving.set(false);
    }
  }

  getSeverity(type: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    switch(type) {
      case 'ENTRADA': return 'success';
      case 'SALIDA': return 'danger';
      case 'AJUSTE': return 'warn';
      case 'PRODUCCION': return 'info';
      case 'COMPRA': return 'success';
      default: return 'secondary';
    }
  }
}
