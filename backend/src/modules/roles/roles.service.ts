import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const filters: any = {
      OR: [
        { tenant_id: tenantId },
        { tenant_id: null }, // Roles globales
      ],
    };

    if (tenantId) {
      // Excluir el rol de Super Administrador para los tenants regulares
      filters.name = { not: 'Super Administrador' };
    }

    return this.prisma.role.findMany({
      where: filters,
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const role = await this.prisma.role.findFirst({
      where: {
        id,
        OR: [
          { tenant_id: tenantId },
          { tenant_id: null },
        ],
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    return role;
  }

  async create(dto: CreateRoleDto, tenantId: string) {
    return this.prisma.role.create({
      data: {
        tenant_id: tenantId,
        name: dto.name,
        description: dto.description,
        is_system_role: false,
        permissions: {
          create: dto.permissionIds.map((pid) => ({
            permission_id: pid,
          })),
        },
      },
      include: {
        permissions: true,
      },
    });
  }

  async update(id: string, dto: UpdateRoleDto, tenantId: string) {
    // 1. Validar que exista el rol y pertenezca al tenant
    const role = await this.prisma.role.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado o no pertenece a su empresa');
    }

    // 2. Bloquear edición si es un rol de sistema
    if (role.is_system_role) {
      throw new ForbiddenException('No se pueden modificar roles protegidos del sistema');
    }

    // 3. Ejecutar actualización en transacción
    return this.prisma.$transaction(async (tx) => {
      // Si se envían permisos, limpiar los anteriores y recrear
      if (dto.permissionIds) {
        await tx.rolePermission.deleteMany({
          where: { role_id: id },
        });
      }

      return tx.role.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          permissions: dto.permissionIds
            ? {
                create: dto.permissionIds.map((pid) => ({
                  permission_id: pid,
                })),
              }
            : undefined,
        },
        include: {
          permissions: true,
        },
      });
    });
  }

  async delete(id: string, tenantId: string) {
    // 1. Validar existencia e id de tenant
    const role = await this.prisma.role.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado o no pertenece a su empresa');
    }

    // 2. Validar que no sea del sistema
    if (role.is_system_role) {
      throw new ForbiddenException('No se pueden eliminar roles protegidos del sistema');
    }

    // 3. Validar si tiene usuarios asignados
    const usersCount = await this.prisma.userRole.count({
      where: { role_id: id },
    });

    if (usersCount > 0) {
      throw new ConflictException('No se puede eliminar el rol porque tiene usuarios asignados');
    }

    // 4. Eliminar (Borrado en cascada configurado en Prisma para rolePermissions)
    await this.prisma.role.delete({
      where: { id },
    });

    return { message: 'Rol eliminado correctamente' };
  }
}
