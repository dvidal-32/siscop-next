import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EngineeringService } from '../../../core/services/engineering.service';
import { CommonModule } from '@angular/common';

import { mmToFractionalInches } from '../../../core/utils/math.utils';
import { TenantCurrencyPipe } from '../../../core/pipes/tenant-currency.pipe';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-simulator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TenantCurrencyPipe],
  templateUrl: './simulator.html',
  providers: [TenantCurrencyPipe],
})
export class SimulatorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private engineeringService = inject(EngineeringService);
  private fb = inject(FormBuilder);
  private currencyPipe = inject(TenantCurrencyPipe);
  private catalogService = inject(CatalogService);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Utilities
  mmToFractionalInches = mmToFractionalInches;

  // Core Data
  templateId = signal<string>('');
  template = signal<any | null>(null);
  templates = signal<any[]>([]);
  finishes = signal<any[]>([]);
  catalogItems = signal<any[]>([]);

  // Simulation Form & Results
  variablesForm!: FormGroup;
  simulationResult = signal<any | null>(null);

  async ngOnInit() {
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
      await Promise.all([this.loadTemplate(), this.loadFinishes(), this.loadCatalogItems()]);
      this.isLoading.set(false);
    });
  }

  async loadFinishes() {
    try {
      const finishes = await this.catalogService.getFinishes();
      this.finishes.set(finishes.filter(f => f.is_active));
    } catch (e) {
      console.error(e);
    }
  }

  async loadCatalogItems() {
    try {
      const items = await this.catalogService.getItems();
      this.catalogItems.set(items);
    } catch (e) {
      console.error(e);
    }
  }

  getItemsByCategory(category?: string): any[] {
    if (!category) return this.catalogItems();
    return this.catalogItems().filter(item => item.type?.toLowerCase() === category.toLowerCase());
  }

  async loadAllTemplates() {
    try {
      const data = await this.engineeringService.getTemplates();
      this.templates.set(data);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al cargar plantillas');
    }
  }

  async loadTemplate() {
    try {
      const data = await this.engineeringService.getTemplate(this.templateId());
      this.template.set(data);
      this.buildVariablesForm(data.variables);
    } catch (err: any) {
      this.errorMessage.set(err?.error?.message || 'Error al cargar plantilla');
    }
  }

  buildVariablesForm(variables: any[]) {
    const group: Record<string, any> = {};

    variables.forEach((v) => {
      // Valor por defecto
      let defVal = v.default_value || '';
      if (v.type === 'NUMBER') {
        const nameLower = (v.name || '').toLowerCase();
        const labelLower = (v.label || '').toLowerCase();
        
        if (nameLower.includes('cuerpo') || labelLower.includes('cuerpo') || nameLower === 'n') {
          defVal = 2;
        } else {
          defVal = defVal ? Number(defVal) : 1000; // Valor de prueba por defecto
        }
      } else if (v.type === 'BOOLEAN') {
        defVal = defVal === 'true';
      }
      group[v.name] = [defVal];
    });

    this.variablesForm = this.fb.group(group);

    // Ejecutar simulación inicial
    this.runSimulation();

    // Auto-simulación ante cualquier cambio en el formulario (reactivo)
    this.variablesForm.valueChanges.subscribe(() => {
      this.runSimulation();
    });
  }

  async runSimulation() {
    if (this.variablesForm.invalid) return;

    const values = this.variablesForm.value;
    try {
      this.errorMessage.set(null);
      const result = await this.engineeringService.simulate(this.templateId(), values);
      this.simulationResult.set(result);
      
      // Auto-fill COMPUTED variables if user hasn't manually changed them
      if (result.evaluatedVariables) {
        for (const [key, value] of Object.entries(result.evaluatedVariables)) {
          const control = this.variablesForm.get(key);
          const isComputed = this.template()?.variables?.find((v: any) => v.name === key && v.type === 'COMPUTED');
          if (control && isComputed && (!control.dirty || control.value === '' || control.value === null)) {
            control.patchValue(value, { emitEvent: false });
          }
        }
      }
    } catch (err: any) {
      console.error('Error corriendo simulación', err);
      this.errorMessage.set(err?.error?.message || 'Error interno en la simulación');
    }
  }

  focusNextInput(event: Event) {
    event.preventDefault();
    const target = event.target as HTMLElement;
    const form = target.closest('form');
    if (form) {
      const inputs = Array.from(form.querySelectorAll('input, select')) as HTMLElement[];
      const index = inputs.indexOf(target);
      if (index > -1 && index < inputs.length - 1) {
        inputs[index + 1].focus();
      } else if (index === inputs.length - 1) {
        target.blur();
      }
    }
  }

  getIncludedComponentsCount(): number {
    return this.simulationResult()?.components?.filter((c: any) => c.included).length || 0;
  }

  printBreakdown() {
    const temp = this.template();
    const result = this.simulationResult();
    if (!temp || !result) return;

    // Get variables with labels and values
    const variablesList = temp.variables.map((v: any) => {
      const val = this.variablesForm.value[v.name];
      let displayVal = val;
      if (v.type === 'BOOLEAN') {
        displayVal = val ? 'Sí' : 'No';
      }
      return {
        label: v.label,
        name: v.name,
        value: displayVal
      };
    });

    // Open window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para ver el reporte de impresión.');
      return;
    }

    // Build components table rows
    const rowsHtml = result.components
      .filter((c: any) => c.included)
      .map((c: any) => {
        const qty = c.formulas.quantity;
        const costStr = c.materialCost ? this.currencyPipe.transform(c.materialCost) : this.currencyPipe.transform(0);
        
        let dimsHtml = '';
        let inchesHtml = '';
        if (c.formulas.length !== undefined) {
          dimsHtml += `<div>Largo: <strong>${c.formulas.length} mm</strong></div>`;
          inchesHtml += `<div>Largo: <strong>${this.mmToFractionalInches(c.formulas.length)}</strong></div>`;
        }
        if (c.formulas.width !== undefined) {
          dimsHtml += `<div>Ancho: <strong>${c.formulas.width} mm</strong></div>`;
          inchesHtml += `<div>Ancho: <strong>${this.mmToFractionalInches(c.formulas.width)}</strong></div>`;
        }
        if (c.formulas.height !== undefined) {
          dimsHtml += `<div>Alto: <strong>${c.formulas.height} mm</strong></div>`;
          inchesHtml += `<div>Alto: <strong>${this.mmToFractionalInches(c.formulas.height)}</strong></div>`;
        }
        if (c.formulas.area !== undefined) {
          dimsHtml += `<div>Área: <strong>${c.formulas.area} m²</strong></div>`;
          inchesHtml += `<div>Área: <strong>-</strong></div>`;
        }
        
        return `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top;">
              <div style="font-weight: bold; color: #1e293b;">${c.name}</div>
              ${c.catalogItemCode ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">Cód: ${c.catalogItemCode}</div>` : ''}
            </td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; text-transform: uppercase; font-family: monospace;">${this.getComponentTypeLabel(c.type)}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; vertical-align: top; font-weight: bold; font-family: monospace;">${qty}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; font-family: monospace; font-size: 11px; color: #334155; line-height: 1.4;">${dimsHtml}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; font-family: monospace; font-size: 11px; color: #334155; line-height: 1.4;">${inchesHtml}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; vertical-align: top; font-weight: bold; font-family: monospace;">${costStr}</td>
          </tr>
        `;
      })
      .join('');

    const varsHtml = variablesList
      .map((v: any) => `
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-weight: 600; color: #475569;">${v.label} (${v.name})</td>
          <td style="padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-family: monospace; font-weight: bold; color: #0f172a; text-align: right;">${v.value}</td>
        </tr>
      `)
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte de Desglose - ${temp.name}</title>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          
          body {
            font-family: 'Inter', sans-serif;
            color: #0f172a;
            background: #fff;
            margin: 0;
            padding: 20px;
            font-size: 12px;
            line-height: 1.5;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          
          .header-left h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 800;
            color: #1e3a8a;
            letter-spacing: -0.5px;
          }
          
          .header-left p {
            margin: 4px 0 0 0;
            font-size: 11px;
            color: #64748b;
          }
          
          .header-right {
            text-align: right;
          }
          
          .header-right .doc-title {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .header-right .date {
            margin: 4px 0 0 0;
            font-size: 11px;
            color: #64748b;
          }
          
          .grid-container {
            display: grid;
            grid-template-columns: 1fr 1.5fr;
            gap: 20px;
            margin-bottom: 25px;
          }
          
          .card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 15px;
            background: #f8fafc;
          }
          
          .card-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #475569;
            margin: 0 0 10px 0;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
          }
          
          .table-compact {
            width: 100%;
            border-collapse: collapse;
          }
          
          .cost-card {
            background: #1e3a8a;
            color: white;
            border-radius: 12px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          
          .cost-card span {
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 1px;
            color: #93c5fd;
          }
          
          .cost-card h2 {
            margin: 5px 0 0 0;
            font-size: 32px;
            font-weight: 800;
          }
          
          .cost-card p {
            margin: 8px 0 0 0;
            font-size: 10px;
            color: #bfdbfe;
            line-height: 1.3;
          }
          
          .section-title {
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
            margin: 25px 0 10px 0;
            padding-left: 8px;
            border-left: 3px solid #1e3a8a;
          }
          
          .table-breakdown {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          
          .table-breakdown th {
            background: #f1f5f9;
            color: #475569;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            padding: 10px 12px;
            border-bottom: 2px solid #e2e8f0;
            text-align: left;
          }
          
          .table-breakdown tr {
            page-break-inside: avoid;
          }
          
          .footer {
            margin-top: 50px;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
            font-size: 10px;
            color: #64748b;
          }
          
          .disclaimer {
            text-align: center;
            font-style: italic;
            margin-bottom: 40px;
          }
          
          .signatures {
            display: flex;
            justify-content: space-around;
            margin-top: 40px;
            margin-bottom: 20px;
          }
          
          .signature-block {
            text-align: center;
            width: 200px;
          }
          
          .signature-line {
            border-top: 1px solid #94a3b8;
            margin-bottom: 6px;
          }
          
          .signature-title {
            font-weight: 600;
            color: #475569;
          }
          
          @media print {
            body {
              padding: 0;
            }
            .cost-card {
              border: 1px solid #1e3a8a;
              background-color: #1e3a8a !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .card {
              background-color: #f8fafc !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .table-breakdown th {
              background-color: #f1f5f9 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>SISCOP NEXT</h1>
            <p>Plataforma SaaS Multi-Tenant para Aluminio y Vidrio</p>
          </div>
          <div class="header-right">
            <h2 class="doc-title">Reporte Técnico de Desglose</h2>
            <p class="date">Fecha de Emisión: ${new Date().toLocaleString()}</p>
          </div>
        </div>

        <div style="font-size: 14px; font-weight: bold; margin-bottom: 15px; color: #1e3a8a;">
          Producto: ${temp.name} (${temp.code})
        </div>

        <div class="grid-container">
          <!-- Variables de Entrada -->
          <div class="card">
            <h3 class="card-title">Parámetros de Simulación</h3>
            <table class="table-compact">
              <tbody>
                ${varsHtml}
              </tbody>
            </table>
          </div>
          
          <!-- Costo Estimado -->
          <div class="cost-card">
            <span>Costo Estimado de Materiales</span>
            <h2>${this.currencyPipe.transform(result.totalMaterialCost || 0)}</h2>
            <p>Calculado dinámicamente según precios del catálogo maestro de materiales.</p>
          </div>
        </div>

        <h3 class="section-title">Desglose de Componentes (${result.components.filter((c: any) => c.included).length} piezas)</h3>
        <table class="table-breakdown">
          <thead>
            <tr>
              <th>Pieza / Componente</th>
              <th>Tipo</th>
              <th style="text-align: center;">Cant.</th>
              <th>Dimensiones (mm)</th>
              <th>Dimensiones (pulg.)</th>
              <th style="text-align: right;">Costo Est.</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div class="disclaimer">
            "Este reporte representa una simulación técnica de costos estimados de ingeniería. No representa una orden de producción final."
          </div>
          
          <div class="signatures">
            <div class="signature-block">
              <div class="signature-line"></div>
              <div class="signature-title">Firma Ingeniería</div>
            </div>
            <div class="signature-block">
              <div class="signature-line"></div>
              <div class="signature-title">Firma Producción</div>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; font-size: 9px; color: #94a3b8;">
            Generado por SISCOP NEXT &copy; ${new Date().getFullYear()} - Todos los derechos reservados.
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
