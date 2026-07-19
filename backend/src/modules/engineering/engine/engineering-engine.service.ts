import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { EngineeringDslService } from '../dsl/engineering-dsl.service';
import {
  SimulationResult,
  ComponentResult,
  FormulaResult,
} from '../interfaces/simulation-result.interface';
import { RuleAction } from '@prisma/client';

@Injectable()
export class EngineeringEngineService {
  constructor(
    private prisma: PrismaService,
    private dslService: EngineeringDslService,
  ) {}

  /**
   * Ejecuta una simulación completa de desglose para una plantilla
   * con los valores de variables proporcionados.
   *
   * @param templateId - ID de la plantilla de ingeniería
   * @param inputVariables - Valores de las variables (ej: { ANCHO: 1500, ALTO: 1200 })
   * @param tenantId - ID del tenant (para aislamiento de datos)
   * @returns SimulationResult con el desglose completo
   */
  async simulate(
    templateId: string,
    inputVariables: Record<string, number | string | boolean>,
    tenantId: string,
  ): Promise<SimulationResult> {
    const logs: string[] = [];
    logs.push(`Iniciando simulación para plantilla ${templateId}`);

    // 1. Cargar la plantilla con todas sus relaciones
    const template = await this.prisma.engineeringTemplate.findFirst({
      where: { id: templateId, tenant_id: tenantId, is_active: true },
      include: {
        variables: { orderBy: { order: 'asc' } },
        components: {
          orderBy: { order: 'asc' },
          include: {
            catalog_item: true,
            formula: true,
            rules: { orderBy: { priority: 'asc' } },
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Plantilla de ingeniería no encontrada o inactiva');
    }

    // 2. Validar que todas las variables requeridas tengan valor
    const numericVariables: Record<string, number> = {};

    for (const variable of template.variables) {
      const value = inputVariables[variable.name];

      if (variable.is_required && (value === undefined || value === null || value === '')) {
        throw new BadRequestException(
          `La variable requerida "${variable.label}" (${variable.name}) no tiene valor`,
        );
      }

      if (variable.type === 'NUMBER') {
        const numValue = value !== undefined && value !== null
          ? Number(value)
          : (variable.default_value ? Number(variable.default_value) : 0);

        if (isNaN(numValue)) {
          throw new BadRequestException(
            `La variable "${variable.label}" (${variable.name}) debe ser un número`,
          );
        }

        // Validar rango min/max
        if (variable.min_value !== null && numValue < Number(variable.min_value)) {
          throw new BadRequestException(
            `La variable "${variable.label}" (${variable.name}) no puede ser menor que ${variable.min_value}`,
          );
        }
        if (variable.max_value !== null && numValue > Number(variable.max_value)) {
          throw new BadRequestException(
            `La variable "${variable.label}" (${variable.name}) no puede ser mayor que ${variable.max_value}`,
          );
        }

        numericVariables[variable.name] = numValue;
        logs.push(`Variable ${variable.name} = ${numValue}`);
      } else if (variable.type === 'BOOLEAN') {
        const boolValue = value !== undefined && value !== null
          ? (String(value) === 'true' || value === true || value === 1 || value === '1')
          : (variable.default_value === 'true');
        numericVariables[variable.name] = boolValue ? 1 : 0;
        logs.push(`Variable ${variable.name} = ${boolValue ? 1 : 0} (BOOLEAN)`);
      }
    }

    // 3. Procesar cada componente
    const componentResults: ComponentResult[] = [];
    let totalMaterialCost = 0;

    for (const component of template.components) {
      logs.push(`\nProcesando componente: ${component.name} (${component.type})`);

      // 3a. Evaluar reglas condicionales
      let included = true;
      let excludedByRule: string | undefined;
      let overriddenFormulas: any = null;

      for (const rule of component.rules) {
        try {
          const conditionResult = this.dslService.evaluateCondition(
            rule.condition,
            numericVariables,
          );

          logs.push(`  Regla "${rule.condition}" → ${conditionResult} (acción: ${rule.action})`);

          if (conditionResult) {
            if (rule.action === RuleAction.EXCLUDE) {
              included = false;
              excludedByRule = rule.condition;
              logs.push(`  ⛔ Componente EXCLUIDO por regla: ${rule.condition}`);
              break;
            } else if (rule.action === RuleAction.INCLUDE) {
              included = true;
              logs.push(`  ✅ Componente INCLUIDO por regla: ${rule.condition}`);
            } else if (rule.action === RuleAction.OVERRIDE_FORMULA) {
              overriddenFormulas = rule.override_formula;
              logs.push(`  🔄 Fórmulas ANULADAS por regla: ${rule.condition}`);
            }
          }
        } catch (error) {
          logs.push(`  ⚠️ Error evaluando regla "${rule.condition}": ${error.message}`);
        }
      }

      // 3b. Evaluar fórmulas (si el componente está incluido)
      const formulaResult: FormulaResult = {
        quantity: 0,
        width: undefined,
        height: undefined,
        length: undefined,
        area: undefined,
      };

      if (included && component.formula) {
        const formula = overriddenFormulas || component.formula;

        try {
          // Cantidad
          const qtyFormula = formula.quantity_formula || formula.quantityFormula || '1';
          formulaResult.quantity = this.dslService.evaluateMath(
            qtyFormula,
            numericVariables,
          );
          logs.push(`  Cantidad: ${qtyFormula} = ${formulaResult.quantity}`);

          // Ancho
          const wFormula = formula.width_formula || formula.widthFormula;
          if (wFormula) {
            formulaResult.width = this.dslService.evaluateMath(wFormula, numericVariables);
            logs.push(`  Ancho: ${wFormula} = ${formulaResult.width}`);
          }

          // Alto
          const hFormula = formula.height_formula || formula.heightFormula;
          if (hFormula) {
            formulaResult.height = this.dslService.evaluateMath(hFormula, numericVariables);
            logs.push(`  Alto: ${hFormula} = ${formulaResult.height}`);
          }

          // Largo
          const lFormula = formula.length_formula || formula.lengthFormula;
          if (lFormula) {
            formulaResult.length = this.dslService.evaluateMath(lFormula, numericVariables);
            logs.push(`  Largo: ${lFormula} = ${formulaResult.length}`);
          }

          // Área
          const aFormula = formula.area_formula || formula.areaFormula;
          if (aFormula) {
            formulaResult.area = this.dslService.evaluateMath(aFormula, numericVariables);
            logs.push(`  Área: ${aFormula} = ${formulaResult.area}`);
          }
        } catch (error) {
          logs.push(`  ❌ Error en fórmulas: ${error.message}`);
          throw new BadRequestException(
            `Error calculando el componente "${component.name}": ${error.message}`,
          );
        }
      }

      // 3c. Calcular costo de material (si el componente tiene artículo de catálogo enlazado)
      let materialCost = 0;
      if (included && component.catalog_item) {
        const unitCost = Number(component.catalog_item.cost);
        const rawUnit = component.catalog_item.unit.toLowerCase().trim();

        // Determinar la dimensión lineal principal (Largo, y si está vacío, usar Ancho o Alto)
        const linearDimension = formulaResult.length ?? formulaResult.width ?? formulaResult.height;

        // Determinar área automáticamente (Base sistema: mm²)
        let areaMm2: number | undefined = undefined;
        if (formulaResult.width !== undefined && formulaResult.height !== undefined) {
          areaMm2 = formulaResult.width * formulaResult.height;
        } else if (formulaResult.area !== undefined) {
          // Si por alguna razón el ingeniero solo puso área (asumimos que la puso en m² como antes)
          areaMm2 = formulaResult.area * 1000000;
        }

        // Detección Flexible de Unidades (Tolerante a errores de tipeo como "Pies Cuadrados(p2)")
        const isAreaFt2 = rawUnit.includes('ft2') || rawUnit.includes('pc') || rawUnit.includes('cuadrad') || rawUnit.includes('p2');
        const isAreaM2 = rawUnit.includes('m2') || rawUnit.includes('mt2');
        const isArea = isAreaFt2 || isAreaM2;
        
        const isLinearFt = rawUnit.includes('ft') || rawUnit.includes('pl') || rawUnit.includes('pie') || rawUnit.includes('lineal');
        const isLinearIn = rawUnit === 'in' || rawUnit.includes('plg') || rawUnit.includes('pulg');
        const isLinearCm = rawUnit === 'cm' || rawUnit.includes('cent');
        const isLinearM = rawUnit === 'm' || rawUnit === 'mt' || rawUnit === 'ml' || rawUnit.includes('metro');
        const isLinear = !isArea && (isLinearFt || isLinearIn || isLinearCm || isLinearM);

        if (isLinear && linearDimension !== undefined) {
          // Longitud (Base sistema: mm)
          let divisor = 1;
          if (isLinearCm) divisor = 10;
          else if (isLinearM) divisor = 1000;
          else if (isLinearIn) divisor = 25.4;
          else if (isLinearFt) divisor = 304.8;
          
          const lengthInCatalogUnit = linearDimension / divisor;
          materialCost = unitCost * lengthInCatalogUnit * formulaResult.quantity;
          logs.push(`  Líneal (${rawUnit}): ${linearDimension}mm → ${lengthInCatalogUnit.toFixed(4)} unidades × $${unitCost.toFixed(2)} × ${formulaResult.quantity} = $${materialCost.toFixed(2)}`);
          
        } else if (isArea && areaMm2 !== undefined) {
          // Área (Convertir directamente de mm² a la unidad del catálogo)
          let divisor = 1;
          if (isAreaM2) divisor = 1000000;
          else if (isAreaFt2) divisor = 92903.04;
          
          const areaInCatalogUnit = areaMm2 / divisor;
          materialCost = unitCost * areaInCatalogUnit * formulaResult.quantity;
          logs.push(`  Área (${rawUnit}): ${areaMm2}mm² → ${areaInCatalogUnit.toFixed(4)} unidades × $${unitCost.toFixed(2)} × ${formulaResult.quantity} = $${materialCost.toFixed(2)}`);
          
        } else {
          // Fallback / Discreto (Unidades, pares, juegos)
          materialCost = unitCost * formulaResult.quantity;
          logs.push(`  Unidad (${rawUnit}): $${unitCost.toFixed(2)} × ${formulaResult.quantity} = $${materialCost.toFixed(2)}`);
        }

        totalMaterialCost += materialCost;
      }

      componentResults.push({
        componentId: component.id,
        catalogItemId: component.catalog_item_id || undefined,
        catalogItemCode: component.catalog_item?.code || undefined,
        type: component.type,
        name: component.name,
        description: component.description || undefined,
        included,
        excludedByRule,
        formulas: formulaResult,
        materialCost: Math.round(materialCost * 100) / 100,
        unit: component.catalog_item?.unit || undefined,
      });
    }

    logs.push(`\n══════════════════════════════════`);
    logs.push(`Costo total de materiales: $${totalMaterialCost.toFixed(2)}`);
    logs.push(`Componentes incluidos: ${componentResults.filter((c) => c.included).length}/${componentResults.length}`);

    let totalAreaMm2 = 0;
    let totalAreaUnit = 0;
    
    // Helper to find variable ignoring case in both numericVariables and inputVariables
    const findVar = (keys: string[]) => {
      for (const k of Object.keys(numericVariables)) {
        if (keys.includes(k.toUpperCase())) return numericVariables[k];
      }
      for (const k of Object.keys(inputVariables)) {
        if (keys.includes(k.toUpperCase())) {
          const val = inputVariables[k];
          return typeof val === 'number' ? val : (parseFloat(String(val)) || 0);
        }
      }
      return 0;
    };
    
    const mainAncho = findVar(['ANCHO', 'W', 'WIDTH', 'X']);
    const mainAlto = findVar(['ALTO', 'H', 'HEIGHT', 'Y']);
    if (mainAncho && mainAlto) {
      totalAreaMm2 = mainAncho * mainAlto;
      // Convert based on template area_unit
      // If m2, divide by 1_000_000. If sqft, divide by 92903.04.
      // Or we can convert mm to m (divide by 1000) or ft (divide by 304.8) first.
      if ((template as any).area_unit === 'sqft') {
        totalAreaUnit = (mainAncho / 304.8) * (mainAlto / 304.8);
      } else {
        totalAreaUnit = (mainAncho / 1000) * (mainAlto / 1000);
      }
    }

    return {
      templateId: template.id,
      templateName: template.name,
      templateCode: template.code,
      inputVariables,
      components: componentResults,
      totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
      
      pricingMethod: (template as any).pricing_method || 'cost',
      areaUnit: (template as any).area_unit || 'm2',
      areaPriceL1: (template as any).area_price_l1 ? Number((template as any).area_price_l1) : null,
      areaPriceL2: (template as any).area_price_l2 ? Number((template as any).area_price_l2) : null,
      areaPriceL3: (template as any).area_price_l3 ? Number((template as any).area_price_l3) : null,
      areaPriceL4: (template as any).area_price_l4 ? Number((template as any).area_price_l4) : null,
      totalAreaMm2,
      totalAreaUnit,
      
      calculatedAt: new Date(),
      logs,
    };
  }
}
