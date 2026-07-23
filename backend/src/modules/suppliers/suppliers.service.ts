import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSupplierDto: any, tenantId: string) {
    return await this.prisma.supplier.create({
      data: {
        ...createSupplierDto,
        tenant_id: tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return await this.prisma.supplier.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string, tenantId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenant_id: tenantId }
    });
    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
    }
    return supplier;
  }

  async update(id: string, updateSupplierDto: any, tenantId: string) {
    await this.findOne(id, tenantId); // Validar que existe y pertenece al tenant
    return await this.prisma.supplier.update({
      where: { id },
      data: updateSupplierDto,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId); // Validar que existe
    return await this.prisma.supplier.delete({
      where: { id }
    });
  }
}
