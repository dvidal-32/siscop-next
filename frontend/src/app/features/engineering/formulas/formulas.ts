import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EngineeringService } from '../../../core/services/engineering.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-formulas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './formulas.html',
})
export class FormulasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private engineeringService = inject(EngineeringService);
  private catalogService = inject(CatalogService);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Core Data
  templateId = signal<string>('');
  template = signal<any | null>(null);
  catalogItems = signal<any[]>([]);
  templates = signal<any[]>([]);

  // Editor State
  activePanel = signal<'variables' | 'components'>('variables');
  selectedComponent = signal<any | null>(null); // Componente seleccionado para editar fórmulas/reglas
  selectedComponentToEdit = signal<any | null>(null); // Componente seleccionado para editar sus propiedades
  selectedVariable = signal<any | null>(null); // Variable seleccionada para edición
  selectedRule = signal<any | null>(null); // Regla seleccionada para edición

  // Forms
  variableForm = this.fb.group({
    name: ['', [Validators.required]],
    label: ['', [Validators.required]],
    type: ['NUMBER', [Validators.required]],
    defaultValue: [''],
    isRequired: [true],
    minValue: [null as number | null],
    maxValue: [null as number | null],
    order: [0],
    itemCategory: [''], // Para ITEM_SELECTOR
  });

  componentForm = this.fb.group({
    name: ['', [Validators.required]],
    type: ['PROFILE', [Validators.required]],
    catalogItemId: [''],
    dynamicItemVariable: [''],
    order: [0],
  });

  formulaForm = this.fb.group({
    quantityFormula: ['1', [Validators.required]],
    widthFormula: [''],
    heightFormula: [''],
    lengthFormula: [''],
    areaFormula: [''],
  });

  ruleForm = this.fb.group({
    condition: ['', [Validators.required]],
    action: ['INCLUDE', [Validators.required]],
    priority: [0],
  });

  async ngOnInit() {
    // Auto-update component type when catalog item changes
    this.componentForm.get('catalogItemId')?.valueChanges.subscribe((itemId) => {
      if (itemId) {
        const item = this.catalogItems().find(i => i.id === itemId);
        if (item && item.type) {
          const mappedType = item.type.toUpperCase();
          if (['PROFILE', 'GLASS', 'ACCESSORY', 'SUPPLY', 'LABOR'].includes(mappedType)) {
            this.componentForm.patchValue({ type: mappedType }, { emitEvent: false });
          }
        }
      }
    });

    this.route.queryParams.subscribe(async (params) => {
      const id = params['templateId'];
      if (!id) {
        this.templateId.set('');
        this.template.set(null);
        this.isLoading.set(true);
        await this.loadAllTemplates();
        this.isLoading.set(false);
        return;
      }
      this.templateId.set(id);
      this.isLoading.set(true);
      await Promise.all([this.loadTemplate(), this.loadCatalogItems()]);
      this.isLoading.set(false);
    });
  }

  async loadAllTemplates() {
    try {
      const data = await this.engineeringService.getTemplates();
      this.templates.set(data);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error cargando plantillas');
    }
  }

  async loadTemplate() {
    try {
      const data = await this.engineeringService.getTemplate(this.templateId());
      this.template.set(data);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error cargando plantilla');
    }
  }

  async loadCatalogItems() {
    try {
      const data = await this.catalogService.getItems();
      this.catalogItems.set(data);
    } catch (err) {
      console.error('Error cargando artículos del catálogo', err);
    }
  }

  setPanel(panel: 'variables' | 'components') {
    this.activePanel.set(panel);
    this.selectedComponent.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  // ──────────────────────────────────────────
  // VARIABLES HANDLERS
  // ──────────────────────────────────────────

  async addVariable() {
    if (this.variableForm.invalid) {
      this.variableForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    const formVal = this.variableForm.value;

    try {
      const payload = {
        templateId: this.templateId(),
        name: formVal.name,
        label: formVal.label,
        type: formVal.type as any,
        defaultValue: formVal.defaultValue || undefined,
        isRequired: formVal.isRequired ?? true,
        minValue: formVal.minValue || undefined,
        maxValue: formVal.maxValue || undefined,
        order: formVal.order || 0,
        listOptions: formVal.type === 'ITEM_SELECTOR' && formVal.itemCategory ? { category: formVal.itemCategory } : undefined,
      };

      if (this.selectedVariable()) {
        await this.engineeringService.updateVariable(this.selectedVariable().id, payload);
        this.successMessage.set('Variable actualizada correctamente');
        this.selectedVariable.set(null);
      } else {
        await this.engineeringService.createVariable(payload);
        this.successMessage.set('Variable agregada correctamente');
      }

      this.variableForm.reset({
        name: '',
        label: '',
        type: 'NUMBER',
        defaultValue: '',
        isRequired: true,
        minValue: null,
        maxValue: null,
        order: 0,
        itemCategory: '',
      });
      await this.loadTemplate();
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al procesar variable');
    } finally {
      this.isLoading.set(false);
    }
  }

  editVariable(variable: any) {
    this.selectedVariable.set(variable);
    this.variableForm.patchValue({
      name: variable.name,
      label: variable.label,
      type: variable.type,
      defaultValue: variable.default_value || '',
      isRequired: variable.is_required,
      minValue: variable.min_value !== null ? Number(variable.min_value) : null,
      maxValue: variable.max_value !== null ? Number(variable.max_value) : null,
      order: variable.order || 0,
      itemCategory: variable.type === 'ITEM_SELECTOR' && variable.list_options?.category ? variable.list_options.category : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEditVariable() {
    this.selectedVariable.set(null);
    this.variableForm.reset({
      name: '',
      label: '',
      type: 'NUMBER',
      defaultValue: '',
      isRequired: true,
      minValue: null,
      maxValue: null,
      order: 0,
    });
  }

  async removeVariable(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta variable?')) return;

    this.isLoading.set(true);
    try {
      await this.engineeringService.deleteVariable(id);
      this.successMessage.set('Variable eliminada');
      if (this.selectedVariable()?.id === id) {
        this.selectedVariable.set(null);
      }
      await this.loadTemplate();
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al eliminar variable');
    } finally {
      this.isLoading.set(false);
    }
  }

  async moveVariable(index: number, direction: 'up' | 'down') {
    const list = [...(this.template()?.variables || [])];
    if (list.length < 2) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Swap elements in local copy
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    this.isLoading.set(true);
    try {
      // Re-save all orders in parallel to guarantee sequential ordering
      const promises = list.map((v, idx) => 
        this.engineeringService.updateVariable(v.id, { order: idx })
      );
      await Promise.all(promises);
      await this.loadTemplate();
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al reordenar variables');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ──────────────────────────────────────────
  // COMPONENTES HANDLERS
  // ──────────────────────────────────────────

  async addComponent() {
    if (this.componentForm.invalid) {
      this.componentForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    const formVal = this.componentForm.value;

    try {
      const payload = {
        templateId: this.templateId(),
        name: formVal.name,
        type: formVal.type as any,
        catalogItemId: formVal.catalogItemId || undefined,
        dynamicItemVariable: formVal.dynamicItemVariable || undefined,
        order: formVal.order || 0,
      };

      if (this.selectedComponentToEdit()) {
        await this.engineeringService.updateComponent(this.selectedComponentToEdit().id, payload);
        this.successMessage.set('Componente actualizado correctamente');
        this.selectedComponentToEdit.set(null);
      } else {
        await this.engineeringService.createComponent(payload);
        this.successMessage.set('Componente agregado correctamente');
      }

      this.componentForm.reset({
        name: '',
        type: 'PROFILE',
        catalogItemId: '',
        dynamicItemVariable: '',
        order: 0,
      });
      await this.loadTemplate();
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al procesar componente');
    } finally {
      this.isLoading.set(false);
    }
  }

  editComponentDetails(comp: any) {
    this.selectedComponentToEdit.set(comp);
    this.componentForm.patchValue({
      name: comp.name,
      type: comp.type,
      catalogItemId: comp.catalog_item_id || '',
      dynamicItemVariable: comp.dynamic_item_variable || '',
      order: comp.order || 0,
    });
  }

  cancelEditComponent() {
    this.selectedComponentToEdit.set(null);
    this.componentForm.reset({
      name: '',
      type: 'PROFILE',
      catalogItemId: '',
      dynamicItemVariable: '',
      order: 0,
    });
  }

  async moveComponent(index: number, direction: 'up' | 'down') {
    const list = [...(this.template()?.components || [])];
    if (list.length < 2) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Swap elements in local copy
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    this.isLoading.set(true);
    try {
      const promises = list.map((c, idx) => 
        this.engineeringService.updateComponent(c.id, { order: idx })
      );
      await Promise.all(promises);
      await this.loadTemplate();
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al reordenar componentes');
    } finally {
      this.isLoading.set(false);
    }
  }

  async removeComponent(id: string) {
    if (!confirm('¿Estás seguro de eliminar este componente del desglose?')) return;

    this.isLoading.set(true);
    try {
      await this.engineeringService.deleteComponent(id);
      this.successMessage.set('Componente eliminado');
      if (this.selectedComponent()?.id === id) {
        this.selectedComponent.set(null);
      }
      if (this.selectedComponentToEdit()?.id === id) {
        this.selectedComponentToEdit.set(null);
      }
      await this.loadTemplate();
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al eliminar componente');
    } finally {
      this.isLoading.set(false);
    }
  }

  selectComponent(comp: any) {
    this.selectedComponent.set(comp);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    // Patch Formulas
    this.formulaForm.reset({
      quantityFormula: comp.formula?.quantity_formula || '1',
      widthFormula: comp.formula?.width_formula || '',
      heightFormula: comp.formula?.height_formula || '',
      lengthFormula: comp.formula?.length_formula || '',
      areaFormula: comp.formula?.area_formula || '',
    });

    // Reset Rules Form
    this.ruleForm.reset({
      condition: '',
      action: 'INCLUDE',
      priority: 0,
    });
  }

  // ──────────────────────────────────────────
  // FÓRMULAS Y REGLAS HANDLERS
  // ──────────────────────────────────────────

  async saveFormula() {
    if (this.formulaForm.invalid || !this.selectedComponent()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formVal = this.formulaForm.value;

    try {
      await this.engineeringService.saveFormula({
        componentId: this.selectedComponent().id,
        quantityFormula: formVal.quantityFormula || '1',
        widthFormula: formVal.widthFormula || undefined,
        heightFormula: formVal.heightFormula || undefined,
        lengthFormula: formVal.lengthFormula || undefined,
        areaFormula: formVal.areaFormula || undefined,
      });

      this.successMessage.set('Fórmulas guardadas con éxito');
      await this.loadTemplate();
      // Recargar el componente seleccionado para actualizar UI
      const updatedComp = this.template().components.find((c: any) => c.id === this.selectedComponent().id);
      this.selectedComponent.set(updatedComp);
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al guardar fórmulas');
    } finally {
      this.isLoading.set(false);
    }
  }

  async addRule() {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.ruleForm.invalid || !this.selectedComponent()) {
      this.ruleForm.markAllAsTouched();
      this.errorMessage.set('Por favor, completa los campos obligatorios de la regla (la condición es requerida).');
      return;
    }

    this.isLoading.set(true);
    const formVal = this.ruleForm.value;

    try {
      if (this.selectedRule()) {
        await this.engineeringService.updateRule(this.selectedRule().id, {
          condition: formVal.condition,
          action: formVal.action,
          priority: formVal.priority !== null && formVal.priority !== undefined ? Number(formVal.priority) : 0,
        });
        this.successMessage.set('Regla condicional actualizada con éxito');
        this.selectedRule.set(null);
      } else {
        await this.engineeringService.createRule({
          componentId: this.selectedComponent().id,
          condition: formVal.condition,
          action: formVal.action,
          priority: formVal.priority !== null && formVal.priority !== undefined ? Number(formVal.priority) : 0,
        });
        this.successMessage.set('Regla condicional agregada con éxito');
      }

      this.ruleForm.reset({
        condition: '',
        action: 'INCLUDE',
        priority: 0,
      });
      await this.loadTemplate();
      const updatedComp = this.template().components.find((c: any) => c.id === this.selectedComponent().id);
      this.selectedComponent.set(updatedComp);
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      console.error('Error al procesar regla:', err);
      this.errorMessage.set(err?.error?.message || 'Error al procesar regla en el servidor');
    } finally {
      this.isLoading.set(false);
    }
  }

  editRule(rule: any) {
    this.selectedRule.set(rule);
    this.ruleForm.patchValue({
      condition: rule.condition,
      action: rule.action,
      priority: rule.priority || 0,
    });
  }

  cancelEditRule() {
    this.selectedRule.set(null);
    this.ruleForm.reset({
      condition: '',
      action: 'INCLUDE',
      priority: 0,
    });
  }

  async removeRule(ruleId: string) {
    if (!confirm('¿Estás seguro de eliminar esta regla?')) return;

    this.isLoading.set(true);
    try {
      await this.engineeringService.deleteRule(ruleId);
      this.successMessage.set('Regla eliminada');
      if (this.selectedRule()?.id === ruleId) {
        this.selectedRule.set(null);
      }
      await this.loadTemplate();
      const updatedComp = this.template().components.find((c: any) => c.id === this.selectedComponent().id);
      this.selectedComponent.set(updatedComp);
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al eliminar regla');
    } finally {
      this.isLoading.set(false);
    }
  }

  getComponentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      PROFILE: 'Perfil',
      GLASS: 'Vidrio',
      ACCESSORY: 'Accesorio',
      SUPPLY: 'Insumo',
      LABOR: 'Mano de Obra',
    };
    return labels[type?.toUpperCase()] || type || 'Desconocido';
  }
}
