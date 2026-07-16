import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';

@Injectable()
export class TaxesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.taxSetting.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const tax = await this.prisma.taxSetting.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!tax) {
      throw new NotFoundException('Impuesto no encontrado');
    }
    return tax;
  }

  async create(dto: CreateTaxDto, tenantId: string) {
    // Verificar si ya existe un impuesto con el mismo nombre para este tenant
    const existing = await this.prisma.taxSetting.findFirst({
      where: { tenant_id: tenantId, name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('Ya existe un impuesto registrado con este nombre');
    }

    return this.prisma.$transaction(async (tx) => {
      // Si se define como default, quitar default a los demás impuestos del tenant
      if (dto.isDefault) {
        await tx.taxSetting.updateMany({
          where: { tenant_id: tenantId, is_default: true },
          data: { is_default: false },
        });
      }

      return tx.taxSetting.create({
        data: {
          tenant_id: tenantId,
          name: dto.name,
          rate: dto.rate,
          is_active: dto.isActive ?? true,
          is_default: dto.isDefault ?? false,
        },
      });
    });
  }

  async update(id: string, dto: UpdateTaxDto, tenantId: string) {
    const tax = await this.prisma.taxSetting.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!tax) {
      throw new NotFoundException('Impuesto no encontrado');
    }

    if (dto.name) {
      const existing = await this.prisma.taxSetting.findFirst({
        where: {
          tenant_id: tenantId,
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException('Ya existe otro impuesto registrado con este nombre');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.taxSetting.updateMany({
          where: { tenant_id: tenantId, is_default: true },
          data: { is_default: false },
        });
      }

      return tx.taxSetting.update({
        where: { id },
        data: {
          name: dto.name,
          rate: dto.rate,
          is_active: dto.isActive,
          is_default: dto.isDefault,
        },
      });
    });
  }

  async delete(id: string, tenantId: string) {
    const tax = await this.prisma.taxSetting.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!tax) {
      throw new NotFoundException('Impuesto no encontrado');
    }

    return this.prisma.taxSetting.delete({
      where: { id },
    });
  }
}
