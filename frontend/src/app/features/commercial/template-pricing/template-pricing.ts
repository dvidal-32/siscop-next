import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { EngineeringService } from '../../../core/services/engineering.service';
import { TenantService } from '../../../core/services/tenant.service';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
  selector: 'app-template-pricing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, InputNumberModule, RouterModule],
  templateUrl: './template-pricing.html',
})
export class TemplatePricingComponent implements OnInit {
  private engineeringService = inject(EngineeringService);
  private tenantService = inject(TenantService);
  private router = inject(Router);

  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  items = signal<any[]>([]);
  modifiedItems = signal<Set<string>>(new Set());

  // Settings
  priceName1 = signal<string>('Precio 1');
  priceName2 = signal<string>('Precio 2');
  priceName3 = signal<string>('Precio 3');
  priceName4 = signal<string>('Precio 4');
  currencySymbol = signal<string>('$');
  currencyLocale = signal<string>('en-US');

  // Filters
  searchTerm = signal<string>('');
  selectedSystem = signal<string>('all');
  systems = signal<any[]>([]);

  // Mass Adjustment
  adjustPercentage = signal<number>(0);
  applyToL1 = signal<boolean>(false);
  applyToL2 = signal<boolean>(false);
  applyToL3 = signal<boolean>(false);
  applyToL4 = signal<boolean>(false);

  filteredItems = computed(() => {
    let list = this.items();
    const sys = this.selectedSystem();
    if (sys !== 'all') {
      list = list.filter(i => i.system_id === sys);
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
    this.extractSystems();
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
      const data: any[] = await this.engineeringService.getTemplates();
      const processed = data.map((i: any) => ({
        ...i,
        area_price_l1: Number(i.area_price_l1 || 0),
        area_price_l2: Number(i.area_price_l2 || 0),
        area_price_l3: Number(i.area_price_l3 || 0),
        area_price_l4: Number(i.area_price_l4 || 0),
      }));
      this.items.set(processed);
      this.modifiedItems.set(new Set());
    } catch (err: any) {
      this.errorMessage.set('Error cargando plantillas');
    }
  }

  extractSystems() {
    const list = this.items();
    const map = new Map<string, any>();
    for (const item of list) {
      if (item.system) {
        map.set(item.system.id, item.system);
      }
    }
    this.systems.set(Array.from(map.values()));
  }

  markAsModified(id: string) {
    const current = new Set(this.modifiedItems());
    current.add(id);
    this.modifiedItems.set(current);
  }

  applyMassAdjustment() {
    const pct = this.adjustPercentage();
    if (!pct || pct === 0) return;
    const factor = 1 + (pct / 100);

    const currentItems = [...this.items()];
    let listModified = false;

    for (const item of currentItems) {
      if (item.pricing_method !== 'area') continue;

      let itemModified = false;
      if (this.applyToL1()) {
        item.area_price_l1 = Number((item.area_price_l1 * factor).toFixed(2));
        itemModified = true;
      }
      if (this.applyToL2()) {
        item.area_price_l2 = Number((item.area_price_l2 * factor).toFixed(2));
        itemModified = true;
      }
      if (this.applyToL3()) {
        item.area_price_l3 = Number((item.area_price_l3 * factor).toFixed(2));
        itemModified = true;
      }
      if (this.applyToL4()) {
        item.area_price_l4 = Number((item.area_price_l4 * factor).toFixed(2));
        itemModified = true;
      }

      if (itemModified) {
        this.markAsModified(item.id);
        listModified = true;
      }
    }

    if (listModified) {
      this.items.set(currentItems);
      this.successMessage.set(`Ajuste de ${pct}% aplicado correctamente.`);
      setTimeout(() => this.successMessage.set(null), 3000);
    }
  }

  async saveChanges() {
    if (this.modifiedItems().size === 0) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    
    try {
      const itemsToSave = this.items()
        .filter(i => this.modifiedItems().has(i.id))
        .map(i => ({
          id: i.id,
          pricing_method: i.pricing_method,
          area_price_l1: i.area_price_l1,
          area_price_l2: i.area_price_l2,
          area_price_l3: i.area_price_l3,
          area_price_l4: i.area_price_l4,
        }));

      await this.engineeringService.bulkUpdateTemplatePrices(itemsToSave);
      
      this.modifiedItems.set(new Set());
      this.successMessage.set('Cambios guardados correctamente.');
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error guardando los cambios.');
    } finally {
      this.isSaving.set(false);
    }
  }

  goToSimulator(id: string) {
    this.router.navigate(['/engineering/simulator'], { queryParams: { templateId: id } });
  }
}
