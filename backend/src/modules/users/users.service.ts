import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenant_id: tenantId },
      select: {
        id: true,
        email: true,
        username: true,
        first_name: true,
        last_name: true,
        status: true,
        last_login_at: true,
        created_at: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenant_id: tenantId },
      select: {
        id: true,
        email: true,
        username: true,
        first_name: true,
        last_name: true,
        status: true,
        last_login_at: true,
        created_at: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                permissions: {
                  select: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async create(dto: CreateUserDto, tenantId: string) {
    // 1. Validar email único
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    // Validar límite de usuarios según el plan del tenant
    const currentUsersCount = await this.prisma.user.count({
      where: { tenant_id: tenantId },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    });

    if (tenant && tenant.plan && currentUsersCount >= tenant.plan.max_users) {
      throw new ForbiddenException(
        `Su plan actual (${tenant.plan.name}) solo permite un máximo de ${tenant.plan.max_users} usuarios.`
      );
    }

    // 2. Validar que los roles existan y pertenezcan al tenant
    const roles = await this.prisma.role.findMany({
      where: {
        id: { in: dto.roleIds },
        OR: [{ tenant_id: tenantId }, { tenant_id: null }],
      },
    });

    if (roles.length !== dto.roleIds.length) {
      throw new NotFoundException('Uno o más roles seleccionados no existen o no pertenecen a su empresa');
    }

    // 3. Encriptar contraseña
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 4. Crear usuario transaccionalmente
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenant_id: tenantId,
          email: dto.email,
          password_hash: passwordHash,
          first_name: dto.firstName,
          last_name: dto.lastName,
          status: 'active',
        },
      });

      await tx.userRole.createMany({
        data: dto.roleIds.map((rid) => ({
          user_id: user.id,
          role_id: rid,
        })),
      });

      return tx.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          status: true,
          created_at: true,
        },
      });
    });
  }

  async update(id: string, dto: UpdateUserDto, tenantId: string) {
    // 1. Validar usuario existente
    const user = await this.prisma.user.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado o no pertenece a su empresa');
    }

    // 2. Si se envían roles, validarlos
    if (dto.roleIds) {
      const roles = await this.prisma.role.findMany({
        where: {
          id: { in: dto.roleIds },
          OR: [{ tenant_id: tenantId }, { tenant_id: null }],
        },
      });
      if (roles.length !== dto.roleIds.length) {
        throw new NotFoundException('Uno o más roles seleccionados no existen');
      }
    }

    // 3. Actualizar transaccionalmente
    return this.prisma.$transaction(async (tx) => {
      if (dto.roleIds) {
        // Limpiar roles anteriores
        await tx.userRole.deleteMany({
          where: { user_id: id },
        });
      }
      const updateData: any = {
        first_name: dto.firstName,
        last_name: dto.lastName,
      };

      fs.appendFileSync('test-log.txt', `\n--- UPDATE START ---\nDTO received: ${JSON.stringify(dto)}\n`);

      if (dto.password) {
        updateData.password_hash = await bcrypt.hash(dto.password, 10);
        fs.appendFileSync('test-log.txt', `Password was provided. Hashed: ${updateData.password_hash}\n`);
      } else {
        fs.appendFileSync('test-log.txt', `No password provided in DTO.\n`);
      }

      if (dto.roleIds) {
        updateData.roles = {
          create: dto.roleIds.map((rid) => ({
            role_id: rid,
          })),
        };
      }

      return tx.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          status: true,
        },
      });
    });
  }

  async updateStatus(id: string, status: string, currentUserId: string, tenantId: string) {
    // 1. Validar existencia
    const user = await this.prisma.user.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 2. Prevenir que se bloquee a sí mismo
    if (id === currentUserId) {
      throw new ForbiddenException('No puedes cambiar tu propio estado de actividad');
    }

    // 3. Validar estado correcto
    const allowedStatuses = ['active', 'inactive', 'locked'];
    if (!allowedStatuses.includes(status)) {
      throw new ConflictException('El estado enviado no es válido');
    }

    // 4. Actualizar
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        email: true,
        status: true,
      },
    });
  }
}
