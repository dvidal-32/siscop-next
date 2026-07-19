import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { EngineeringService } from '../../../core/services/engineering.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './templates.html',
})
export class TemplatesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private engineeringService = inject(EngineeringService);
  private catalogService = inject(CatalogService);
  private router = inject(Router);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // State Lists
  templates = signal<any[]>([]);
  systems = signal<any[]>([]);

  // Modal State
  showModal = signal<boolean>(false);
  selectedTemplate = signal<any | null>(null);
  uploadProgress = signal<number | null>(null);

  templateForm = this.fb.group({
    name: ['', [Validators.required]],
    code: ['', [Validators.required]],
    description: [''],
    systemId: [''],
    isActive: [true],
    image: [''],
    pricingMethod: ['cost', [Validators.required]],
    areaUnit: ['m2'],
    areaPriceL1: [null],
    areaPriceL2: [null],
    areaPriceL3: [null],
    areaPriceL4: [null],
  });

  async ngOnInit() {
    this.isLoading.set(true);
    await Promise.all([this.loadTemplates(), this.loadSystems()]);
    this.isLoading.set(false);
  }

  async loadTemplates() {
    try {
      const data = await this.engineeringService.getTemplates();
      this.templates.set(data);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error cargando plantillas');
    }
  }

  async loadSystems() {
    try {
      const data = await this.catalogService.getSystems();
      this.systems.set(data);
    } catch (err: any) {
      console.error('Error cargando líneas/sistemas', err);
    }
  }

  openCreate() {
    this.selectedTemplate.set(null);
    this.templateForm.reset({
      name: '',
      code: '',
      description: '',
      systemId: '',
      isActive: true,
      image: '',
      pricingMethod: 'cost',
      areaUnit: 'm2',
      areaPriceL1: null,
      areaPriceL2: null,
      areaPriceL3: null,
      areaPriceL4: null,
    });
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  openEdit(template: any) {
    this.selectedTemplate.set(template);
    this.templateForm.patchValue({
      name: template.name,
      code: template.code,
      description: template.description || '',
      systemId: template.system_id || '',
      isActive: template.is_active,
      image: template.image || '',
      pricingMethod: template.pricing_method || 'cost',
      areaUnit: template.area_unit || 'm2',
      areaPriceL1: template.area_price_l1,
      areaPriceL2: template.area_price_l2,
      areaPriceL3: template.area_price_l3,
      areaPriceL4: template.area_price_l4,
    });
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedTemplate.set(null);
  }

  onImageChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 1024 * 1024) {
        this.errorMessage.set('La imagen es demasiado grande. El límite es de 1 MB.');
        return;
      }
      
      this.uploadProgress.set(0);
      const reader = new FileReader();
      
      reader.onload = () => {
        const result = reader.result as string;
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.floor(Math.random() * 20) + 10;
          if (progress >= 100) {
            progress = 100;
            this.uploadProgress.set(100);
            clearInterval(interval);
            setTimeout(() => {
              this.templateForm.patchValue({
                image: result,
              });
              this.uploadProgress.set(null);
            }, 200);
          } else {
            this.uploadProgress.set(progress);
          }
        }, 80);
      };
      
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.templateForm.patchValue({
      image: '',
    });
  }

  async saveTemplate() {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formData = this.templateForm.value;

    try {
      if (this.selectedTemplate()) {
        await this.engineeringService.updateTemplate(this.selectedTemplate().id, formData);
        this.successMessage.set('Plantilla actualizada correctamente');
      } else {
        await this.engineeringService.createTemplate(formData);
        this.successMessage.set('Plantilla creada correctamente');
      }
      this.closeModal();
      await this.loadTemplates();
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al guardar la plantilla');
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteTemplate(id: string) {
    if (!confirm('¿Estás seguro de desactivar esta plantilla de ingeniería?')) {
      return;
    }

    this.isLoading.set(true);
    try {
      await this.engineeringService.deleteTemplate(id);
      this.successMessage.set('Plantilla desactivada correctamente');
      await this.loadTemplates();
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al desactivar plantilla');
    } finally {
      this.isLoading.set(false);
    }
  }

  navigateToFormulas(templateId: string) {
    this.router.navigate(['/engineering/formulas'], { queryParams: { templateId } });
  }

  navigateToSimulator(templateId: string) {
    this.router.navigate(['/engineering/simulator'], { queryParams: { templateId } });
  }
}
