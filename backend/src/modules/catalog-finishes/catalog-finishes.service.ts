import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateFinishDto } from './dto/create-finish.dto';
import { UpdateFinishDto } from './dto/update-finish.dto';

@Injectable()
export class CatalogFinishesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string | null) {
    return this.prisma.catalogFinish.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string | null) {
    const finish = await this.prisma.catalogFinish.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!finish) {
      throw new NotFoundException('Acabado/Color no encontrado');
    }
    return finish;
  }

  async create(dto: CreateFinishDto, tenantId: string | null) {
    const existing = await this.prisma.catalogFinish.findFirst({
      where: { tenant_id: tenantId, name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('Ya existe un acabado o color con este nombre');
    }

    return this.prisma.catalogFinish.create({
      data: {
        tenant_id: tenantId,
        name: dto.name,
        code: dto.code,
        price_multiplier: dto.priceMultiplier ?? 1.00,
        is_active: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateFinishDto, tenantId: string | null) {
    const finish = await this.prisma.catalogFinish.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!finish) {
      throw new NotFoundException('Acabado/Color no encontrado');
    }

    if (dto.name) {
      const existing = await this.prisma.catalogFinish.findFirst({
        where: {
          tenant_id: tenantId,
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException('Ya existe otro acabado o color con este nombre');
      }
    }

    return this.prisma.catalogFinish.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        price_multiplier: dto.priceMultiplier,
        is_active: dto.isActive,
      },
    });
  }

  async delete(id: string, tenantId: string | null) {
    const finish = await this.prisma.catalogFinish.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!finish) {
      throw new NotFoundException('Acabado/Color no encontrado');
    }

    return this.prisma.catalogFinish.delete({
      where: { id },
    });
  }
}
