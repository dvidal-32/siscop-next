import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000';

  // --- WAREHOUSES ---
  getWarehouses() {
    return firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/warehouses`));
  }
  createWarehouse(data: any) {
    return firstValueFrom(this.http.post<any>(`${this.apiUrl}/warehouses`, data));
  }
  updateWarehouse(id: string, data: any) {
    return firstValueFrom(this.http.patch<any>(`${this.apiUrl}/warehouses/${id}`, data));
  }
  deleteWarehouse(id: string) {
    return firstValueFrom(this.http.delete<any>(`${this.apiUrl}/warehouses/${id}`));
  }

  // --- SUPPLIERS ---
  getSuppliers() {
    return firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/suppliers`));
  }
  createSupplier(data: any) {
    return firstValueFrom(this.http.post<any>(`${this.apiUrl}/suppliers`, data));
  }
  updateSupplier(id: string, data: any) {
    return firstValueFrom(this.http.patch<any>(`${this.apiUrl}/suppliers/${id}`, data));
  }
  deleteSupplier(id: string) {
    return firstValueFrom(this.http.delete<any>(`${this.apiUrl}/suppliers/${id}`));
  }

  // --- INVENTORY ITEMS ---
  getInventoryItems() {
    return firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/inventory/items`));
  }
  getLowStockItems() {
    return firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/inventory/items/low-stock`));
  }
  updateMinMax(id: string, data: { stock_min: number; stock_max: number }) {
    return firstValueFrom(this.http.patch<any>(`${this.apiUrl}/inventory/items/${id}/min-max`, data));
  }

  // --- INVENTORY MOVEMENTS ---
  getInventoryMovements() {
    return firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/inventory/movements`));
  }
  createManualMovement(data: any) {
    return firstValueFrom(this.http.post<any>(`${this.apiUrl}/inventory/movements/manual`, data));
  }

  // --- PURCHASE ORDERS ---
  getPurchaseOrders() {
    return firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/purchase-orders`));
  }
  getPurchaseOrderById(id: string) {
    return firstValueFrom(this.http.get<any>(`${this.apiUrl}/purchase-orders/${id}`));
  }
  createPurchaseOrder(data: any) {
    return firstValueFrom(this.http.post<any>(`${this.apiUrl}/purchase-orders`, data));
  }
  updatePurchaseOrder(id: string, data: any) {
    return firstValueFrom(this.http.patch<any>(`${this.apiUrl}/purchase-orders/${id}`, data));
  }
  updatePurchaseOrderStatus(id: string, status: string) {
    return firstValueFrom(this.http.patch<any>(`${this.apiUrl}/purchase-orders/${id}/status`, { status }));
  }
  createPurchaseOrderReceipt(id: string, data: any) {
    return firstValueFrom(this.http.post<any>(`${this.apiUrl}/purchase-orders/${id}/receipts`, data));
  }
}
