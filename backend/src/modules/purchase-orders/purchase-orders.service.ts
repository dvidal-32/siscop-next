import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: any, tenantId: string, userId: string) {
    // Generate code if not provided
    const code = createDto.code || `OC-${Date.now()}`;
    
    const subtotal = createDto.items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * (Number(item.unit_price) || 0)), 0);
    const discount = Number(createDto.discount) || 0;
    const tax = Number(createDto.tax) || 0;
    const total = subtotal - discount + tax;

    return await this.prisma.purchaseOrder.create({
      data: {
        tenant_id: tenantId,
        supplier_id: createDto.supplier_id,
        warehouse_id: createDto.warehouse_id,
        code: code,
        notes: createDto.notes,
        subtotal: subtotal,
        discount: discount,
        tax: tax,
        total: total,
        items: {
          create: createDto.items.map((item: any) => ({
            catalog_item_id: item.catalog_item_id,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price) || 0,
            total_price: Number(item.quantity) * (Number(item.unit_price) || 0)
          }))
        }
      },
      include: { items: true }
    });
  }

  async update(id: string, updateDto: any, tenantId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenant_id: tenantId }
    });

    if (!po) throw new NotFoundException('Orden de compra no encontrada');
    if (po.status !== 'DRAFT' && po.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden editar órdenes en estado Borrador o Pendiente.');
    }

    const subtotal = updateDto.items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * (Number(item.unit_price) || 0)), 0);
    const discount = Number(updateDto.discount) || 0;
    const tax = Number(updateDto.tax) || 0;
    const total = subtotal - discount + tax;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Delete existing items
      await tx.purchaseOrderItem.deleteMany({
        where: { purchase_order_id: id }
      });

      // 2. Update PO and create new items
      return await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplier_id: updateDto.supplier_id,
          warehouse_id: updateDto.warehouse_id,
          notes: updateDto.notes,
          subtotal: subtotal,
          discount: discount,
          tax: tax,
          total: total,
          items: {
            create: updateDto.items.map((item: any) => ({
              catalog_item_id: item.catalog_item_id,
              quantity: Number(item.quantity),
              unit_price: Number(item.unit_price) || 0,
              total_price: Number(item.quantity) * (Number(item.unit_price) || 0)
            }))
          }
        },
        include: { items: true }
      });
    });
  }

  async findAll(tenantId: string) {
    return await this.prisma.purchaseOrder.findMany({
      where: { tenant_id: tenantId },
      include: { supplier: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenant_id: tenantId },
      include: { 
        supplier: true, 
        items: { include: { catalog_item: true } },
        receipts: { include: { movements: true } }
      }
    });
    if (!po) throw new NotFoundException('Orden de compra no encontrada');
    return po;
  }

  async updateStatus(id: string, status: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status }
    });
  }

  async createReceipt(poId: string, receiptDto: any, tenantId: string, userId: string) {
    // receiptDto: { invoice_number, invoice_date, items: [{ purchase_order_item_id, catalog_item_id, quantity_received, warehouse_id }] }
    
    return await this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { id: poId, tenant_id: tenantId },
        include: { items: true }
      });
      if (!po) throw new NotFoundException('PO no encontrada');

      // 1. Crear el Receipt
      const receipt = await tx.purchaseOrderReceipt.create({
        data: {
          purchase_order_id: po.id,
          invoice_number: receiptDto.invoice_number,
          invoice_date: receiptDto.invoice_date ? new Date(receiptDto.invoice_date) : null,
          notes: receiptDto.notes,
          created_by: userId,
        }
      });

      let allItemsFullyReceived = true;

      // 2. Procesar cada item recibido
      for (const reqItem of receiptDto.items) {
        const poItem = po.items.find(i => i.id === reqItem.purchase_order_item_id);
        if (!poItem) continue;

        const newReceivedQty = Number(poItem.received_quantity) + Number(reqItem.quantity_received);
        
        // Actualizar received_quantity en el PO Item
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { received_quantity: newReceivedQty }
        });

        if (newReceivedQty < Number(poItem.quantity)) {
          allItemsFullyReceived = false;
        }

        // Obtener o crear InventoryItem en el Warehouse especificado
        let invItem = await tx.inventoryItem.findFirst({
          where: { tenant_id: tenantId, warehouse_id: reqItem.warehouse_id, catalog_item_id: reqItem.catalog_item_id }
        });

        if (!invItem) {
          invItem = await tx.inventoryItem.create({
            data: {
              tenant_id: tenantId,
              warehouse_id: reqItem.warehouse_id,
              catalog_item_id: reqItem.catalog_item_id,
              current_stock: 0,
            }
          });
        }

        // Crear Movimiento (Kardex) y amarrarlo al Receipt
        await tx.inventoryMovement.create({
          data: {
            tenant_id: tenantId,
            inventory_item_id: invItem.id,
            type: 'ENTRADA',
            quantity: reqItem.quantity_received,
            reference_id: po.code,
            supplier_invoice_number: receiptDto.invoice_number,
            user_id: userId,
            receipt_id: receipt.id
          }
        });

        // Actualizar stock real
        await tx.inventoryItem.update({
          where: { id: invItem.id },
          data: { current_stock: Number(invItem.current_stock) + Number(reqItem.quantity_received) }
        });

        // Actualizar costo en el catálogo maestro usando el precio de compra
        if (Number(poItem.unit_price) > 0) {
          await tx.catalogItem.update({
            where: { id: reqItem.catalog_item_id },
            data: {
              cost: poItem.unit_price,
              last_cost: poItem.unit_price
            }
          });
        }
      }

      // 3. Actualizar estado de la PO (Parcial o Completa)
      const newStatus = allItemsFullyReceived ? 'COMPLETED' : 'PARTIAL_RECEIPT';
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: newStatus }
      });

      return receipt;
    });
  }
}
