import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tenant.findMany({
      include: {
        plan: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        plan: true,
        subscriptions: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Empresa (Tenant) no encontrada');
    }

    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Empresa (Tenant) no encontrada');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedTenant = await tx.tenant.update({
        where: { id },
        data: {
          name: dto.name,
          legal_name: dto.legalName,
          tax_id: dto.taxId,
          email: dto.email,
          phone: dto.phone,
          logo: dto.logo,
          country: dto.country,
          city: dto.city,
          municipality: dto.municipality,
          street: dto.street,
          number: dto.number,
          postal_code: dto.postalCode,
          whatsapp: dto.whatsapp,
          plan_id: dto.planId,
        },
      });

      if (dto.planId && dto.planId !== tenant.plan_id) {
        const targetPlan = await tx.plan.findUnique({
          where: { id: dto.planId },
        });

        if (targetPlan && targetPlan.code === 'demo') {
          const now = new Date();
          const endOfPeriod = new Date();
          endOfPeriod.setDate(now.getDate() + 30); // 30 días (1 mes)

          const activeSub = await tx.subscription.findFirst({
            where: { tenant_id: id, status: 'active' },
          });

          if (activeSub) {
            await tx.subscription.update({
              where: { id: activeSub.id },
              data: {
                plan_id: targetPlan.id,
                start_date: now,
                end_date: endOfPeriod,
                status: 'active',
              },
            });
          } else {
            await tx.subscription.create({
              data: {
                tenant_id: id,
                plan_id: targetPlan.id,
                status: 'active',
                start_date: now,
                end_date: endOfPeriod,
              },
            });
          }
        }
      }

      return updatedTenant;
    });
  }

  async updateStatus(id: string, status: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Empresa (Tenant) no encontrada');
    }

    const allowedStatuses = ['active', 'suspended', 'pending', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      throw new ConflictException('El estado enviado no es válido');
    }

    return this.prisma.tenant.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });
  }

  async deleteMyAccount(userId: string, tenantId: string, password: string) {
    // 1. Obtener el usuario actual
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 2. Validar la contraseña proporcionada
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new ForbiddenException('Contraseña incorrecta. No se puede eliminar la cuenta.');
    }

    // 3. Eliminar la empresa
    // Gracias a onDelete: Cascade configurado en Prisma, esto borrará todos
    // los registros asociados: users, roles, subscriptions, settings, payments, etc.
    // Los audit_logs tienen SetNull, por lo que se preservarán de forma anónima.
    await this.prisma.tenant.delete({
      where: { id: tenantId },
    });

    return { success: true, message: 'Cuenta y datos eliminados correctamente' };
  }

  async activateTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException('Empresa (Tenant) no encontrada');
    }

    if (tenant.status !== 'pending') {
      throw new ConflictException('La empresa ya está activa o en otro estado');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Activar Tenant
      const updatedTenant = await tx.tenant.update({
        where: { id },
        data: { status: 'active' },
      });

      // 2. Activar todos los usuarios "pending" del tenant
      await tx.user.updateMany({
        where: {
          tenant_id: id,
          status: 'pending',
        },
        data: { status: 'active' },
      });

      return updatedTenant;
    });
  }
}
