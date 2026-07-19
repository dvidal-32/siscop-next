import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, clientId?: string) {
    return this.prisma.project.findMany({
      where: {
        tenant_id: tenantId,
        ...(clientId ? { client_id: clientId } : {}),
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true, address: true, tax_id: true } },
        _count: { select: { quotes: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        quotes: {
          select: {
            id: true,
            code: true,
            status: true,
            total: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    return project;
  }

  async create(dto: CreateProjectDto, tenantId: string, userId: string) {
    // Verificar que el cliente pertenece al tenant
    const client = await this.prisma.client.findFirst({
      where: { id: dto.client_id, tenant_id: tenantId },
    });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return this.prisma.project.create({
      data: {
        tenant_id: tenantId,
        client_id: dto.client_id,
        name: dto.name,
        description: dto.description,
        address: dto.address,
        created_by: userId,
        updated_by: userId,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    tenantId: string,
    userId: string,
  ) {
    await this.findOne(id, tenantId);

    return this.prisma.project.update({
      where: { id },
      data: { ...dto, updated_by: userId },
      include: {
        client: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string, tenantId: string) {
    const project = await this.findOne(id, tenantId);

    if (project.quotes.length > 0) {
      throw new NotFoundException(
        'No se puede eliminar el proyecto porque tiene cotizaciones asociadas.',
      );
    }

    await this.prisma.project.delete({ where: { id } });
    return { message: 'Proyecto eliminado correctamente' };
  }
}
