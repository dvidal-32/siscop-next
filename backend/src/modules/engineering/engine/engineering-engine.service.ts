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
        const unit = component.catalog_item.unit;

        // Calcular según la unidad del artículo
        if (unit === 'm' && formulaResult.length !== undefined) {
          // Perfiles: costo por metro × largo en metros × cantidad
          materialCost = unitCost * (formulaResult.length / 1000) * formulaResult.quantity;
        } else if (unit === 'm2' && formulaResult.area !== undefined) {
          // Vidrios: costo por m² × área × cantidad
          materialCost = unitCost * formulaResult.area * formulaResult.quantity;
        } else if (unit === 'u') {
          // Accesorios: costo por unidad × cantidad
          materialCost = unitCost * formulaResult.quantity;
        } else {
          // Fallback: usar costo base × cantidad
          materialCost = unitCost * formulaResult.quantity;
        }

        logs.push(`  Costo material: $${materialCost.toFixed(2)}`);
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

    return {
      templateId: template.id,
      templateName: template.name,
      templateCode: template.code,
      inputVariables,
      components: componentResults,
      totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
      calculatedAt: new Date(),
      logs,
    };
  }
}
