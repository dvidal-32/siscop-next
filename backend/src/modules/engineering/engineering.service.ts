import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { CreateVariableDto } from './dto/create-variable.dto';
import { UpdateVariableDto } from './dto/update-variable.dto';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';
import { CreateFormulaDto } from './dto/create-formula.dto';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { EngineeringDslService } from './dsl/engineering-dsl.service';

@Injectable()
export class EngineeringService {
  constructor(
    private prisma: PrismaService,
    private dslService: EngineeringDslService,
  ) {}

  // ──────────────────────────────────────────
  // PLANTILLAS (TEMPLATES)
  // ──────────────────────────────────────────

  async findAllTemplates(tenantId: string) {
    return this.prisma.engineeringTemplate.findMany({
      where: { tenant_id: tenantId },
      include: {
        system: true,
        source_template: { select: { id: true, name: true, code: true } },
        _count: { select: { variables: true, components: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOneTemplate(id: string, tenantId: string) {
    const template = await this.prisma.engineeringTemplate.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        system: true,
        source_template: { select: { id: true, name: true, code: true } },
        variables: { orderBy: { order: 'asc' } },
        components: {
          orderBy: { order: 'asc' },
          include: {
            catalog_item: { select: { id: true, code: true, name: true, type: true, unit: true, cost: true } },
            formula: true,
            rules: { orderBy: { priority: 'asc' } },
          },
        },
      },
    });
    if (!template) {
      throw new NotFoundException('Plantilla de ingeniería no encontrada');
    }
    return template;
  }

  async createTemplate(dto: CreateTemplateDto, tenantId: string) {
    // Validar código único por tenant
    const existing = await this.prisma.engineeringTemplate.findFirst({
      where: { tenant_id: tenantId, code: { equals: dto.code, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('Ya existe una plantilla con este código');
    }

    // Validar sistema si se proporciona
    if (dto.systemId) {
      const system = await this.prisma.catalogSystem.findFirst({
        where: { id: dto.systemId, tenant_id: tenantId },
      });
      if (!system) {
        throw new NotFoundException('La línea/sistema asociada no existe');
      }
    }

    return this.prisma.engineeringTemplate.create({
      data: {
        tenant_id: tenantId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        system_id: dto.systemId || null,
        is_active: dto.isActive ?? true,
        image: dto.image || null,
        pricing_method: dto.pricingMethod || 'cost',
        area_unit: dto.areaUnit || 'm2',
        area_price_l1: dto.areaPriceL1 || null,
        area_price_l2: dto.areaPriceL2 || null,
        area_price_l3: dto.areaPriceL3 || null,
        area_price_l4: dto.areaPriceL4 || null,
      },
      include: { system: true },
    });
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto, tenantId: string) {
    const template = await this.prisma.engineeringTemplate.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!template) {
      throw new NotFoundException('Plantilla de ingeniería no encontrada');
    }

    if (dto.code && dto.code !== template.code) {
      const existing = await this.prisma.engineeringTemplate.findFirst({
        where: { tenant_id: tenantId, code: { equals: dto.code, mode: 'insensitive' } },
      });
      if (existing) {
        throw new ConflictException('Ya existe una plantilla con este código');
      }
    }

    if (dto.systemId) {
      const system = await this.prisma.catalogSystem.findFirst({
        where: { id: dto.systemId, tenant_id: tenantId },
      });
      if (!system) {
        throw new NotFoundException('La línea/sistema asociada no existe');
      }
    }

    const data: any = {
      name: dto.name,
      code: dto.code,
      description: dto.description,
      system_id: dto.systemId,
      is_active: dto.isActive,
      image: dto.image,
      pricing_method: dto.pricingMethod,
      area_unit: dto.areaUnit,
      area_price_l1: dto.areaPriceL1,
      area_price_l2: dto.areaPriceL2,
      area_price_l3: dto.areaPriceL3,
      area_price_l4: dto.areaPriceL4,
    };

    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

    return this.prisma.engineeringTemplate.update({
      where: { id },
      data,
      include: { system: true },
    });
  }


  async deleteTemplate(id: string, tenantId: string) {
    const template = await this.prisma.engineeringTemplate.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!template) {
      throw new NotFoundException('Plantilla de ingeniería no encontrada');
    }

    // Soft delete: marcar como inactiva
    return this.prisma.engineeringTemplate.update({
      where: { id },
      data: { is_active: false },
    });
  }

  // ──────────────────────────────────────────
  // VARIABLES
  // ──────────────────────────────────────────

  async createVariable(dto: CreateVariableDto, tenantId: string) {
    // Verificar que la plantilla pertenece al tenant
    const template = await this.prisma.engineeringTemplate.findFirst({
      where: { id: dto.templateId, tenant_id: tenantId },
    });
    if (!template) {
      throw new NotFoundException('Plantilla de ingeniería no encontrada');
    }

    // Verificar nombre único dentro de la plantilla
    const existing = await this.prisma.engineeringVariable.findFirst({
      where: { template_id: dto.templateId, name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException(`Ya existe una variable "${dto.name}" en esta plantilla`);
    }

    // Normalizar el nombre a UPPERCASE
    const normalizedName = dto.name.toUpperCase().replace(/\s+/g, '_');

    return this.prisma.engineeringVariable.create({
      data: {
        template_id: dto.templateId,
        name: normalizedName,
        label: dto.label,
        type: dto.type,
        default_value: dto.defaultValue,
        is_required: dto.isRequired ?? true,
        min_value: dto.minValue,
        max_value: dto.maxValue,
        list_options: dto.listOptions,
        order: dto.order ?? 0,
      },
    });
  }

  async updateVariable(id: string, dto: UpdateVariableDto, tenantId: string) {
    const variable = await this.prisma.engineeringVariable.findFirst({
      where: { id },
      include: { template: { select: { tenant_id: true } } },
    });
    if (!variable || variable.template.tenant_id !== tenantId) {
      throw new NotFoundException('Variable de ingeniería no encontrada');
    }

    let normalizedName = variable.name;
    if (dto.name && dto.name.toLowerCase() !== variable.name.toLowerCase()) {
      const existing = await this.prisma.engineeringVariable.findFirst({
        where: { template_id: variable.template_id, name: { equals: dto.name, mode: 'insensitive' } },
      });
      if (existing) {
        throw new ConflictException(`Ya existe una variable "${dto.name}" en esta plantilla`);
      }
      normalizedName = dto.name.toUpperCase().replace(/\s+/g, '_');
    }

    return this.prisma.engineeringVariable.update({
      where: { id },
      data: {
        name: normalizedName,
        label: dto.label,
        type: dto.type,
        default_value: dto.defaultValue,
        is_required: dto.isRequired,
        min_value: dto.minValue,
        max_value: dto.maxValue,
        list_options: dto.listOptions,
        order: dto.order,
      },
    });
  }

  async deleteVariable(id: string, tenantId: string) {
    const variable = await this.prisma.engineeringVariable.findFirst({
      where: { id },
      include: { template: { select: { tenant_id: true } } },
    });
    if (!variable || variable.template.tenant_id !== tenantId) {
      throw new NotFoundException('Variable de ingeniería no encontrada');
    }

    return this.prisma.engineeringVariable.delete({ where: { id } });
  }

  // ──────────────────────────────────────────
  // COMPONENTES
  // ──────────────────────────────────────────

  async createComponent(dto: CreateComponentDto, tenantId: string) {
    // Verificar plantilla
    const template = await this.prisma.engineeringTemplate.findFirst({
      where: { id: dto.templateId, tenant_id: tenantId },
    });
    if (!template) {
      throw new NotFoundException('Plantilla de ingeniería no encontrada');
    }

    // Verificar artículo de catálogo si se proporciona
    if (dto.catalogItemId) {
      const item = await this.prisma.catalogItem.findFirst({
        where: { id: dto.catalogItemId, tenant_id: tenantId },
      });
      if (!item) {
        throw new NotFoundException('Artículo de catálogo no encontrado');
      }
    }

    return this.prisma.engineeringComponent.create({
      data: {
        template_id: dto.templateId,
        catalog_item_id: dto.catalogItemId || null,
        type: dto.type,
        name: dto.name,
        description: dto.description,
        order: dto.order ?? 0,
      },
      include: {
        catalog_item: { select: { id: true, code: true, name: true, type: true, unit: true, cost: true } },
      },
    });
  }

  async updateComponent(id: string, dto: UpdateComponentDto, tenantId: string) {
    const component = await this.prisma.engineeringComponent.findFirst({
      where: { id },
      include: { template: { select: { tenant_id: true } } },
    });
    if (!component || component.template.tenant_id !== tenantId) {
      throw new NotFoundException('Componente de ingeniería no encontrado');
    }

    if (dto.catalogItemId) {
      const item = await this.prisma.catalogItem.findFirst({
        where: { id: dto.catalogItemId, tenant_id: tenantId },
      });
      if (!item) {
        throw new NotFoundException('Artículo de catálogo no encontrado');
      }
    }

    return this.prisma.engineeringComponent.update({
      where: { id },
      data: {
        catalog_item_id: dto.catalogItemId !== undefined ? (dto.catalogItemId || null) : undefined,
        type: dto.type,
        name: dto.name,
        description: dto.description,
        order: dto.order,
      },
      include: {
        catalog_item: { select: { id: true, code: true, name: true, type: true, unit: true, cost: true } },
      },
    });
  }

  async deleteComponent(id: string, tenantId: string) {
    const component = await this.prisma.engineeringComponent.findFirst({
      where: { id },
      include: { template: { select: { tenant_id: true } } },
    });
    if (!component || component.template.tenant_id !== tenantId) {
      throw new NotFoundException('Componente de ingeniería no encontrado');
    }

    return this.prisma.engineeringComponent.delete({ where: { id } });
  }

  // ──────────────────────────────────────────
  // FÓRMULAS
  // ──────────────────────────────────────────

  async createOrUpdateFormula(dto: CreateFormulaDto, tenantId: string) {
    // Verificar que el componente pertenece a una plantilla del tenant
    const component = await this.prisma.engineeringComponent.findFirst({
      where: { id: dto.componentId },
      include: {
        template: {
          include: { variables: { select: { name: true } } },
        },
      },
    });
    if (!component || component.template.tenant_id !== tenantId) {
      throw new NotFoundException('Componente de ingeniería no encontrado');
    }

    // Validar las fórmulas con el DSL antes de guardar
    const variableNames = component.template.variables.map((v) => v.name);
    
    // Normalizar a MAYÚSCULAS para evitar errores de caso (case-insensitive para variables)
    const quantityFormula = dto.quantityFormula?.toUpperCase().trim() || '1';
    const widthFormula = dto.widthFormula?.toUpperCase().trim();
    const heightFormula = dto.heightFormula?.toUpperCase().trim();
    const lengthFormula = dto.lengthFormula?.toUpperCase().trim();
    const areaFormula = dto.areaFormula?.toUpperCase().trim();

    const formulasToValidate = [
      quantityFormula,
      widthFormula,
      heightFormula,
      lengthFormula,
      areaFormula,
    ].filter((f): f is string => !!f);

    for (const formula of formulasToValidate) {
      const validation = this.dslService.validateFormula(formula, variableNames);
      if (!validation.valid) {
        throw new BadRequestException(
          `Fórmula inválida "${formula}": ${validation.error}`,
        );
      }
    }

    // Upsert: crear o actualizar si ya existe
    const existing = await this.prisma.engineeringFormula.findUnique({
      where: { component_id: dto.componentId },
    });

    if (existing) {
      return this.prisma.engineeringFormula.update({
        where: { component_id: dto.componentId },
        data: {
          quantity_formula: quantityFormula,
          width_formula: widthFormula,
          height_formula: heightFormula,
          length_formula: lengthFormula,
          area_formula: areaFormula,
        },
      });
    }

    return this.prisma.engineeringFormula.create({
      data: {
        component_id: dto.componentId,
        quantity_formula: quantityFormula,
        width_formula: widthFormula,
        height_formula: heightFormula,
        length_formula: lengthFormula,
        area_formula: areaFormula,
      },
    });
  }

  // ──────────────────────────────────────────
  // REGLAS
  // ──────────────────────────────────────────

  async createRule(dto: CreateRuleDto, tenantId: string) {
    // Verificar que el componente pertenece al tenant
    const component = await this.prisma.engineeringComponent.findFirst({
      where: { id: dto.componentId },
      include: {
        template: {
          include: { variables: { select: { name: true } } },
        },
      },
    });
    if (!component || component.template.tenant_id !== tenantId) {
      throw new NotFoundException('Componente de ingeniería no encontrado');
    }

    // Validar la condición con el DSL
    const variableNames = component.template.variables.map((v) => v.name);
    const testVars: Record<string, number> = {};
    for (const name of variableNames) {
      testVars[name] = 1;
    }

    const condition = dto.condition.toUpperCase().trim();
    try {
      this.dslService.evaluateCondition(condition, testVars);
    } catch (error) {
      throw new BadRequestException(
        `Condición inválida "${condition}": ${error.message}`,
      );
    }

    return this.prisma.engineeringRule.create({
      data: {
        component_id: dto.componentId,
        condition: condition,
        action: dto.action,
        override_formula: dto.overrideFormula,
        priority: dto.priority ?? 0,
      },
    });
  }

  async updateRule(id: string, dto: UpdateRuleDto, tenantId: string) {
    const rule = await this.prisma.engineeringRule.findFirst({
      where: { id },
      include: {
        component: {
          include: {
            template: {
              include: { variables: { select: { name: true } } },
            },
          },
        },
      },
    });
    if (!rule || rule.component.template.tenant_id !== tenantId) {
      throw new NotFoundException('Regla de ingeniería no encontrada');
    }

    let condition = rule.condition;
    if (dto.condition !== undefined) {
      condition = dto.condition.toUpperCase().trim();
      const variableNames = rule.component.template.variables.map((v) => v.name);
      const testVars: Record<string, number> = {};
      for (const name of variableNames) {
        testVars[name] = 1;
      }
      try {
        this.dslService.evaluateCondition(condition, testVars);
      } catch (error) {
        throw new BadRequestException(
          `Condición inválida "${condition}": ${error.message}`,
        );
      }
    }

    return this.prisma.engineeringRule.update({
      where: { id },
      data: {
        condition: condition,
        action: dto.action,
        override_formula: dto.overrideFormula,
        priority: dto.priority,
      },
    });
  }

  async deleteRule(id: string, tenantId: string) {
    const rule = await this.prisma.engineeringRule.findFirst({
      where: { id },
      include: {
        component: {
          include: { template: { select: { tenant_id: true } } },
        },
      },
    });
    if (!rule || rule.component.template.tenant_id !== tenantId) {
      throw new NotFoundException('Regla de ingeniería no encontrada');
    }

    return this.prisma.engineeringRule.delete({ where: { id } });
  }
}
