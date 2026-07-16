import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';

@Injectable()
export class LibraryService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────
  // BIBLIOTECA GLOBAL — Lectura para Tenants
  // ──────────────────────────────────────────

  /**
   * Lista todas las plantillas globales disponibles para importar.
   * Las plantillas globales tienen tenant_id = null.
   */
  async getGlobalTemplates() {
    return this.prisma.engineeringTemplate.findMany({
      where: { tenant_id: null, is_active: true },
      include: {
        system: true,
        _count: { select: { variables: true, components: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Ver el detalle de una plantilla global (solo lectura para tenants).
   */
  async getGlobalTemplateDetail(templateId: string) {
    const template = await this.prisma.engineeringTemplate.findFirst({
      where: { id: templateId, tenant_id: null },
      include: {
        system: true,
        variables: { orderBy: { order: 'asc' } },
        components: {
          orderBy: { order: 'asc' },
          include: {
            catalog_item: { select: { id: true, code: true, name: true, type: true, unit: true } },
            formula: true,
            rules: { orderBy: { priority: 'asc' } },
          },
        },
      },
    });
    if (!template) {
      throw new NotFoundException('Plantilla global no encontrada');
    }
    return template;
  }

  // ──────────────────────────────────────────
  // IMPORTACIÓN — Clonación Profunda
  // ──────────────────────────────────────────

  /**
   * Importa (clona) una plantilla global al espacio de un tenant.
   * Realiza una copia profunda de: template → variables → components → formulas → rules.
   * El tenant recibe una copia independiente que puede personalizar.
   */
  async importTemplate(globalTemplateId: string, tenantId: string) {
    // 1. Verificar que la plantilla global existe
    const globalTemplate = await this.prisma.engineeringTemplate.findFirst({
      where: { id: globalTemplateId, tenant_id: null, is_active: true },
      include: {
        variables: true,
        components: {
          include: {
            formula: true,
            rules: true,
          },
        },
      },
    });

    if (!globalTemplate) {
      throw new NotFoundException('Plantilla global no encontrada o inactiva');
    }

    // 2. Verificar que no se haya importado ya con el mismo código
    const existing = await this.prisma.engineeringTemplate.findFirst({
      where: { tenant_id: tenantId, code: globalTemplate.code },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe una plantilla con el código "${globalTemplate.code}" en tu espacio. Puedes renombrar la existente e importar de nuevo.`,
      );
    }

    // 3. Clonación profunda dentro de una transacción
    return this.prisma.$transaction(async (tx) => {
      // 3a. Clonar la plantilla
      const clonedTemplate = await tx.engineeringTemplate.create({
        data: {
          tenant_id: tenantId,
          name: globalTemplate.name,
          code: globalTemplate.code,
          description: globalTemplate.description,
          system_id: null, // El sistema es específico del tenant, no se clona
          is_active: true,
          source_template_id: globalTemplate.id,
        },
      });

      // 3b. Clonar las variables
      const variableIdMap = new Map<string, string>(); // oldId → newId
      for (const variable of globalTemplate.variables) {
        const clonedVar = await tx.engineeringVariable.create({
          data: {
            template_id: clonedTemplate.id,
            name: variable.name,
            label: variable.label,
            type: variable.type,
            default_value: variable.default_value,
            is_required: variable.is_required,
            min_value: variable.min_value,
            max_value: variable.max_value,
            list_options: variable.list_options as any,
            order: variable.order,
          },
        });
        variableIdMap.set(variable.id, clonedVar.id);
      }

      // 3c. Clonar los componentes, fórmulas y reglas
      for (const component of globalTemplate.components) {
        const clonedComponent = await tx.engineeringComponent.create({
          data: {
            template_id: clonedTemplate.id,
            catalog_item_id: null, // Los artículos de catálogo son específicos del tenant
            type: component.type,
            name: component.name,
            description: component.description,
            order: component.order,
          },
        });

        // Clonar fórmula del componente
        if (component.formula) {
          await tx.engineeringFormula.create({
            data: {
              component_id: clonedComponent.id,
              quantity_formula: component.formula.quantity_formula,
              width_formula: component.formula.width_formula,
              height_formula: component.formula.height_formula,
              length_formula: component.formula.length_formula,
              area_formula: component.formula.area_formula,
            },
          });
        }

        // Clonar reglas del componente
        for (const rule of component.rules) {
          await tx.engineeringRule.create({
            data: {
              component_id: clonedComponent.id,
              condition: rule.condition,
              action: rule.action,
              override_formula: rule.override_formula as any,
              priority: rule.priority,
            },
          });
        }
      }

      // 4. Retornar la plantilla clonada completa
      return tx.engineeringTemplate.findUnique({
        where: { id: clonedTemplate.id },
        include: {
          variables: { orderBy: { order: 'asc' } },
          components: {
            orderBy: { order: 'asc' },
            include: {
              formula: true,
              rules: { orderBy: { priority: 'asc' } },
            },
          },
          source_template: { select: { id: true, name: true, code: true } },
        },
      });
    });
  }

  // ──────────────────────────────────────────
  // CRUD GLOBAL — Solo SuperAdmin
  // ──────────────────────────────────────────

  async createGlobalTemplate(dto: CreateTemplateDto) {
    // Verificar código único entre plantillas globales
    const existing = await this.prisma.engineeringTemplate.findFirst({
      where: { tenant_id: null, code: { equals: dto.code, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('Ya existe una plantilla global con este código');
    }

    return this.prisma.engineeringTemplate.create({
      data: {
        tenant_id: null, // Global
        name: dto.name,
        code: dto.code,
        description: dto.description,
        system_id: null,
        is_active: dto.isActive ?? true,
      },
    });
  }

  async updateGlobalTemplate(id: string, dto: UpdateTemplateDto) {
    const template = await this.prisma.engineeringTemplate.findFirst({
      where: { id, tenant_id: null },
    });
    if (!template) {
      throw new NotFoundException('Plantilla global no encontrada');
    }

    if (dto.code) {
      const existing = await this.prisma.engineeringTemplate.findFirst({
        where: {
          tenant_id: null,
          code: { equals: dto.code, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException('Ya existe otra plantilla global con este código');
      }
    }

    return this.prisma.engineeringTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        is_active: dto.isActive,
      },
    });
  }

  async deleteGlobalTemplate(id: string) {
    const template = await this.prisma.engineeringTemplate.findFirst({
      where: { id, tenant_id: null },
    });
    if (!template) {
      throw new NotFoundException('Plantilla global no encontrada');
    }

    return this.prisma.engineeringTemplate.update({
      where: { id },
      data: { is_active: false },
    });
  }
}
