import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateSystemDto } from './dto/create-system.dto';
import { UpdateSystemDto } from './dto/update-system.dto';

@Injectable()
export class CatalogSystemsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string | null) {
    return this.prisma.catalogSystem.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string | null) {
    const system = await this.prisma.catalogSystem.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!system) {
      throw new NotFoundException('Sistema/Línea no encontrado');
    }
    return system;
  }

  async create(dto: CreateSystemDto, tenantId: string | null) {
    const existing = await this.prisma.catalogSystem.findFirst({
      where: { tenant_id: tenantId, name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('Ya existe un sistema o línea con este nombre');
    }

    return this.prisma.catalogSystem.create({
      data: {
        tenant_id: tenantId,
        name: dto.name,
        description: dto.description,
        is_active: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateSystemDto, tenantId: string | null) {
    const system = await this.prisma.catalogSystem.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!system) {
      throw new NotFoundException('Sistema/Línea no encontrado');
    }

    if (dto.name) {
      const existing = await this.prisma.catalogSystem.findFirst({
        where: {
          tenant_id: tenantId,
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException('Ya existe otro sistema o línea con este nombre');
      }
    }

    return this.prisma.catalogSystem.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        is_active: dto.isActive,
      },
    });
  }

  async delete(id: string, tenantId: string | null) {
    const system = await this.prisma.catalogSystem.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!system) {
      throw new NotFoundException('Sistema/Línea no encontrado');
    }

    // Verificar si hay perfiles o artículos asociados a esta línea/sistema antes de borrar
    const associatedItemsCount = await this.prisma.catalogItem.count({
      where: { system_id: id },
    });
    if (associatedItemsCount > 0) {
      throw new ConflictException('No se puede eliminar la línea porque tiene artículos asociados en el catálogo');
    }

    return this.prisma.catalogSystem.delete({
      where: { id },
    });
  }
}
