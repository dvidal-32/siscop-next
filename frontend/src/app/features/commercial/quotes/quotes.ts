import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormArray, FormGroup } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CommercialService } from '../../../core/services/commercial.service';
import { EngineeringService } from '../../../core/services/engineering.service';
import { TenantService } from '../../../core/services/tenant.service';
import { AuthService } from '../../../core/auth/auth.service';
import { TenantCurrencyPipe } from '../../../core/pipes/tenant-currency.pipe';

import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-quotes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, DecimalPipe, TenantCurrencyPipe],
  templateUrl: './quotes.html',
})
export class QuotesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private commercialService = inject(CommercialService);
  private engineeringService = inject(EngineeringService);
  private tenantService = inject(TenantService);
  private catalogService = inject(CatalogService);
  authService = inject(AuthService);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isSaving = signal<boolean>(false);

  quotes = signal<any[]>([]);
  projects = signal<any[]>([]);
  templates = signal<any[]>([]);
  catalogItems = signal<any[]>([]);
  finishes = signal<any[]>([]);

  filterProjectId = signal<string | null>(null);
  filterProjectName = signal<string | null>(null);

  tenantSettings = signal<any[]>([]);
  tenantData = signal<any | null>(null);

  extraVariablesMap = signal<{ [key: number]: any[] }>({});
  bodiesVarNameMap = signal<{ [key: number]: string }>({});
  simulatedPrices = signal<{ [key: number]: number | null }>({});

  isCreatingVersionFor = signal<string | null>(null);

  // Modals
  showCreateModal = signal<boolean>(false);
  showDetailModal = signal<boolean>(false);
  selectedQuote = signal<any | null>(null);
  selectedVersion = signal<any | null>(null);

  quoteToPrint = signal<any | null>(null);

  readonly STATUS_MAP: Record<string, { label: string; classes: string }> = {
    draft: { label: 'Borrador', classes: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400' },
    sent: { label: 'Enviada', classes: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' },
    approved: { label: 'Aprobada', classes: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' },
    rejected: { label: 'Rechazada', classes: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' },
    cancelled: { label: 'Cancelada', classes: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' },
  };

  quoteForm = this.fb.group({
    project_id: ['', [Validators.required]],
    client_name: [''],
    client_address: [''],
    client_phone: [''],
    client_tax_id: [''],
    quote_date: [new Date().toISOString().substring(0, 10)],
    margin: [1.3],
    discount: [0],
    include_tax: [true],
    payment_conditions: [''],
    products: this.fb.array([]),
  });

  get productsArray(): FormArray {
    return this.quoteForm.get('products') as FormArray;
  }

  private simulationTimeout: any;

  async ngOnInit() {
    const projectId = this.route.snapshot.queryParamMap.get('projectId');
    if (projectId) {
      this.filterProjectId.set(projectId);
    }
    await Promise.all([this.loadProjects(), this.loadTemplates(), this.loadQuotes(), this.loadCatalogItems(), this.loadFinishes()]);

    if (projectId) {
      const matched = this.projects().find((p) => p.id === projectId);
      if (matched) this.filterProjectName.set(matched.name);
    }

    await this.loadTenantSettings();

    // Auto-fill client details when project is selected
    this.quoteForm.get('project_id')?.valueChanges.subscribe(selectedProjectId => {
      if (selectedProjectId) {
        const project = this.projects().find(p => p.id === selectedProjectId);
        if (project?.client) {
          this.quoteForm.patchValue({
            client_name: project.client.name || '',
            client_address: project.client.address || '',
            client_phone: project.client.phone || '',
            client_tax_id: project.client.tax_id || ''
          }, { emitEvent: false });
        }
      } else {
        this.quoteForm.patchValue({
          client_name: '',
          client_address: '',
          client_phone: '',
          client_tax_id: ''
        }, { emitEvent: false });
      }
    });

    this.quoteForm.valueChanges.subscribe(() => {
      this.triggerSimulation();
    });
  }

  async loadCatalogItems() {
    try {
      const items = await this.catalogService.getItems();
      this.catalogItems.set(items);
    } catch (err) {
      console.error('Error loading catalog items', err);
    }
  }

  async loadFinishes() {
    try {
      const data = await this.catalogService.getFinishes();
      this.finishes.set(data.filter(f => f.is_active));
    } catch (err) {
      console.error('Error loading finishes', err);
    }
  }

  getParentCatalogItems() {
    return this.catalogItems().filter((item: any) => !item.base_item_id);
  }

  hasVariants(index: number): boolean {
    const group = this.productsArray.at(index);
    if (!group) return false;
    const catalogId = group.get('catalog_item_id')?.value;
    if (!catalogId) return false;
    const item = this.catalogItems().find((it: any) => it.id === catalogId);
    return item && item.variants && item.variants.length > 0;
  }

  getTemplateFinishVarName(index: number): string | null {
    const rowVars = this.extraVariablesMap()[index];
    if (!rowVars) return null;
    const finishVar = rowVars.find((v: any) => v.type === 'FINISH_SELECTOR');
    return finishVar ? finishVar.name : null;
  }

  triggerSimulation() {
    if (this.simulationTimeout) clearTimeout(this.simulationTimeout);
    this.simulationTimeout = setTimeout(() => this.runSimulations(), 600);
  }

  async runSimulations() {
    if (!this.showCreateModal()) return;
    
    const margin = Number(this.quoteForm.get('margin')?.value) || 1.0;
    const raw = this.quoteForm.getRawValue();
    const newPrices = { ...this.simulatedPrices() };
    
    for (let i = 0; i < this.productsArray.length; i++) {
      const p: any = raw.products?.[i];
      
      if (p.item_type === 'catalog_item') {
        let item = this.catalogItems().find(it => it.id === p.catalog_item_id);
        
        // --- RESOLUCIÓN DE ACABADO PARA INVENTARIO DIRECTO ---
        if (item && item.variants && item.variants.length > 0 && p.catalog_finish_id) {
          const child = item.variants.find((v: any) => v.finish_id === p.catalog_finish_id);
          if (child) {
            item = child; // Usar el costo del hijo
          }
        }

        if (item) {
          const cost = Number(item.cost || 0);
          newPrices[i] = cost * (p.quantity || 1);
        } else {
          newPrices[i] = null;
        }
        continue;
      }
      if (!p || !p.template_id) continue;
      
      const tmpl = this.templates().find(t => t.id === p.template_id);
      if (tmpl && tmpl.pricing_method !== 'area') {
        const vars = { ...(p.variables || {}) };
        vars['ANCHO'] = Number(p.width);
        vars['ALTO'] = Number(p.height);
        vars['W'] = Number(p.width);
        vars['H'] = Number(p.height);
        vars['CUERPOS'] = Number(p.bodies || 1);
        
        const originalVarName = this.bodiesVarNameMap()[i];
        if (originalVarName) {
          vars[originalVarName] = Number(p.bodies || 1);
        }

        try {
          // Usar el servicio de ingeniería para simular
          const tenantId = this.tenantData()?.id;
          const res = await this.engineeringService.simulate(p.template_id, vars);
          if (res && res.totalMaterialCost !== undefined) {
             newPrices[i] = res.totalMaterialCost * margin;
          } else {
             newPrices[i] = null;
          }
        } catch (e) {
          newPrices[i] = null;
        }
      }
    }
    
    this.simulatedPrices.set(newPrices);
  }

  async loadTenantSettings() {
    try {
      const user = this.authService.currentUser();
      if (user?.tenantId) {
        const tenant = await this.tenantService.get(user.tenantId);
        this.tenantData.set(tenant);
      }
      const settings = await this.tenantService.getSettings();
      this.tenantSettings.set(settings);
    } catch (err) {
      console.error('Error cargando configuracion de la empresa', err);
    }
  }

  getFullAddress(): string {
    const t = this.tenantData();
    if (!t) return 'Dirección no especificada';
    const parts = [t.street, t.number, t.municipality, t.city, t.country].filter(p => !!p);
    return parts.length > 0 ? parts.join(', ') : 'Dirección no especificada';
  }

  async loadProjects() {
    try {
      const data = await this.commercialService.getProjects();
      this.projects.set(data);
    } catch { /* silent */ }
  }

  async loadTemplates() {
    try {
      const data = await this.engineeringService.getTemplates();
      this.templates.set(data.filter((t: any) => t.is_active));
    } catch { /* silent */ }
  }

  async loadQuotes() {
    this.isLoading.set(true);
    try {
      const data = await this.commercialService.getQuotes(this.filterProjectId() ?? undefined);
      this.quotes.set(data);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al cargar cotizaciones');
    } finally {
      this.isLoading.set(false);
    }
  }

  clearFilter() {
    this.filterProjectId.set(null);
    this.filterProjectName.set(null);
    this.loadQuotes();
  }

  onEnter(event: Event) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
      event.preventDefault();
      const form = target.closest('form');
      if (!form) return;
      
      const formElements = Array.from(form.querySelectorAll('input, select')) as HTMLElement[];
      const focusable = formElements.filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1);
      
      const index = focusable.indexOf(target);
      if (index > -1) {
        if (index === focusable.length - 1) {
          // We are at the very last input/select of the form (end of the last product)
          const lastProductIndex = this.productsArray.length - 1;
          this.addProduct(lastProductIndex);
          // Wait for Angular to render the new row, then focus its first element (the select template)
          setTimeout(() => {
            const updatedElements = Array.from(form.querySelectorAll('input, select')) as HTMLElement[];
            const targetIndexInNewList = updatedElements.indexOf(target);
            if (targetIndexInNewList > -1 && updatedElements[targetIndexInNewList + 1]) {
              updatedElements[targetIndexInNewList + 1].focus();
            }
          }, 50);
        } else {
          // Move focus to the next element
          const nextElement = focusable[index + 1];
          nextElement.focus();
          // Also select the text if it's an input for faster editing
          if (nextElement.tagName === 'INPUT') {
            (nextElement as HTMLInputElement).select();
          }
        }
      }
    }
  }

  // ──────────────────────────────────────────
  // CREATE QUOTE
  // ──────────────────────────────────────────

  openCreate() {
    this.isCreatingVersionFor.set(null);
    this.quoteForm.reset({
      project_id: this.filterProjectId() ?? '',
      client_name: '',
      client_address: '',
      client_phone: '',
      client_tax_id: '',
      quote_date: new Date().toISOString().substring(0, 10),
      margin: 1.3,
      discount: 0,
      include_tax: true,
      payment_conditions: ''
    });
    while (this.productsArray.length) this.productsArray.removeAt(0);
    this.extraVariablesMap.set({});
    this.addProduct();
    this.showCreateModal.set(true);
  }

  async openCreateVersion(quoteItem: any) {
    if (!confirm('Estás a punto de crear una nueva versión de esta cotización. Todos los cálculos, costos y reglas de ventas mínimas se actualizarán automáticamente a las políticas actuales del catálogo.\n\n¿Deseas continuar?')) {
      return;
    }

    this.isCreatingVersionFor.set(quoteItem.id);

    let quote;
    try {
      this.isLoading.set(true);
      quote = await this.commercialService.getQuote(quoteItem.id);
    } catch (err) {
      this.errorMessage.set('Error al cargar detalles de la cotización');
      this.isLoading.set(false);
      return;
    } finally {
      this.isLoading.set(false);
    }

    const currentVer = quote.versions?.find((v: any) => v.is_current) || quote.versions?.[0];
    const matchedProject = this.projects().find(p => p.id === quote.project_id);

    this.quoteForm.reset({
      project_id: quote.project_id,
      client_name: matchedProject?.client?.name || '',
      client_address: matchedProject?.client?.address || '',
      client_phone: matchedProject?.client?.phone || '',
      client_tax_id: matchedProject?.client?.tax_id || '',
      quote_date: quote.created_at ? new Date(quote.created_at).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      margin: currentVer?.margin ?? 1.3,
      discount: currentVer?.discount ?? 0,
      include_tax: currentVer?.tax > 0,
      payment_conditions: currentVer?.payment_conditions ?? ''
    });

    while (this.productsArray.length) this.productsArray.removeAt(0);
    this.extraVariablesMap.set({});

    if (currentVer?.products) {
      for (let i = 0; i < currentVer.products.length; i++) {
        const prod = currentVer.products[i];
        this.addProduct();
        
        const itemType = prod.item_type || (prod.catalog_item_id ? 'catalog_item' : 'template');
        this.productsArray.at(i).get('item_type')?.setValue(itemType);

        let catalogItemId = prod.catalog_item_id;
        let catalogFinishId = prod.catalog_finish_id;
        
        if (itemType === 'catalog_item' && catalogItemId) {
          const isParent = this.getParentCatalogItems().some((it: any) => it.id === catalogItemId);
          if (!isParent) {
            const parent = this.getParentCatalogItems().find((it: any) => it.variants?.some((v: any) => v.id === catalogItemId));
            if (parent) {
              const variant = parent.variants.find((v: any) => v.id === catalogItemId);
              if (variant) {
                catalogFinishId = variant.finish_id;
              }
              catalogItemId = parent.id;
            }
          }
        }

        this.productsArray.at(i).patchValue({
          template_id: prod.template_id,
          catalog_item_id: catalogItemId,
          catalog_finish_id: catalogFinishId
        });

        if (itemType === 'catalog_item') {
          this.onCatalogItemSelect(i);
        } else {
          await this.onTemplateSelect(i);
        }

        this.productsArray.at(i).patchValue({
          name: prod.name,
          width: Number(prod.width) || 1000,
          height: Number(prod.height) || 1000,
          bodies: Number(this.getProductBodies(prod)) || 1,
          quantity: Number(prod.quantity) || 1,
          notes: prod.notes
        });

        if (prod.engineering_snapshot?.inputVariables) {
          const varsGroup = this.productsArray.at(i).get('variables') as FormGroup;
          const patchObj: any = {};
          Object.keys(varsGroup.controls).forEach(key => {
            if (prod.engineering_snapshot.inputVariables[key] !== undefined) {
              patchObj[key] = prod.engineering_snapshot.inputVariables[key];
            }
          });
          varsGroup.patchValue(patchObj, { emitEvent: false });
        }
      }
    }

    this.showCreateModal.set(true);
    
    // Forzar la simulación para que se recalcule el precio de costo inmediatamente con las reglas vigentes
    await this.runSimulations();
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    while (this.productsArray.length) this.productsArray.removeAt(0);
    this.extraVariablesMap.set({});
  }

  addProduct(cloneFromIndex?: number) {
    let initialTemplateId = '';
    let initialName = '';
    let initialExtras: any[] | undefined = undefined;

    let initialItemType = 'template';
    let initialCatalogId = '';

    if (cloneFromIndex !== undefined && cloneFromIndex >= 0 && cloneFromIndex < this.productsArray.length) {
      const prevGroup = this.productsArray.at(cloneFromIndex);
      initialItemType = prevGroup.get('item_type')?.value || 'template';
      initialTemplateId = prevGroup.get('template_id')?.value || '';
      initialCatalogId = prevGroup.get('catalog_item_id')?.value || '';
      initialExtras = this.extraVariablesMap()[cloneFromIndex];
    }
    
    if (initialItemType === 'template' && initialTemplateId) {
       const tmpl = this.templates().find((t: any) => t.id === initialTemplateId);
       if (tmpl) initialName = tmpl.name;
    } else if (initialItemType === 'catalog_item' && initialCatalogId) {
       const item = this.catalogItems().find((it: any) => it.id === initialCatalogId);
       if (item) initialName = item.name;
    }

    const group = this.fb.group({
      item_type: [initialItemType, [Validators.required]],
      template_id: [initialTemplateId],
      catalog_item_id: [initialCatalogId],
      catalog_finish_id: [''],
      name: [initialName, [Validators.required]],
      width: [1000, [Validators.required, Validators.min(1)]],
      height: [1000, [Validators.required, Validators.min(1)]],
      bodies: [1, [Validators.required, Validators.min(1)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      notes: [''],
      variables: this.fb.group({}),
    });
    
    // Configurar habilitación inicial
    if (initialItemType === 'catalog_item') {
      group.get('template_id')?.disable({ emitEvent: false });
      group.get('bodies')?.disable({ emitEvent: false });
      
      let enableWidth = false;
      let enableHeight = false;
      
      if (initialCatalogId) {
        const item = this.catalogItems().find((it: any) => it.id === initialCatalogId);
        const unit = (item?.unit || '').toLowerCase();
        if (['m', 'pl'].includes(unit)) {
          enableWidth = true;
        } else if (['m2', 'p2'].includes(unit)) {
          enableWidth = true;
          enableHeight = true;
        }
      }
      
      if (!enableWidth) group.get('width')?.disable({ emitEvent: false });
      if (!enableHeight) group.get('height')?.disable({ emitEvent: false });
    } else {
      group.get('catalog_item_id')?.disable({ emitEvent: false });
      group.get('template_id')?.setValidators([Validators.required]);
    }

    // Escuchar cambios de item_type
    group.get('item_type')?.valueChanges.subscribe((type) => {
      if (type === 'catalog_item') {
        group.get('template_id')?.disable({ emitEvent: false });
        group.get('template_id')?.clearValidators();
        group.get('width')?.disable({ emitEvent: false });
        group.get('height')?.disable({ emitEvent: false });
        group.get('bodies')?.disable({ emitEvent: false });
        
        group.get('catalog_item_id')?.enable({ emitEvent: false });
        group.get('catalog_item_id')?.setValidators([Validators.required]);
        group.patchValue({ name: '', template_id: null, variables: {} });
        
        // Limpiar extra variables map
        const newIndex = this.productsArray.controls.indexOf(group);
        if (newIndex >= 0) {
          const currentMap = { ...this.extraVariablesMap() };
          delete currentMap[newIndex];
          this.extraVariablesMap.set(currentMap);
        }
      } else {
        group.get('catalog_item_id')?.disable({ emitEvent: false });
        group.get('catalog_item_id')?.clearValidators();
        
        group.get('template_id')?.enable({ emitEvent: false });
        group.get('template_id')?.setValidators([Validators.required]);
        group.get('width')?.enable({ emitEvent: false });
        group.get('height')?.enable({ emitEvent: false });
        group.get('bodies')?.enable({ emitEvent: false });
        group.patchValue({ name: '', catalog_item_id: null, catalog_finish_id: null });
      }
      group.get('template_id')?.updateValueAndValidity();
      group.get('catalog_item_id')?.updateValueAndValidity();
      
      this.triggerSimulation();
    });

    this.productsArray.push(group);

    const newIndex = this.productsArray.length - 1;

    if (initialTemplateId && initialExtras) {
      const varsGroup = this.productsArray.at(newIndex).get('variables') as FormGroup;
      initialExtras.forEach((v: any) => {
        varsGroup.addControl(v.name, this.fb.control(
          v.type === 'BOOLEAN' ? (v.default_value === 'true') : (Number(v.default_value) || 0),
          v.is_required ? [Validators.required] : []
        ));
      });
      
      const currentMap = { ...this.extraVariablesMap() };
      currentMap[newIndex] = initialExtras;
      this.extraVariablesMap.set(currentMap);
    }
    
    if (cloneFromIndex !== undefined && cloneFromIndex >= 0 && cloneFromIndex < this.productsArray.length) {
      const initialBodiesVar = this.bodiesVarNameMap()[cloneFromIndex];
      if (initialBodiesVar) {
        const bodiesMap = { ...this.bodiesVarNameMap() };
        bodiesMap[newIndex] = initialBodiesVar;
        this.bodiesVarNameMap.set(bodiesMap);
      }
    }
  }

  removeProduct(index: number) {
    this.productsArray.removeAt(index);
    const newMap = { ...this.extraVariablesMap() };
    delete newMap[index];
    this.extraVariablesMap.set(newMap);

    const newBodiesMap = { ...this.bodiesVarNameMap() };
    delete newBodiesMap[index];
    this.bodiesVarNameMap.set(newBodiesMap);
  }

  getCalculatedArea(index: number): number {
    const group = this.productsArray.at(index);
    if (!group) return 0;
    
    const w = group.get('width')?.value || 0;
    const h = group.get('height')?.value || 0;

    if (group.get('item_type')?.value === 'catalog_item') {
      const catalogId = group.get('catalog_item_id')?.value;
      const item = this.catalogItems().find(it => it.id === catalogId);
      if (item) {
        const unit = (item.unit || '').toLowerCase();
        if (['m2', 'p2'].includes(unit)) {
          if (unit === 'p2') return (w / 304.8) * (h / 304.8);
          return (w / 1000) * (h / 1000);
        } else if (['m', 'pl'].includes(unit)) {
          if (unit === 'pl') return (w / 304.8);
          return (w / 1000);
        }
      }
      return 0;
    }

    const templateId = group.get('template_id')?.value;
    const tmpl = this.templates().find(t => t.id === templateId);
    
    let calculatedArea = 0;
    if (tmpl?.area_unit === 'sqft') {
      calculatedArea = (w / 304.8) * (h / 304.8);
    } else {
      calculatedArea = (w / 1000) * (h / 1000);
    }

    if (tmpl?.pricing_method === 'area' && tmpl?.minimum_areas && Array.isArray(tmpl.minimum_areas) && tmpl.minimum_areas.length > 0) {
      const bodies = Number(group.get('bodies')?.value) || 1;

      // El backend hace match exacto por cantidad de cuerpos
      const matched = tmpl.minimum_areas.find((m: any) => Number(m.bodies) === bodies);

      if (matched && matched.min_area) {
        const minAreaNum = Number(matched.min_area);
        if (calculatedArea < minAreaNum) {
          calculatedArea = minAreaNum;
        }
      }
    }

    return calculatedArea;
  }

  getCalculatedPrice(index: number): number | null {
    const group = this.productsArray.at(index);
    if (!group) return null;
    
    if (group.get('item_type')?.value === 'catalog_item') {
      const catalogId = group.get('catalog_item_id')?.value;
      const item = this.catalogItems().find(it => it.id === catalogId);
      return item ? Number(item.cost || 0) : null;
    }

    const templateId = group.get('template_id')?.value;
    const tmpl = this.templates().find(t => t.id === templateId);
    if (!tmpl) return null;
    
    if (tmpl.pricing_method === 'area') {
      const projectId = this.quoteForm.get('project_id')?.value;
      const project = this.projects().find(p => p.id === projectId);
      const level = project?.client?.price_list_level || 1;
      let price = tmpl['area_price_l' + level];
      if (!price) price = tmpl.area_price_l1 || 0;
      return Number(price);
    }
    
    // Si es por costo, retornamos el precio simulado
    const simulated = this.simulatedPrices()[index];
    return simulated !== undefined ? simulated : null;
  }

  getCalculatedTotal(index: number): number | null {
    const price = this.getCalculatedPrice(index);
    if (price === null) return null;
    
    const group = this.productsArray.at(index);
    if (!group) return null;
    const qty = group.get('quantity')?.value || 1;
    
    if (group.get('item_type')?.value === 'catalog_item') {
      const catalogId = group.get('catalog_item_id')?.value;
      const item = this.catalogItems().find(it => it.id === catalogId);
      if (item) {
        const unit = (item.unit || '').toLowerCase();
        if (['m2', 'p2', 'm', 'pl'].includes(unit)) {
          const computedValue = this.getCalculatedArea(index);
          return price * computedValue * qty;
        }
      }
      return price * qty;
    }
    
    const templateId = group.get('template_id')?.value;
    const tmpl = this.templates().find(t => t.id === templateId);
    if (!tmpl) return null;

    if (tmpl.pricing_method === 'area') {
      const area = this.getCalculatedArea(index);
      return price * area * qty;
    }
    
    // Si es por costo, el precio (unit_price) ya incluye todo, solo multiplicamos por la cantidad (huecos)
    return price * qty;
  }

  getLiveSubtotal(): number | null {
    let subtotal = 0;
    let hasCostItems = false;
    for (let i = 0; i < this.productsArray.length; i++) {
      const tot = this.getCalculatedTotal(i);
      if (tot === null) {
        hasCostItems = true;
      } else {
        subtotal += tot;
      }
    }
    return hasCostItems ? null : subtotal;
  }

  getLiveDiscount(): number {
    return Number(this.quoteForm.get('discount')?.value) || 0;
  }

  getLiveTax(): number | null {
    const sub = this.getLiveSubtotal();
    if (sub === null) return null;
    if (!this.quoteForm.get('include_tax')?.value) return 0;
    const net = sub - this.getLiveDiscount();
    const rate = Number(this.getSetting('IMPUESTOS_PORCENTAJE')) || 18;
    return (net > 0 ? net : 0) * (rate / 100);
  }

  getLiveTotal(): number | null {
    const sub = this.getLiveSubtotal();
    if (sub === null) return null;
    const tax = this.getLiveTax() || 0;
    const net = sub - this.getLiveDiscount();
    return (net > 0 ? net : 0) + tax;
  }

  onCatalogItemSelect(index: number) {
    const catalogId = this.productsArray.at(index).get('catalog_item_id')?.value;
    const item = this.catalogItems().find(it => it.id === catalogId);
    if (item) {
      const group = this.productsArray.at(index);
      group.get('name')?.setValue(item.name);
      
      group.get('width')?.disable();
      group.get('height')?.disable();
      
      const unit = (item.unit || '').toLowerCase();
      if (['m', 'pl'].includes(unit)) {
        group.get('width')?.enable();
      } else if (['m2', 'p2'].includes(unit)) {
        group.get('width')?.enable();
        group.get('height')?.enable();
      }
      
      this.triggerSimulation();
    }
  }

  async onTemplateSelect(index: number) {
    const templateId = this.productsArray.at(index).get('template_id')?.value;
    const tmpl = this.templates().find((t) => t.id === templateId);
    if (tmpl) {
      this.productsArray.at(index).get('name')?.setValue(tmpl.name);

      try {
        const detail = await this.engineeringService.getTemplate(templateId);
        const varsGroup = this.productsArray.at(index).get('variables') as FormGroup;

        Object.keys(varsGroup.controls).forEach(k => varsGroup.removeControl(k));

        const extras: any[] = [];
        if (detail.variables) {
          detail.variables.forEach((v: any) => {
            const upperName = v.name.toUpperCase();
            const upperLabel = (v.label || '').toUpperCase();
            
            const isWidthHeight = upperName === 'W' || upperName === 'H' || upperName === 'ANCHO' || upperName === 'ALTO';
            const isBodies = upperName.includes('CUERPO') || upperName.includes('NAVE') || upperLabel.includes('CUERPO') || upperLabel.includes('NAVE');

            if (!isWidthHeight && !isBodies) {
              extras.push(v);
              varsGroup.addControl(v.name, this.fb.control(
                v.type === 'BOOLEAN' ? (v.default_value === 'true') : (Number(v.default_value) || 0),
                v.is_required ? [Validators.required] : []
              ));
            } else if (isBodies) {
              const currentBodiesMap = { ...this.bodiesVarNameMap() };
              currentBodiesMap[index] = v.name;
              this.bodiesVarNameMap.set(currentBodiesMap);
            }
          });
        }

        const currentMap = { ...this.extraVariablesMap() };
        currentMap[index] = extras;
        this.extraVariablesMap.set(currentMap);
      } catch (err) {
        console.error('Error cargando detalles de plantilla', err);
      }
    }
  }

  async saveQuote(printAfterSave: boolean = false) {
    if (this.quoteForm.invalid) return;
    this.isSaving.set(true);
    this.errorMessage.set(null);

    try {
      const raw = this.quoteForm.getRawValue();
      const payload = {
        project_id: raw.project_id,
        margin: Number(raw.margin) || 1.0,
        discount: Number(raw.discount) || 0,
        include_tax: raw.include_tax,
        payment_conditions: raw.payment_conditions,
        products: (raw.products || []).map((p: any, i: number) => {
          const vars = { ...(p.variables || {}) };
          // Siempre enviamos CUERPOS para el motor de ventas minimas
          vars['CUERPOS'] = Number(p.bodies || 1);
          // Tambien enviamos la variable original para que el motor de formulas funcione si usa otro nombre
          const originalVarName = this.bodiesVarNameMap()[i];
          if (originalVarName) {
            vars[originalVarName] = Number(p.bodies || 1);
          }
          
          let finalCatalogItemId = p.catalog_item_id;
          let finalName = p.name;
          
          if (p.item_type === 'catalog_item' && finalCatalogItemId && p.catalog_finish_id) {
            const item = this.catalogItems().find(it => it.id === finalCatalogItemId);
            if (item && item.variants && item.variants.length > 0) {
              const child = item.variants.find((v: any) => v.finish_id === p.catalog_finish_id);
              if (child) {
                finalCatalogItemId = child.id;
                finalName = child.name || p.name;
              }
            }
          } else if (p.item_type === 'template' && p.template_id) {
            const rowVars = this.extraVariablesMap()[i];
            if (rowVars) {
              const finishVar = rowVars.find((v: any) => v.type === 'FINISH_SELECTOR');
              if (finishVar && vars[finishVar.name]) {
                const finishObj = this.finishes().find(f => f.id === vars[finishVar.name]);
                if (finishObj) {
                  let stripped = true;
                  while(stripped) {
                    stripped = false;
                    this.finishes().forEach(f => {
                      const suffixParen = `(${f.name})`;
                      if (finalName.trim().endsWith(suffixParen)) {
                        finalName = finalName.trim().substring(0, finalName.trim().length - suffixParen.length).trim();
                        stripped = true;
                      }
                      const suffixNaked = f.name;
                      if (finalName.trim().endsWith(suffixNaked)) {
                        finalName = finalName.trim().substring(0, finalName.trim().length - suffixNaked.length).trim();
                        stripped = true;
                      }
                    });
                  }
                  finalName = `${finalName} ${finishObj.name}`;
                }
              }
            }
          }
          
          return {
            ...p,
            name: finalName,
            catalog_item_id: finalCatalogItemId,
            width: Number(p.width) || 1,
            height: Number(p.height) || 1,
            quantity: Number(p.quantity) || 1,
            variables: vars
          };
        }),
      };

      let savedQuoteId: string | null = null;
      if (this.isCreatingVersionFor()) {
        await this.commercialService.createQuoteVersion(this.isCreatingVersionFor()!, payload);
        savedQuoteId = this.isCreatingVersionFor()!;
        this.successMessage.set('Nueva versión creada correctamente');
      } else {
        const createdQuote = await this.commercialService.createQuote(payload);
        savedQuoteId = createdQuote?.id;
        this.successMessage.set('Cotización creada correctamente');
      }

      this.closeCreateModal();
      await this.loadQuotes();
      setTimeout(() => this.successMessage.set(null), 3000);

      if (printAfterSave && savedQuoteId) {
        // Wait a small delay to allow modal close animation and state update
        setTimeout(() => {
          this.printQuote({ id: savedQuoteId });
        }, 300);
      }
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al crear cotización');
    } finally {
      this.isSaving.set(false);
    }
  }

  // ──────────────────────────────────────────
  // PRINT QUOTE
  // ──────────────────────────────────────────
  async printQuote(quoteItem: any, specificVersionId?: string) {
    try {
      this.isLoading.set(true);
      const fullQuote = await this.commercialService.getQuote(quoteItem.id);

      if (specificVersionId && fullQuote.versions) {
        fullQuote.versions.forEach((v: any) => {
          v.is_current = (v.id === specificVersionId);
        });
      }

      // Calculate subtotals for the view if missing
      const currentVer = fullQuote.versions?.find((v: any) => v.is_current) || fullQuote.versions?.[0];
      if (currentVer && currentVer.products) {
        currentVer.subtotal_bruto = currentVer.products.reduce((acc: number, p: any) => acc + Number(p.total_price || 0), 0);
      }

      this.quoteToPrint.set(fullQuote);

      // Give Angular time to render the #printable-quote div
      setTimeout(async () => {
        try {
          const settings = await this.tenantService.getSettings();
          this.tenantSettings.set(settings);
        } catch (err) {
          console.error('Error cargando settings de la empresa', err);
        }
        window.print();
        this.isLoading.set(false);
      }, 300);

    } catch (err) {
      this.errorMessage.set('Error al cargar cotización para imprimir');
      console.error(err);
      this.isLoading.set(false);
    }
  }

  getSetting(key: string): string {
    const setting = this.tenantSettings().find(s => s.key === key);
    return setting?.value || '';
  }

  // ──────────────────────────────────────────
  // DELETE QUOTE
  // ──────────────────────────────────────────

  async openDetail(quote: any) {
    this.isLoading.set(true);
    try {
      const data = await this.commercialService.getQuote(quote.id);
      this.selectedQuote.set(data);
      this.selectedVersion.set(data.versions?.find((v: any) => v.is_current) ?? data.versions?.[0] ?? null);
      this.showDetailModal.set(true);
    } catch (err: any) {
      this.errorMessage.set('Error al cargar la cotización');
    } finally {
      this.isLoading.set(false);
    }
  }

  closeDetailModal() {
    this.showDetailModal.set(false);
    this.selectedQuote.set(null);
    this.selectedVersion.set(null);
  }

  selectVersion(version: any) {
    this.selectedVersion.set(version);
  }

  async approveQuote() {
    if (!this.selectedQuote()) return;
    if (!confirm('¿Aprobar esta cotización?')) return;
    try {
      await this.commercialService.approveQuote(this.selectedQuote().id);
      this.successMessage.set('Cotización aprobada');
      this.closeDetailModal();
      await this.loadQuotes();
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al aprobar');
    }
  }

  async markSent() {
    if (!this.selectedQuote()) return;
    try {
      await this.commercialService.updateQuoteStatus(this.selectedQuote().id, 'sent');
      this.successMessage.set('Cotización marcada como enviada');
      this.closeDetailModal();
      await this.loadQuotes();
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al actualizar estado');
    }
  }

  async deleteQuote(quote: any) {
    if (!confirm(`¿Eliminar la cotización ${quote.code}?`)) return;
    try {
      await this.commercialService.deleteQuote(quote.id);
      this.successMessage.set('Cotización eliminada');
      await this.loadQuotes();
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al eliminar');
    }
  }

  getStatusInfo(status: string) {
    return this.STATUS_MAP[status] ?? { label: status, classes: 'bg-slate-100 text-slate-500' };
  }

  getProductBodies(prod: any): string {
    if (!prod) return '-';
    
    // El backend puede devolver engineering_snapshot como string o como objeto dependiendo del driver
    let snapshot = prod.engineering_snapshot;
    if (typeof snapshot === 'string') {
      try {
        snapshot = JSON.parse(snapshot);
      } catch (e) {
        snapshot = {};
      }
    }

    // Prioridad 1: Buscar directamente en inputVariables (lo que el usuario ingresó)
    if (snapshot && snapshot.inputVariables) {
      const keys = Object.keys(snapshot.inputVariables);
      for (const key of keys) {
        if (key.toUpperCase() === 'CUERPOS' || key.toUpperCase() === 'NAVES') {
          return String(snapshot.inputVariables[key]);
        }
      }
    }

    // Prioridad 2: El cuerpo procesado por el backend
    if (snapshot && snapshot.bodies !== undefined && snapshot.bodies !== null) {
      return String(snapshot.bodies);
    }
    
    // Fallback por si acaso
    if (prod.variables) {
      const keys = Object.keys(prod.variables);
      for (const key of keys) {
        if (key.toUpperCase() === 'CUERPOS' || key.toUpperCase() === 'NAVES') {
          return String(prod.variables[key]);
        }
      }
    }
    return '-';
  }
}
