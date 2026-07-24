import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../../core/services/catalog.service';
import { EngineeringService } from '../../../core/services/engineering.service';
import { TenantCurrencyPipe } from '../../../core/pipes/tenant-currency.pipe';

// Tipos internos del builder
export type ElementType = 'hole' | 'product' | 'divider';

export interface FacadeCell {
  id: string;
  elementType: ElementType;
  label: string;
  // Medidas calculadas en mm
  widthMm: number;
  heightMm: number;
  xMm: number;
  yMm: number;
  // Ítem de catálogo o template asignado
  itemType?: 'template' | 'catalog_item';
  templateId?: string;
  catalogItemId?: string;
  variables?: Record<string, any>;
  notes?: string;
  // Precio calculado (preview en vivo)
  estimatedPrice?: number;
  // Dirección de la división (para divisores)
  dividerDirection?: 'vertical' | 'horizontal';
  // Color visual
  color?: string;
  // Imagen (si aplica para producto)
  imageUrl?: string;
}

export interface CompositeQuoteItem {
  name: string;
  widthMm: number;
  heightMm: number;
  notes?: string;
  quantity: number;
  sub_components: FacadeCell[];
  total_estimated: number;
}

@Component({
  selector: 'app-facade-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, TenantCurrencyPipe],
  templateUrl: './facade-builder.component.html',
  styleUrls: ['./facade-builder.component.css'],
})
export class FacadeBuilderComponent implements OnInit {
  @Input() margin: number = 1.3;
  @Input() initialState?: CompositeQuoteItem | null;
  @Output() compositeReady = new EventEmitter<CompositeQuoteItem>();
  @Output() cancelled = new EventEmitter<void>();

  private catalogService = inject(CatalogService);
  private engineeringService = inject(EngineeringService);

  // Datos del catálogo
  catalogItems = signal<any[]>([]);
  templates = signal<any[]>([]);

  // Dimensiones del hueco principal
  totalWidthMm = signal<number>(3000);
  totalHeightMm = signal<number>(2500);
  facadeName = signal<string>('Frente Comercial');
  facadeQuantity = signal<number>(1);
  facadeNotes = signal<string>('');

  // Celdas del grid (composición visual)
  cells = signal<FacadeCell[]>([]);

  // Panel derecho: celda seleccionada
  selectedCellId = signal<string | null>(null);
  selectedCell = computed(() => {
    const id = this.selectedCellId();
    return id ? this.cells().find(c => c.id === id) ?? null : null;
  });

  // Total estimado
  totalEstimated = computed(() =>
    this.cells().filter(c => c.elementType !== 'hole').reduce((sum, c) => sum + (c.estimatedPrice || 0), 0)
  );

  // Control de pasos
  step = signal<'dimensions' | 'design'>('dimensions');

  // Tipos de elemento para la paleta
  readonly paletteItems = [
    { elementType: 'divider' as ElementType, dividerDirection: 'vertical' as const, label: 'Divisor Vertical', icon: '⬛', color: '#374151' },
    { elementType: 'divider' as ElementType, dividerDirection: 'horizontal' as const, label: 'Divisor Horizontal', icon: '▬', color: '#374151' },
    { elementType: 'product' as ElementType, label: 'Producto / Vidrio / Puerta', icon: '🪟', color: '#3b82f6' },
  ];

  // Drag state
  draggingPaletteItem = signal<any | null>(null);
  draggingCellId = signal<string | null>(null);

  private simTimeout: any;

  async ngOnInit() {
    await Promise.all([this.loadCatalog(), this.loadTemplates(), this.loadFinishes()]);
    
    if (this.initialState) {
      this.facadeName.set(this.initialState.name || 'Frente Comercial');
      this.totalWidthMm.set(this.initialState.widthMm || 3000);
      this.totalHeightMm.set(this.initialState.heightMm || 2500);
      this.facadeQuantity.set(this.initialState.quantity || 1);
      this.facadeNotes.set(this.initialState.notes || '');
      this.cells.set(this.initialState.sub_components || []);
      
      if (this.cells().length > 0) {
        this.step.set('design');
      } else {
        this.initHole();
      }
    } else {
      this.initHole();
    }
  }

  async loadCatalog() {
    try {
      const items = await this.catalogService.getItems() as any[];
      this.catalogItems.set(items.filter((i: any) => !i.base_item_id));
    } catch { }
  }

  async loadTemplates() {
    try {
      const data = await this.engineeringService.getTemplates() as any[];
      this.templates.set(data.filter((t: any) => t.is_active));
    } catch { }
  }

  // ── Pasos del wizard ─────────────────────────────────────────────────────

  goToDesign() {
    if (this.totalWidthMm() < 100 || this.totalHeightMm() < 100) return;
    
    const currentCells = this.cells();
    if (currentCells.length > 0) {
      // Find current bounds
      let currentWidth = 0;
      let currentHeight = 0;
      currentCells.forEach(c => {
        if (c.xMm + c.widthMm > currentWidth) currentWidth = c.xMm + c.widthMm;
        if (c.yMm + c.heightMm > currentHeight) currentHeight = c.yMm + c.heightMm;
      });
      
      // If dimensions changed, scale proportionally instead of resetting
      if (currentWidth > 0 && currentHeight > 0 && 
         (currentWidth !== this.totalWidthMm() || currentHeight !== this.totalHeightMm())) {
        const scaleX = this.totalWidthMm() / currentWidth;
        const scaleY = this.totalHeightMm() / currentHeight;
        
        const updatedCells = currentCells.map(c => ({
          ...c,
          xMm: Math.round(c.xMm * scaleX),
          yMm: Math.round(c.yMm * scaleY),
          widthMm: Math.round(c.widthMm * scaleX),
          heightMm: Math.round(c.heightMm * scaleY)
        }));
        this.cells.set(updatedCells);
      }
    } else {
      this.initHole();
    }
    
    this.step.set('design');
  }

  backToDimensions() {
    this.step.set('dimensions');
  }

  // ── Inicialización del grid ───────────────────────────────────────────────

  initHole() {
    this.cells.set([{
      id: this.genId(),
      elementType: 'hole',
      label: 'Hueco libre',
      widthMm: this.totalWidthMm(),
      heightMm: this.totalHeightMm(),
      xMm: 0,
      yMm: 0,
      color: '#f0f9ff',
    }]);
    this.selectedCellId.set(null);
  }

  // ── Drag & Drop de la paleta ─────────────────────────────────────────────

  onPaletteDragStart(item: any) {
    this.draggingPaletteItem.set(item);
  }

  onPaletteDragEnd() {
    this.draggingPaletteItem.set(null);
  }

  onCellDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onCellDrop(event: DragEvent, cellId: string) {
    event.preventDefault();
    const paletteItem = this.draggingPaletteItem();
    if (!paletteItem) return;

    if (paletteItem.elementType === 'divider') {
      this.splitCell(cellId, paletteItem.dividerDirection);
    } else if (paletteItem.elementType === 'product') {
      // Convertir el hueco en un producto (para asignarle después)
      this.convertCellToProduct(cellId);
    }
    this.draggingPaletteItem.set(null);
  }

  // ── Lógica de División de Huecos ─────────────────────────────────────────

  splitCell(cellId: string, direction: 'vertical' | 'horizontal') {
    const current = this.cells().find(c => c.id === cellId);
    if (!current || current.elementType !== 'hole') return;

    // Mostrar prompt para la medida del divisor
    const posStr = prompt(
      direction === 'vertical'
        ? `Dividir verticalmente. Ancho del tubo (mm) y posición desde la izquierda (mm).\nEjemplo: "50,900" = tubo de 50mm a 900mm del borde.\n\nHueco actual: ${current.widthMm}mm de ancho`
        : `Dividir horizontalmente. Alto del tubo (mm) y posición desde arriba (mm).\nEjemplo: "50,1000" = tubo de 50mm a 1000mm del borde.\n\nHueco actual: ${current.heightMm}mm de alto`,
      direction === 'vertical' ? '50,900' : '50,1200'
    );
    if (!posStr) return;

    const parts = posStr.split(',').map(s => parseInt(s.trim(), 10));
    const dividerThickness = parts[0] || 50;
    const position = parts[1] || Math.floor((direction === 'vertical' ? current.widthMm : current.heightMm) / 2);

    if (direction === 'vertical') {
      this.splitVertical(current, dividerThickness, position);
    } else {
      this.splitHorizontal(current, dividerThickness, position);
    }
  }

  private splitVertical(cell: FacadeCell, thickness: number, leftWidth: number) {
    const rightWidth = cell.widthMm - leftWidth - thickness;
    if (leftWidth < 10 || rightWidth < 10 || thickness < 10) {
      alert('Medidas inválidas. Verifica que los huecos resultantes sean mayores a 10mm.');
      return;
    }

    const newCells = this.cells().filter(c => c.id !== cell.id);
    const leftCell: FacadeCell = { id: this.genId(), elementType: 'hole', label: 'Hueco', widthMm: leftWidth, heightMm: cell.heightMm, xMm: cell.xMm, yMm: cell.yMm, color: '#f0f9ff' };
    const divider: FacadeCell = { id: this.genId(), elementType: 'divider', label: `Tubo Vertical (${thickness}mm)`, widthMm: thickness, heightMm: cell.heightMm, xMm: cell.xMm + leftWidth, yMm: cell.yMm, dividerDirection: 'vertical', color: '#374151' };
    const rightCell: FacadeCell = { id: this.genId(), elementType: 'hole', label: 'Hueco', widthMm: rightWidth, heightMm: cell.heightMm, xMm: cell.xMm + leftWidth + thickness, yMm: cell.yMm, color: '#f0f9ff' };

    // Insertar en posición correcta
    const origIndex = this.cells().findIndex(c => c.id === cell.id);
    newCells.splice(origIndex, 0, leftCell, divider, rightCell);
    this.cells.set(newCells);
  }

  private splitHorizontal(cell: FacadeCell, thickness: number, topHeight: number) {
    const bottomHeight = cell.heightMm - topHeight - thickness;
    if (topHeight < 10 || bottomHeight < 10 || thickness < 10) {
      alert('Medidas inválidas. Verifica que los huecos resultantes sean mayores a 10mm.');
      return;
    }

    const newCells = this.cells().filter(c => c.id !== cell.id);
    const topCell: FacadeCell = { id: this.genId(), elementType: 'hole', label: 'Hueco', widthMm: cell.widthMm, heightMm: topHeight, xMm: cell.xMm, yMm: cell.yMm, color: '#f0f9ff' };
    const divider: FacadeCell = { id: this.genId(), elementType: 'divider', label: `Tubo Horizontal (${thickness}mm)`, widthMm: cell.widthMm, heightMm: thickness, xMm: cell.xMm, yMm: cell.yMm + topHeight, dividerDirection: 'horizontal', color: '#374151' };
    const bottomCell: FacadeCell = { id: this.genId(), elementType: 'hole', label: 'Hueco', widthMm: cell.widthMm, heightMm: bottomHeight, xMm: cell.xMm, yMm: cell.yMm + topHeight + thickness, color: '#f0f9ff' };

    const origIndex = this.cells().findIndex(c => c.id === cell.id);
    newCells.splice(origIndex, 0, topCell, divider, bottomCell);
    this.cells.set(newCells);
  }

  convertCellToProduct(cellId: string) {
    this.cells.update(cells =>
      cells.map(c => c.id === cellId
        ? { ...c, elementType: 'product' as ElementType, label: 'Producto sin asignar', color: '#dbeafe' }
        : c
      )
    );
    this.selectedCellId.set(cellId);
  }

  // ── Selección de celda ────────────────────────────────────────────────────

  selectCell(cellId: string) {
    const cell = this.cells().find(c => c.id === cellId);
    if (!cell) return;
    if (cell.elementType === 'hole') {
      this.selectedCellId.set(cellId);
    } else {
      this.selectedCellId.set(cellId);
    }
  }

  // ── Asignación de producto a celda ────────────────────────────────────────

  onProductAssigned(cellId: string, itemType: 'template' | 'catalog_item', itemId: string) {
    let name = 'Producto';
    let image: string | undefined;

    if (itemType === 'template') {
      const tmpl = this.templates().find(t => t.id === itemId);
      if (tmpl) {
        name = tmpl.name;
        image = tmpl.image;
      }
    } else {
      const item = this.catalogItems().find(i => i.id === itemId);
      if (item) {
        name = item.name;
        image = item.image;
      }
    }

    this.cells.update(cells =>
      cells.map(c => c.id === cellId
        ? { ...c, elementType: 'product', itemType, templateId: itemType === 'template' ? itemId : undefined, catalogItemId: itemType === 'catalog_item' ? itemId : undefined, label: name, imageUrl: image, variables: {} }
        : c
      )
    );
    this.triggerPriceEstimation(cellId);
  }

  onDividerProductAssigned(cellId: string, itemType: 'catalog_item', itemId: string) {
    const name = this.catalogItems().find(i => i.id === itemId)?.name || 'Perfil/Tubo';
    this.cells.update(cells =>
      cells.map(c => c.id === cellId
        ? { ...c, itemType, catalogItemId: itemId, label: name }
        : c
      )
    );
    this.triggerPriceEstimation(cellId);
  }

  onLabelChange(cellId: string, newLabel: string) {
    this.cells.update(cells => cells.map(c => c.id === cellId ? { ...c, label: newLabel } : c));
  }

  // ── Estimación de precios (preview) ──────────────────────────────────────

  triggerPriceEstimation(cellId: string) {
    if (this.simTimeout) clearTimeout(this.simTimeout);
    this.simTimeout = setTimeout(() => this.estimateCellPrice(cellId), 500);
  }

  async estimateCellPrice(cellId: string) {
    const cell = this.cells().find(c => c.id === cellId);
    if (!cell) return;
    if (cell.elementType === 'hole') { return; }

    let estimatedPrice = 0;
    try {
      if (cell.itemType === 'catalog_item' && cell.catalogItemId) {
        const item = this.catalogItems().find(i => i.id === cell.catalogItemId);
        if (item) {
          const cost = Number(item.cost || 0);
          const unit = (item.unit || '').toLowerCase();
          let factor = 1;
          if (['m2', 'p2'].includes(unit)) factor = (cell.widthMm / 1000) * (cell.heightMm / 1000);
          else if (['m', 'pl'].includes(unit)) factor = cell.widthMm / 1000;
          estimatedPrice = cost * factor;
        }
      } else if (cell.itemType === 'template' && cell.templateId) {
        const res = await this.engineeringService.simulate(cell.templateId, {
          ANCHO: cell.widthMm,
          ALTO: cell.heightMm,
          W: cell.widthMm,
          H: cell.heightMm,
          ...(cell.variables || {}),
        }) as any;
        
        if (res && res.pricingMethod === 'area') {
          estimatedPrice = (res.totalAreaUnit || 0) * (res.areaPriceL1 || 0);
        } else {
          estimatedPrice = (res?.totalMaterialCost || 0) * this.margin;
        }
      }
    } catch { /* silently ignore estimation errors */ }

    this.cells.update(cells => cells.map(c => c.id === cellId ? { ...c, estimatedPrice } : c));
  }


  // ── Eliminar celda / revertir a hueco ────────────────────────────────────

  clearCell(cellId: string) {
    this.cells.update(cells =>
      cells.map(c => c.id === cellId
        ? { ...c, elementType: 'hole', label: 'Hueco libre', itemType: undefined, templateId: undefined, catalogItemId: undefined, estimatedPrice: undefined, color: '#f0f9ff' }
        : c
      )
    );
    this.selectedCellId.set(null);
  }

  removeDivider(cellId: string) {
    // Eliminar el divisor y fusionar los huecos adyacentes en uno
    const cells = this.cells();
    const idx = cells.findIndex(c => c.id === cellId);
    if (idx < 0) return;
    const divider = cells[idx];
    const isVertical = divider.dividerDirection === 'vertical';

    const prev = cells[idx - 1];
    const next = cells[idx + 1];
    if (!prev || !next) { return; }

    const mergedCell: FacadeCell = {
      id: this.genId(),
      elementType: 'hole',
      label: 'Hueco libre',
      widthMm: isVertical ? prev.widthMm + divider.widthMm + next.widthMm : prev.widthMm,
      heightMm: isVertical ? prev.heightMm : prev.heightMm + divider.heightMm + next.heightMm,
      xMm: prev.xMm,
      yMm: prev.yMm,
      color: '#f0f9ff',
    };

    const newCells = [...cells];
    newCells.splice(idx - 1, 3, mergedCell);
    this.cells.set(newCells);
    this.selectedCellId.set(null);
  }

  moveDivider(cellId: string) {
    const cells = this.cells();
    const divider = cells.find(c => c.id === cellId);
    if (!divider || divider.elementType !== 'divider') return;

    const isVertical = divider.dividerDirection === 'vertical';

    if (isVertical) {
      const currentPos = divider.xMm;
      const input = prompt('Mover divisor vertical.\nIngresa la nueva posición desde el borde izquierdo del lienzo (mm):', currentPos.toString());
      if (!input) return;
      const newPos = parseInt(input, 10);
      if (isNaN(newPos) || newPos === currentPos) return;

      const deltaX = newPos - currentPos;

      const leftCells = cells.filter(c => Math.abs((c.xMm + c.widthMm) - divider.xMm) < 1);
      const rightCells = cells.filter(c => Math.abs(c.xMm - (divider.xMm + divider.widthMm)) < 1);

      for (const lc of leftCells) {
        if (lc.widthMm + deltaX < 10) { alert('Movimiento inválido: reduciría un hueco a menos de 10mm.'); return; }
      }
      for (const rc of rightCells) {
        if (rc.widthMm - deltaX < 10) { alert('Movimiento inválido: reduciría un hueco a menos de 10mm.'); return; }
      }

      const newCells = cells.map(c => {
        if (c.id === divider.id) return { ...c, xMm: c.xMm + deltaX };
        if (leftCells.some(lc => lc.id === c.id)) return { ...c, widthMm: c.widthMm + deltaX };
        if (rightCells.some(rc => rc.id === c.id)) return { ...c, xMm: c.xMm + deltaX, widthMm: c.widthMm - deltaX };
        return c;
      });
      this.cells.set(newCells);

    } else {
      const currentPos = divider.yMm;
      const input = prompt('Mover divisor horizontal.\nIngresa la nueva posición desde el borde superior del lienzo (mm):', currentPos.toString());
      if (!input) return;
      const newPos = parseInt(input, 10);
      if (isNaN(newPos) || newPos === currentPos) return;

      const deltaY = newPos - currentPos;

      const topCells = cells.filter(c => Math.abs((c.yMm + c.heightMm) - divider.yMm) < 1);
      const bottomCells = cells.filter(c => Math.abs(c.yMm - (divider.yMm + divider.heightMm)) < 1);

      for (const tc of topCells) {
        if (tc.heightMm + deltaY < 10) { alert('Movimiento inválido: reduciría un hueco a menos de 10mm.'); return; }
      }
      for (const bc of bottomCells) {
        if (bc.heightMm - deltaY < 10) { alert('Movimiento inválido: reduciría un hueco a menos de 10mm.'); return; }
      }

      const newCells = cells.map(c => {
        if (c.id === divider.id) return { ...c, yMm: c.yMm + deltaY };
        if (topCells.some(tc => tc.id === c.id)) return { ...c, heightMm: c.heightMm + deltaY };
        if (bottomCells.some(bc => bc.id === c.id)) return { ...c, yMm: c.yMm + deltaY, heightMm: c.heightMm - deltaY };
        return c;
      });
      this.cells.set(newCells);
    }
  }

  // ── Grid visual (proporciones relativas) ─────────────────────────────────

  getGridTemplate(): string {
    // Determinar si las celdas son horizontales o verticales por el primer divisor encontrado
    // Para simplificar, las celdas se muestran en fila (flex)
    return 'row';
  }

  getCellWidthPercent(cell: FacadeCell): number {
    return (cell.widthMm / this.totalWidthMm()) * 100;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  genId(): string {
    return 'cell_' + Math.random().toString(36).substr(2, 9);
  }

  // ── Guardar / emitir resultado ────────────────────────────────────────────

  saveComposite() {
    const result: CompositeQuoteItem = {
      name: this.facadeName(),
      widthMm: this.totalWidthMm(),
      heightMm: this.totalHeightMm(),
      notes: this.facadeNotes(),
      quantity: this.facadeQuantity(),
      sub_components: this.cells(),
      total_estimated: this.totalEstimated(),
    };
    this.compositeReady.emit(result);
  }

  cancel() {
    this.cancelled.emit();
  }

  getFilteredCatalogItems(filter?: string): any[] {
    if (!filter) return this.catalogItems();
    return this.catalogItems().filter(i => i.type?.toLowerCase() === filter.toLowerCase() || !filter);
  }
  // ── Helper Variables de Plantillas ───────────────────────────────────────

  finishes = signal<any[]>([]);

  async loadFinishes() {
    try {
      const data = await this.catalogService.getFinishes();
      this.finishes.set(data.filter(f => f.is_active));
    } catch { }
  }

  getTemplateVariables(templateId?: string): any[] {
    if (!templateId) return [];
    const tmpl = this.templates().find(t => t.id === templateId);
    if (!tmpl || !tmpl.variables) return [];
    return tmpl.variables.filter((v: any) => v.type === 'MANUAL' || v.type === 'COMPUTED' || v.type === 'ITEM_SELECTOR' || v.type === 'FINISH_SELECTOR');
  }

  getItemsByCategory(category?: string): any[] {
    if (!category) return this.catalogItems();
    return this.catalogItems().filter(item => item.type?.toLowerCase() === category.toLowerCase());
  }

  getCellValue(cell: FacadeCell, v: any): any {
    if (cell.variables && cell.variables[v.name] !== undefined && cell.variables[v.name] !== null && cell.variables[v.name] !== '') {
      return cell.variables[v.name];
    }
    if (v.type === 'COMPUTED' && v.computation_formula) {
      try {
        const context: any = {
          ANCHO: Number(cell.widthMm),
          ALTO: Number(cell.heightMm),
          W: Number(cell.widthMm),
          H: Number(cell.heightMm)
        };

        if (cell.templateId) {
          const tmpl = this.templates().find(t => t.id === cell.templateId);
          if (tmpl && tmpl.variables) {
            for (const tVar of tmpl.variables) {
              if (tVar.type !== 'COMPUTED') {
                const override = cell.variables ? cell.variables[tVar.name] : undefined;
                context[tVar.name] = (override !== undefined && override !== null && override !== '')
                  ? Number(override)
                  : Number(tVar.default_value || 0);
              }
            }
            for (const tVar of tmpl.variables) {
              if (tVar.name === v.name) break;
              if (tVar.type === 'COMPUTED') {
                context[tVar.name] = Number(this.getCellValue(cell, tVar) || 0);
              }
            }
          }
        }

        if (cell.variables) {
          for (const k of Object.keys(cell.variables)) {
            if (context[k] === undefined) context[k] = Number(cell.variables[k]);
          }
        }

        let formula = String(v.computation_formula).toUpperCase();
        
        const upperContext: any = {};
        for (const k of Object.keys(context)) {
          upperContext[k.toUpperCase()] = context[k];
        }

        // Sustitución por regex segura
        const sortedVarNames = Object.keys(upperContext).sort((a, b) => b.length - a.length);
        for (const varName of sortedVarNames) {
          const val = upperContext[varName] !== undefined && !isNaN(upperContext[varName]) ? upperContext[varName] : 0;
          const safeVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${safeVarName}\\b`, 'g');
          formula = formula.replace(regex, String(val));
        }

        formula = formula.replace(/\bAND\b/g, '&&');
        formula = formula.replace(/\bOR\b/g, '||');
        formula = formula.replace(/\bNOT\b/g, '!');

        const mathContext = {
          ROUND: (x: number, d = 0) => { const f = Math.pow(10, d); return Math.round(x * f) / f; },
          CEIL: Math.ceil,
          FLOOR: Math.floor,
          MIN: Math.min,
          MAX: Math.max,
          ABS: Math.abs,
          SQRT: Math.sqrt,
          POW: Math.pow,
          IF: (cond: boolean, a: any, b: any) => cond ? a : b,
        };
        
        const func = new Function(...Object.keys(mathContext), `return ${formula};`);
        const result = func(...Object.values(mathContext));
        
        return (result === undefined || result === null || isNaN(result)) ? '' : result;
      } catch (e) {
        console.warn('Error evaluating', v.computation_formula, e);
        return '';
      }
    }
    return '';
  }

  onVariableChange(cellId: string, varName: string, value: any) {
    this.cells.update(cells => cells.map(c => {
      if (c.id === cellId) {
        const variables = { ...(c.variables || {}) };
        if (value === '' || value === null) {
          delete variables[varName];
        } else {
          variables[varName] = value;
        }
        return { ...c, variables };
      }
      return c;
    }));
    this.triggerPriceEstimation(cellId);
  }
}
