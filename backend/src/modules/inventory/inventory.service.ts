import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllItems(tenantId: string) {
    return await this.prisma.inventoryItem.findMany({
      where: { tenant_id: tenantId },
      include: {
        catalog_item: true,
        warehouse: true,
      },
      orderBy: { catalog_item: { name: 'asc' } },
    });
  }

  async findItemsByWarehouse(warehouseId: string, tenantId: string) {
    return await this.prisma.inventoryItem.findMany({
      where: { tenant_id: tenantId, warehouse_id: warehouseId },
      include: { catalog_item: true },
    });
  }

  async findLowStockItems(tenantId: string) {
    // Para simplificar, buscamos los que current_stock <= stock_min
    // NOTA: Esto se puede optimizar con raw queries si crece mucho
    const items = await this.findAllItems(tenantId);
    return items.filter(item => Number(item.current_stock) <= Number(item.stock_min));
  }

  async updateMinMax(id: string, dto: { stock_min: number; stock_max: number }, tenantId: string) {
    return await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        stock_min: dto.stock_min,
        stock_max: dto.stock_max,
      }
    });
  }

  async createManualMovement(dto: any, tenantId: string, userId: string) {
    // dto: { inventory_item_id, type (ENTRADA, SALIDA, AJUSTE), quantity (positivo o negativo), notes }
    return await this.prisma.$transaction(async (tx) => {
      // 1. Obtener item actual
      const item = await tx.inventoryItem.findFirst({
        where: { id: dto.inventory_item_id, tenant_id: tenantId }
      });
      if (!item) throw new NotFoundException('Inventory item not found');

      // 2. Calcular nuevo stock
      const newStock = Number(item.current_stock) + Number(dto.quantity);
      if (newStock < 0) {
        throw new BadRequestException('El stock no puede quedar en negativo');
      }

      // 3. Crear movimiento (Kardex)
      const movement = await tx.inventoryMovement.create({
        data: {
          tenant_id: tenantId,
          inventory_item_id: item.id,
          type: dto.type,
          quantity: dto.quantity,
          notes: dto.notes,
          user_id: userId,
        }
      });

      // 4. Actualizar stock
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { current_stock: newStock }
      });

      return movement;
    });
  }

  async findAllMovements(tenantId: string) {
    return await this.prisma.inventoryMovement.findMany({
      where: { tenant_id: tenantId },
      include: {
        inventory_item: {
          include: { catalog_item: true, warehouse: true }
        },
        user: {
          select: { first_name: true, last_name: true }
        }
      },
      orderBy: { date: 'desc' }
    });
  }
}
