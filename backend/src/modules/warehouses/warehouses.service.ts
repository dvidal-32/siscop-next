import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createWarehouseDto: any, tenantId: string) {
    // Si se marca como principal, quitamos el principal a los demás en una transacción
    if (createWarehouseDto.is_main) {
      return await this.prisma.$transaction(async (tx) => {
        await tx.warehouse.updateMany({
          where: { tenant_id: tenantId, is_main: true },
          data: { is_main: false },
        });
        return await tx.warehouse.create({
          data: { ...createWarehouseDto, tenant_id: tenantId },
        });
      });
    }

    return await this.prisma.warehouse.create({
      data: {
        ...createWarehouseDto,
        tenant_id: tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return await this.prisma.warehouse.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!warehouse) {
      throw new NotFoundException('Almacén no encontrado');
    }
    return warehouse;
  }

  async update(id: string, updateWarehouseDto: any, tenantId: string) {
    await this.findOne(id, tenantId); // Validar

    // Si se marca como principal, quitamos el principal a los demás
    if (updateWarehouseDto.is_main) {
      return await this.prisma.$transaction(async (tx) => {
        await tx.warehouse.updateMany({
          where: { tenant_id: tenantId, is_main: true, id: { not: id } },
          data: { is_main: false },
        });
        return await tx.warehouse.update({
          where: { id },
          data: updateWarehouseDto,
        });
      });
    }

    return await this.prisma.warehouse.update({
      where: { id },
      data: updateWarehouseDto,
    });
  }

  async remove(id: string, tenantId: string) {
    const warehouse = await this.findOne(id, tenantId);
    
    // Opcional: Proteger para que no borren el almacén si tiene inventario
    const itemsCount = await this.prisma.inventoryItem.count({
      where: { warehouse_id: id }
    });

    if (itemsCount > 0) {
      throw new BadRequestException('No se puede eliminar un almacén que contiene inventario. Traslada los artículos primero.');
    }

    return await this.prisma.warehouse.delete({
      where: { id },
    });
  }
}
