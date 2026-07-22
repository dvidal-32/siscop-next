import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class CatalogItemsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string | null, type?: string) {
    return this.prisma.catalogItem.findMany({
      where: {
        tenant_id: tenantId,
        ...(type ? { type } : {}),
      },
      include: {
        system: true,
        variants: { include: { finish: true } },
        base_item: true,
        finish: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string | null) {
    const item = await this.prisma.catalogItem.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        system: true,
        variants: { include: { finish: true } },
        base_item: true,
        finish: true,
      },
    });
    if (!item) {
      throw new NotFoundException('Artículo de catálogo no encontrado');
    }
    return item;
  }

  async create(dto: CreateItemDto, tenantId: string | null) {
    // Validar código único por tenant
    const existing = await this.prisma.catalogItem.findFirst({
      where: { tenant_id: tenantId, code: { equals: dto.code, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('Ya existe un artículo registrado con este código');
    }

    // Validar que si se asocia una línea/sistema, ésta exista y pertenezca al tenant
    if (dto.systemId) {
      const system = await this.prisma.catalogSystem.findFirst({
        where: { id: dto.systemId, tenant_id: tenantId },
      });
      if (!system) {
        throw new NotFoundException('La línea/sistema asociada no existe');
      }
    }

    return this.prisma.catalogItem.create({
      data: {
        tenant_id: tenantId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        unit: dto.unit,
        cost: dto.cost,
        price_1: dto.price_1 || null,
        price_2: dto.price_2 || null,
        price_3: dto.price_3 || null,
        price_4: dto.price_4 || null,
        image: dto.image,
        is_active: dto.isActive ?? true,
        // Específico perfiles
        weight_per_meter: dto.type === 'profile' ? dto.weightPerMeter : null,
        standard_length: dto.type === 'profile' ? dto.standardLength : null,
        system_id: dto.systemId || null,
        // Específico vidrios
        thickness_mm: dto.type === 'glass' ? dto.thicknessMm : null,
        glass_type: dto.type === 'glass' ? dto.glassType : null,
        weight_per_m2: dto.type === 'glass' ? dto.weightPerM2 : null,
        base_item_id: dto.baseItemId || null,
        finish_id: dto.finishId || null,
      },
      include: {
        system: true,
        variants: { include: { finish: true } },
        base_item: true,
        finish: true,
      },
    });
  }

  async update(id: string, dto: UpdateItemDto, tenantId: string | null) {
    const item = await this.prisma.catalogItem.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!item) {
      throw new NotFoundException('Artículo de catálogo no encontrado');
    }

    if (dto.code) {
      const existing = await this.prisma.catalogItem.findFirst({
        where: {
          tenant_id: tenantId,
          code: { equals: dto.code, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException('Ya existe otro artículo registrado con este código');
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

    const type = dto.type ?? item.type;

    return this.prisma.catalogItem.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        unit: dto.unit,
        cost: dto.cost,
        price_1: dto.price_1 !== undefined ? dto.price_1 : item.price_1,
        price_2: dto.price_2 !== undefined ? dto.price_2 : item.price_2,
        price_3: dto.price_3 !== undefined ? dto.price_3 : item.price_3,
        price_4: dto.price_4 !== undefined ? dto.price_4 : item.price_4,
        image: dto.image !== undefined ? dto.image : item.image,
        is_active: dto.isActive,
        // Específico perfiles (limpiar si el tipo cambia o mantener según el tipo)
        weight_per_meter: type === 'profile' ? (dto.weightPerMeter !== undefined ? dto.weightPerMeter : item.weight_per_meter) : null,
        standard_length: type === 'profile' ? (dto.standardLength !== undefined ? dto.standardLength : item.standard_length) : null,
        system_id: dto.systemId !== undefined ? dto.systemId : item.system_id,
        // Específico vidrios
        thickness_mm: type === 'glass' ? (dto.thicknessMm !== undefined ? dto.thicknessMm : item.thickness_mm) : null,
        glass_type: type === 'glass' ? (dto.glassType !== undefined ? dto.glassType : item.glass_type) : null,
        weight_per_m2: type === 'glass' ? (dto.weightPerM2 !== undefined ? dto.weightPerM2 : item.weight_per_m2) : null,
        base_item_id: dto.baseItemId !== undefined ? (dto.baseItemId || null) : item.base_item_id,
        finish_id: dto.finishId !== undefined ? (dto.finishId || null) : item.finish_id,
      },
      include: {
        system: true,
        variants: { include: { finish: true } },
        base_item: true,
        finish: true,
      },
    });
  }

  async delete(id: string, tenantId: string | null) {
    const item = await this.prisma.catalogItem.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!item) {
      throw new NotFoundException('Artículo de catálogo no encontrado');
    }

    return this.prisma.catalogItem.delete({
      where: { id },
    });
  }

  async bulkUpdatePrices(
    items: { id: string; cost: number; price_1?: number; price_2?: number; price_3?: number; price_4?: number }[],
    tenantId: string | null,
  ) {
    // Verificamos que los items pertenezcan al tenant antes de actualizar (opcional pero seguro)
    const updates = items.map((item) =>
      this.prisma.catalogItem.update({
        where: { id: item.id },
        data: {
          cost: item.cost,
          price_1: item.price_1,
          price_2: item.price_2,
          price_3: item.price_3,
          price_4: item.price_4,
        },
      }),
    );
    await this.prisma.$transaction(updates);
    return { success: true, count: updates.length };
  }
}
