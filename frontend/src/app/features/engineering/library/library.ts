import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { EngineeringService } from '../../../core/services/engineering.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './library.html',
})
export class LibraryComponent implements OnInit {
  private engineeringService = inject(EngineeringService);
  private router = inject(Router);

  isLoading = signal<boolean>(false);
  isImporting = signal<string | null>(null); // Guardará el templateId que se está clonando
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  globalTemplates = signal<any[]>([]);

  async ngOnInit() {
    await this.loadGlobalTemplates();
  }

  async loadGlobalTemplates() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const data = await this.engineeringService.getGlobalTemplates();
      this.globalTemplates.set(data);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al cargar plantillas globales');
    } finally {
      this.isLoading.set(false);
    }
  }

  async importTemplate(globalTemplateId: string) {
    this.isImporting.set(globalTemplateId);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.engineeringService.importTemplate(globalTemplateId);
      this.successMessage.set('¡Plantilla importada con éxito!');
      setTimeout(() => {
        this.successMessage.set(null);
        this.router.navigate(['/engineering/templates']);
      }, 1500);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al importar plantilla global');
    } finally {
      this.isImporting.set(null);
    }
  }
}
