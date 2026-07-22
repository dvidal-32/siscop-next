import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CatalogService } from '../../../core/services/catalog.service';
import { TenantService } from '../../../core/services/tenant.service';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
  selector: 'app-price-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, InputNumberModule],
  templateUrl: './price-list.html',
})
export class PriceListComponent implements OnInit {
  private catalogService = inject(CatalogService);
  private tenantService = inject(TenantService);

  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  items = signal<any[]>([]);
  modifiedItems = signal<Set<string>>(new Set()); // IDs of items that have been edited

  // Settings
  priceName1 = signal<string>('Precio 1');
  priceName2 = signal<string>('Precio 2');
  priceName3 = signal<string>('Precio 3');
  priceName4 = signal<string>('Precio 4');
  currencySymbol = signal<string>('$');
  currencyLocale = signal<string>('en-US');

  // Filters
  searchTerm = signal<string>('');
  selectedCategory = signal<string>('all');

  // Mass Adjustment
  adjustPercentage = signal<number>(0);
  applyToP1 = signal<boolean>(false);
  applyToP2 = signal<boolean>(false);
  applyToP3 = signal<boolean>(false);
  applyToP4 = signal<boolean>(false);

  filteredItems = computed(() => {
    let list = this.items();
    const cat = this.selectedCategory();
    if (cat !== 'all') {
      list = list.filter(i => i.type === cat);
    }
    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      list = list.filter(i => 
        i.code.toLowerCase().includes(term) || 
        i.name.toLowerCase().includes(term)
      );
    }
    return list;
  });

  async ngOnInit() {
    this.isLoading.set(true);
    await Promise.all([this.loadSettings(), this.loadItems()]);
    this.isLoading.set(false);
  }

  async loadSettings() {
    try {
      await this.tenantService.loadSettings();
      const settings = this.tenantService.tenantSettings();
      const p1 = settings.find((s: any) => s.key === 'price_name_1')?.value;
      const p2 = settings.find((s: any) => s.key === 'price_name_2')?.value;
      const p3 = settings.find((s: any) => s.key === 'price_name_3')?.value;
      const p4 = settings.find((s: any) => s.key === 'price_name_4')?.value;
      
      if (p1) this.priceName1.set(p1);
      if (p2) this.priceName2.set(p2);
      if (p3) this.priceName3.set(p3);
      if (p4) this.priceName4.set(p4);
      
      const currency = settings.find((s: any) => s.key === 'MONEDA_SIMBOLO')?.value;
      if (currency) this.currencySymbol.set(currency);

      const locale = settings.find((s: any) => s.key === 'MONEDA_LOCALE')?.value;
      if (locale) this.currencyLocale.set(locale);
    } catch (err) {
      console.error('Error loading settings', err);
    }
  }

  async loadItems() {
    try {
      const data: any[] = (await this.catalogService.getItems()) as any[]; // gets all
      // Ensure prices are initialized to a number so inputs work easily
      const processed = data.map((i: any) => ({
        ...i,
        cost: Number(i.cost || 0),
        price_1: Number(i.price_1 || 0),
        price_2: Number(i.price_2 || 0),
        price_3: Number(i.price_3 || 0),
        price_4: Number(i.price_4 || 0),
      }));
      this.items.set(processed);
      this.modifiedItems.set(new Set());
    } catch (err) {
      this.errorMessage.set('Error al cargar artículos');
      console.error(err);
    }
  }

  markAsModified(id: string) {
    const set = new Set(this.modifiedItems());
    set.add(id);
    this.modifiedItems.set(set);
  }

  applyMassAdjustment() {
    const percent = this.adjustPercentage();
    if (!percent || percent === 0) return;

    const factor = 1 + (percent / 100);
    const list = this.items();
    const filteredIds = new Set(this.filteredItems().map(i => i.id));
    
    let modified = false;

    const newList = list.map(item => {
      if (!filteredIds.has(item.id)) return item; // only apply to currently visible items
      
      let updated = false;
      const newItem = { ...item };

      if (this.applyToP1()) { newItem.price_1 = Number((item.price_1 * factor).toFixed(2)); updated = true; }
      if (this.applyToP2()) { newItem.price_2 = Number((item.price_2 * factor).toFixed(2)); updated = true; }
      if (this.applyToP3()) { newItem.price_3 = Number((item.price_3 * factor).toFixed(2)); updated = true; }
      if (this.applyToP4()) { newItem.price_4 = Number((item.price_4 * factor).toFixed(2)); updated = true; }

      if (updated) {
        this.markAsModified(item.id);
        modified = true;
      }
      return newItem;
    });

    if (modified) {
      this.items.set(newList);
      this.successMessage.set(`Ajuste del ${percent}% aplicado a ${filteredIds.size} artículos (Recuerda Guardar Cambios)`);
      setTimeout(() => this.successMessage.set(null), 4000);
    }
  }

  async saveChanges() {
    const modIds = this.modifiedItems();
    if (modIds.size === 0) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = this.items().filter(i => modIds.has(i.id)).map(i => ({
      id: i.id,
      cost: i.cost,
      price_1: i.price_1,
      price_2: i.price_2,
      price_3: i.price_3,
      price_4: i.price_4
    }));

    try {
      await (this.catalogService.bulkUpdatePrices(payload) as Promise<any>);
      this.successMessage.set(`¡Se han actualizado ${payload.length} precios correctamente!`);
      this.modifiedItems.set(new Set()); // clear modifications
    } catch (err) {
      this.errorMessage.set('Error al guardar los cambios masivos.');
      console.error(err);
    } finally {
      this.isSaving.set(false);
      setTimeout(() => this.successMessage.set(null), 4000);
    }
  }
}
