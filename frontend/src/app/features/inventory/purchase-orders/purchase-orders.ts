import { Component, OnInit, inject, signal } from '@angular/core';
// Force rebuild
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { InventoryService } from '../../../core/services/inventory.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, TableModule, ButtonModule, 
    InputTextModule, InputNumberModule, SelectModule, DialogModule, 
    ToastModule, TagModule, TooltipModule
  ],
  providers: [MessageService, DatePipe],
  templateUrl: './purchase-orders.html',
})
export class PurchaseOrdersComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private catalogService = inject(CatalogService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);

  orders = signal<any[]>([]);
  suppliers = signal<any[]>([]);
  warehouses = signal<any[]>([]);
  catalogItems = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  editingId = signal<string | null>(null);
  showReceiveModal = signal<boolean>(false);
  showDetailsModal = signal<boolean>(false);
  detailsOrder = signal<any>(null);
  selectedOrder = signal<any>(null);
  isSaving = signal<boolean>(false);
  isLoadingOrder = signal<boolean>(false);

  poForm: FormGroup = this.fb.group({
    supplier_id: ['', Validators.required],
    warehouse_id: ['', Validators.required],
    notes: [''],
    discount: [0, [Validators.min(0)]],
    tax: [0, [Validators.min(0)]],
    items: this.fb.array([])
  });

  get itemsArray() {
    return this.poForm.get('items') as FormArray;
  }

  get formSubtotal() {
    let sub = 0;
    for (let control of this.itemsArray.controls) {
      const qty = control.get('quantity')?.value || 0;
      const price = control.get('unit_price')?.value || 0;
      sub += (qty * price);
    }
    return sub;
  }

  get formTotal() {
    const sub = this.formSubtotal;
    const discount = this.poForm.get('discount')?.value || 0;
    const tax = this.poForm.get('tax')?.value || 0;
    return sub - discount + tax;
  }

  receiveForm: FormGroup = this.fb.group({
    invoice_number: ['', Validators.required],
    invoice_date: [null, Validators.required],
    notes: [''],
    items: this.fb.array([])
  });

  get receiveItemsArray() {
    return this.receiveForm.get('items') as FormArray;
  }

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const [ord, sup, wh, cat] = await Promise.all([
        this.inventoryService.getPurchaseOrders(),
        this.inventoryService.getSuppliers(),
        this.inventoryService.getWarehouses(),
        this.catalogService.getItems()
      ]);
      this.orders.set(ord);
      this.suppliers.set(sup.map((s: any) => ({ label: s.name, value: s.id })));
      this.warehouses.set(wh.map((w: any) => ({ label: w.name, value: w.id })));
      this.catalogItems.set(cat.map((c: any) => ({ label: `${c.name} (${c.code})`, value: c.id })));
    } catch (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los datos.' });
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate() {
    this.editingId.set(null);
    this.poForm.reset({
      supplier_id: '',
      warehouse_id: '',
      notes: '',
      discount: 0,
      tax: 0
    });
    this.itemsArray.clear();
    this.addItem();
    this.showModal.set(true);
  }

  async openEdit(order: any) {
    this.isLoadingOrder.set(true);
    try {
      const fullOrder = await this.inventoryService.getPurchaseOrderById(order.id);
      this.editingId.set(fullOrder.id);
      
      this.poForm.reset({
        supplier_id: fullOrder.supplier_id,
        warehouse_id: fullOrder.warehouse_id || '',
        notes: fullOrder.notes,
        discount: Number(fullOrder.discount) || 0,
        tax: Number(fullOrder.tax) || 0
      });
      
      this.itemsArray.clear();
      for (const item of fullOrder.items) {
        this.itemsArray.push(this.fb.group({
          catalog_item_id: [item.catalog_item_id, Validators.required],
          quantity: [item.quantity, [Validators.required, Validators.min(0.01)]],
          unit_price: [item.unit_price]
        }));
      }
      
      this.showModal.set(true);
    } catch (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la orden.' });
    } finally {
      this.isLoadingOrder.set(false);
    }
  }

  addItem() {
    this.itemsArray.push(this.fb.group({
      catalog_item_id: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit_price: [0, [Validators.required, Validators.min(0)]]
    }));
  }

  removeItem(index: number) {
    this.itemsArray.removeAt(index);
  }

  async save() {
    if (this.poForm.invalid || this.itemsArray.length === 0) {
      this.poForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Completa todos los campos y agrega al menos un artículo.' });
      return;
    }

    this.isSaving.set(true);
    try {
      const data = this.poForm.value;
      const currentEditingId = this.editingId();
      
      if (currentEditingId) {
        await this.inventoryService.updatePurchaseOrder(currentEditingId, data);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Orden de compra actualizada correctamente.' });
      } else {
        await this.inventoryService.createPurchaseOrder(data);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Orden de compra generada correctamente.' });
      }
      
      this.showModal.set(false);
      this.loadData();
    } catch (err: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al crear la orden.' });
    } finally {
      this.isSaving.set(false);
    }
  }

  async updateStatus(id: string, status: string) {
    try {
      await this.inventoryService.updatePurchaseOrderStatus(id, status);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Estado actualizado.' });
      this.loadData();
    } catch (err: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el estado.' });
    }
  }

  async openReceive(order: any) {
    this.isLoadingOrder.set(true);
    try {
      const fullOrder = await this.inventoryService.getPurchaseOrderById(order.id);
      this.selectedOrder.set(fullOrder);
      
      this.receiveForm.reset();
      this.receiveItemsArray.clear();
      
      for (const item of fullOrder.items) {
        const remaining = Number(item.quantity) - Number(item.received_quantity);
        if (remaining > 0) {
          this.receiveItemsArray.push(this.fb.group({
            purchase_order_item_id: [item.id],
            catalog_item_id: [item.catalog_item_id],
            item_name: [item.catalog_item?.name || 'Item'], // For display only
            quantity_received: [remaining, [Validators.required, Validators.min(0.01), Validators.max(remaining)]],
            warehouse_id: [fullOrder.warehouse_id || '', Validators.required]
          }));
        }
      }
      
      this.showReceiveModal.set(true);
    } catch (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la orden.' });
    } finally {
      this.isLoadingOrder.set(false);
    }
  }

  async saveReceive() {
    if (this.receiveForm.invalid || this.receiveItemsArray.length === 0) {
      this.receiveForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Completa todos los campos requeridos.' });
      return;
    }

    this.isSaving.set(true);
    try {
      const order = this.selectedOrder();
      const payload = this.receiveForm.value;
      await this.inventoryService.createPurchaseOrderReceipt(order.id, payload);
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Mercancía recibida y kardex actualizado.' });
      this.showReceiveModal.set(false);
      this.loadData();
    } catch (err: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al recibir mercancía.' });
    } finally {
      this.isSaving.set(false);
    }
  }

  async viewDetails(order: any) {
    this.isLoadingOrder.set(true);
    try {
      const fullOrder = await this.inventoryService.getPurchaseOrderById(order.id);
      this.detailsOrder.set(fullOrder);
      this.showDetailsModal.set(true);
    } catch (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la orden.' });
    } finally {
      this.isLoadingOrder.set(false);
    }
  }

  getSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    switch(status) {
      case 'DRAFT': return 'secondary';
      case 'PENDING': return 'warn';
      case 'APPROVED': return 'info';
      case 'PARTIAL_RECEIPT': return 'contrast';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'danger';
      default: return 'secondary';
    }
  }

  translateStatus(status: string): string {
    const map: any = {
      'DRAFT': 'Borrador',
      'PENDING': 'Pendiente',
      'APPROVED': 'Aprobada',
      'PARTIAL_RECEIPT': 'Recibido Parcial',
      'COMPLETED': 'Completada',
      'CANCELLED': 'Cancelada',
    };
    return map[status] || status;
  }
}
