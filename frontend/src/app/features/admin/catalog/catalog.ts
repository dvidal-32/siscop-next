import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CatalogService } from '../../../core/services/catalog.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './catalog.html',
})
export class CatalogItemsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private catalogService = inject(CatalogService);
  authService = inject(AuthService);

  activeTab = signal<'profile' | 'glass' | 'accessory' | 'supply'>('profile');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Data Lists
  items = signal<any[]>([]);
  systems = signal<any[]>([]); // To populate lines/systems dropdown for profiles
  finishes = signal<any[]>([]); // To populate finishes for variants
  selectedSystemFilter = signal<string>('all');

  // Modal State
  showModal = signal<boolean>(false);
  showVariantsModal = signal<boolean>(false);
  selectedItem = signal<any | null>(null);

  itemForm = this.fb.group({
    code: ['', [Validators.required]],
    name: ['', [Validators.required]],
    description: [''],
    type: ['profile', [Validators.required]],
    unit: ['m', [Validators.required]],
    cost: [0, [Validators.required, Validators.min(0)]],
    isActive: [true],
    image: [''],

    // Specific to profiles
    weightPerMeter: [0, [Validators.min(0)]],
    standardLength: [6.10, [Validators.min(0)]],
    systemId: [''],

    // Specific to glass
    thicknessMm: [0, [Validators.min(0)]],
    glassType: ['monolithic'], // monolithic, tempered, laminated, double
    weightPerM2: [0, [Validators.min(0)]],
  });

  async ngOnInit() {
    this.isLoading.set(true);
    await Promise.all([this.loadItems(), this.loadSystems(), this.loadFinishes()]);
    this.isLoading.set(false);
  }

  async loadFinishes() {
    try {
      const data = await this.catalogService.getFinishes();
      this.finishes.set(data.filter(f => f.is_active));
    } catch (err) {
      console.error('Error cargando acabados', err);
    }
  }

  async loadItems() {
    try {
      const data = await this.catalogService.getItems();
      this.items.set(data);
    } catch (err) {
      console.error('Error cargando catálogo', err);
    }
  }

  async loadSystems() {
    try {
      const data = await this.catalogService.getSystems();
      this.systems.set(data.filter(s => s.is_active));
    } catch (err) {
      console.error('Error cargando sistemas', err);
    }
  }

  setTab(tab: 'profile' | 'glass' | 'accessory' | 'supply') {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  getFilteredItems() {
    let list = this.items().filter(item => item.type === this.activeTab());
    const filter = this.selectedSystemFilter();
    if (filter === 'none') {
      list = list.filter(item => !item.system_id);
    } else if (filter !== 'all') {
      list = list.filter(item => item.system_id === filter);
    }
    return list;
  }

  openCreate() {
    this.selectedItem.set(null);
    const defaultUnit = this.getDefaultUnitForType(this.activeTab());
    this.itemForm.reset({
      code: '',
      name: '',
      description: '',
      type: this.activeTab(),
      unit: defaultUnit,
      cost: 0,
      isActive: true,
      image: '',
      weightPerMeter: 0,
      standardLength: 6.10,
      systemId: '',
      thicknessMm: 0,
      glassType: 'monolithic',
      weightPerM2: 0,
    });
    this.showModal.set(true);
  }

  openEdit(item: any) {
    this.selectedItem.set(item);
    this.itemForm.patchValue({
      code: item.code,
      name: item.name,
      description: item.description || '',
      type: item.type,
      unit: item.unit,
      cost: Number(item.cost),
      isActive: item.is_active,
      image: item.image || '',
      weightPerMeter: item.weight_per_meter ? Number(item.weight_per_meter) : 0,
      standardLength: item.standard_length ? Number(item.standard_length) : 6.10,
      systemId: item.system_id || '',
      thicknessMm: item.thickness_mm ? Number(item.thickness_mm) : 0,
      glassType: item.glass_type || 'monolithic',
      weightPerM2: item.weight_per_m2 ? Number(item.weight_per_m2) : 0,
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.showVariantsModal.set(false);
    this.selectedItem.set(null);
  }

  openVariants(item: any) {
    this.selectedItem.set(item);
    this.showVariantsModal.set(true);
  }

  getCheckedFinishes(): string[] {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked') as NodeListOf<HTMLInputElement>;
    return Array.from(checkboxes).map(cb => cb.value);
  }

  async generateVariants(selectedFinishIds: string[]) {
    if (!this.selectedItem() || selectedFinishIds.length === 0) return;
    
    this.isLoading.set(true);
    const baseItem = this.selectedItem();
    let createdCount = 0;
    const generatedCodes = new Set<string>();

    for (const finishId of selectedFinishIds) {
      const finish = this.finishes().find(f => f.id === finishId);
      if (!finish) continue;

      // Evitar crear si ya existe
      const exists = baseItem.variants?.find((v: any) => v.finish_id === finish.id);
      if (exists) continue;

      let baseSuffix = finish.code ? finish.code.trim().toUpperCase() : finish.name.trim().substring(0, 3).toUpperCase();
      let baseNewCode = `${baseItem.code}-${baseSuffix}`;
      
      let finalCode = baseNewCode;
      let counter = 1;
      while (
        this.items().some(item => item.code.toLowerCase() === finalCode.toLowerCase()) ||
        generatedCodes.has(finalCode.toLowerCase())
      ) {
        finalCode = `${baseNewCode}${counter}`;
        counter++;
      }
      
      generatedCodes.add(finalCode.toLowerCase());

      const dto = {
        code: finalCode,
        name: `${baseItem.name} (${finish.name})`,
        description: baseItem.description,
        type: baseItem.type,
        unit: baseItem.unit,
        cost: Number(baseItem.cost) * Number(finish.price_multiplier),
        isActive: true,
        image: baseItem.image,
        weightPerMeter: baseItem.weight_per_meter ? Number(baseItem.weight_per_meter) : undefined,
        standardLength: baseItem.standard_length ? Number(baseItem.standard_length) : undefined,
        systemId: baseItem.system_id || undefined,
        thicknessMm: baseItem.thickness_mm ? Number(baseItem.thickness_mm) : undefined,
        glassType: baseItem.glass_type || undefined,
        weightPerM2: baseItem.weight_per_m2 ? Number(baseItem.weight_per_m2) : undefined,
        baseItemId: baseItem.id,
        finishId: finish.id
      };

      try {
        await this.catalogService.createItem(dto);
        createdCount++;
      } catch (e) {
        console.error('Error creando variante', e);
      }
    }

    this.successMessage.set(`Se crearon ${createdCount} variaciones con éxito.`);
    await this.loadItems();
    this.closeModal();
    this.isLoading.set(false);
  }

  onImageChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 1024 * 1024) {
        this.errorMessage.set('La imagen es demasiado grande. El límite es de 1 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.itemForm.patchValue({
          image: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.itemForm.patchValue({
      image: '',
    });
  }

  async save() {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formVal = this.itemForm.value;
    // Adapt standard values depending on type to avoid sending trash
    const payload: any = {
      code: formVal.code,
      name: formVal.name,
      description: formVal.description,
      type: formVal.type,
      unit: formVal.unit,
      cost: Number(formVal.cost),
      isActive: formVal.isActive,
      image: formVal.image || null,
      systemId: formVal.systemId || null,
    };

    if (formVal.type === 'profile') {
      payload.weightPerMeter = Number(formVal.weightPerMeter);
      payload.standardLength = Number(formVal.standardLength);
    } else if (formVal.type === 'glass') {
      payload.thicknessMm = Number(formVal.thicknessMm);
      payload.glassType = formVal.glassType;
      payload.weightPerM2 = Number(formVal.weightPerM2);
    }

    try {
      if (this.selectedItem()) {
        await this.catalogService.updateItem(this.selectedItem().id, payload);
        this.successMessage.set('Artículo actualizado con éxito.');
      } else {
        await this.catalogService.createItem(payload);
        this.successMessage.set('Artículo creado con éxito.');
      }
      this.showModal.set(false);
      await this.loadItems();
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Error al guardar el artículo.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteItem(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar este artículo de catálogo?')) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.catalogService.deleteItem(id);
      this.successMessage.set('Artículo eliminado con éxito.');
      await this.loadItems();
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || 'Error al eliminar el artículo.');
    } finally {
      this.isLoading.set(false);
    }
  }

  onTypeChange(event: any) {
    const newType = event.target.value;
    const defaultUnit = this.getDefaultUnitForType(newType);
    this.itemForm.patchValue({ unit: defaultUnit });
  }

  private getDefaultUnitForType(type: string): string {
    switch (type) {
      case 'profile': return 'm';
      case 'glass': return 'm2';
      case 'accessory':
      case 'supply':
      default: return 'u';
    }
  }

  getProfilesBySystem() {
    const profiles = this.items().filter(item => item.type === 'profile');
    const systemsList = this.systems();
    const filter = this.selectedSystemFilter();
    
    const groups: { systemName: string, items: any[] }[] = [];

    if (filter === 'all') {
      // Group items for each active system
      systemsList.forEach(sys => {
        const systemProfiles = profiles.filter(p => p.system_id === sys.id);
        if (systemProfiles.length > 0) {
          groups.push({
            systemName: sys.name,
            items: systemProfiles
          });
        }
      });

      // Group items with no system (Generic)
      const genericProfiles = profiles.filter(p => !p.system_id);
      if (genericProfiles.length > 0) {
        groups.push({
          systemName: 'Perfiles Genéricos / Sin Línea',
          items: genericProfiles
        });
      }
    } else if (filter === 'none') {
      // Group only generic items
      const genericProfiles = profiles.filter(p => !p.system_id);
      if (genericProfiles.length > 0) {
        groups.push({
          systemName: 'Perfiles Genéricos / Sin Línea',
          items: genericProfiles
        });
      }
    } else {
      // Show only selected system profiles group
      const targetSystem = systemsList.find(s => s.id === filter);
      if (targetSystem) {
        const systemProfiles = profiles.filter(p => p.system_id === targetSystem.id);
        if (systemProfiles.length > 0) {
          groups.push({
            systemName: targetSystem.name,
            items: systemProfiles
          });
        }
      }
    }

    return groups;
  }

  onFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedSystemFilter.set(select.value);
  }

  getThemeColors() {
    const tab = this.activeTab();
    switch (tab) {
      case 'glass':
        return {
          text: 'text-emerald-400',
          border: 'border-emerald-500',
          focusBorder: 'focus:border-emerald-500',
          bg: 'bg-emerald-600',
          bgHover: 'hover:bg-emerald-500',
          shadow: 'shadow-emerald-600/10 hover:shadow-emerald-500/20',
          lightText: 'text-emerald-300',
          iconColor: 'text-emerald-400',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        };
      case 'accessory':
        return {
          text: 'text-amber-400',
          border: 'border-amber-500',
          focusBorder: 'focus:border-amber-500',
          bg: 'bg-amber-600',
          bgHover: 'hover:bg-amber-500',
          shadow: 'shadow-amber-600/10 hover:shadow-amber-500/20',
          lightText: 'text-amber-300',
          iconColor: 'text-amber-400',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        };
      case 'supply':
        return {
          text: 'text-violet-400',
          border: 'border-violet-500',
          focusBorder: 'focus:border-violet-500',
          bg: 'bg-violet-600',
          bgHover: 'hover:bg-violet-500',
          shadow: 'shadow-violet-600/10 hover:shadow-violet-500/20',
          lightText: 'text-violet-300',
          iconColor: 'text-violet-400',
          badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20'
        };
      case 'profile':
      default:
        return {
          text: 'text-indigo-400',
          border: 'border-indigo-500',
          focusBorder: 'focus:border-indigo-500',
          bg: 'bg-indigo-600',
          bgHover: 'hover:bg-indigo-500',
          shadow: 'shadow-indigo-600/10 hover:shadow-indigo-500/20',
          lightText: 'text-indigo-300',
          iconColor: 'text-indigo-400',
          badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
        };
    }
  }

  getModalThemeColors() {
    const type = this.itemForm.get('type')?.value || this.activeTab();
    switch (type) {
      case 'glass':
        return {
          text: 'text-emerald-400',
          border: 'border-emerald-500',
          focusBorder: 'focus:border-emerald-500',
          bg: 'bg-emerald-600',
          bgHover: 'hover:bg-emerald-500',
          shadow: 'shadow-emerald-600/10 hover:shadow-emerald-500/20',
          lightText: 'text-emerald-300',
          iconColor: 'text-emerald-400',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        };
      case 'accessory':
        return {
          text: 'text-amber-400',
          border: 'border-amber-500',
          focusBorder: 'focus:border-amber-500',
          bg: 'bg-amber-600',
          bgHover: 'hover:bg-amber-500',
          shadow: 'shadow-amber-600/10 hover:shadow-amber-500/20',
          lightText: 'text-amber-300',
          iconColor: 'text-amber-400',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        };
      case 'supply':
        return {
          text: 'text-violet-400',
          border: 'border-violet-500',
          focusBorder: 'focus:border-violet-500',
          bg: 'bg-violet-600',
          bgHover: 'hover:bg-violet-500',
          shadow: 'shadow-violet-600/10 hover:shadow-violet-500/20',
          lightText: 'text-violet-300',
          iconColor: 'text-violet-400',
          badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20'
        };
      case 'profile':
      default:
        return {
          text: 'text-indigo-400',
          border: 'border-indigo-500',
          focusBorder: 'focus:border-indigo-500',
          bg: 'bg-indigo-600',
          bgHover: 'hover:bg-indigo-500',
          shadow: 'shadow-indigo-600/10 hover:shadow-indigo-500/20',
          lightText: 'text-indigo-300',
          iconColor: 'text-indigo-400',
          badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
        };
    }
  }
}
