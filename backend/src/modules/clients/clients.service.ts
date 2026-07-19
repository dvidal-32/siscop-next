import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────
  // CLIENTES
  // ──────────────────────────────────────────

  async findAll(tenantId: string) {
    return this.prisma.client.findMany({
      where: { tenant_id: tenantId },
      include: {
        _count: {
          select: { contacts: true, projects: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        contacts: { orderBy: { first_name: 'asc' } },
        projects: {
          select: { id: true, name: true, status: true, created_at: true },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return client;
  }

  async create(dto: CreateClientDto, tenantId: string, userId: string) {
    return this.prisma.client.create({
      data: {
        tenant_id: tenantId,
        name: dto.name,
        tax_id: dto.tax_id,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        price_list_level: dto.price_list_level || 1,
        created_by: userId,
        updated_by: userId,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateClientDto,
    tenantId: string,
    userId: string,
  ) {
    await this.findOne(id, tenantId);

    return this.prisma.client.update({
      where: { id },
      data: { ...dto, updated_by: userId },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    // Verificar si tiene proyectos activos o cotizaciones
    const projectCount = await this.prisma.project.count({
      where: { client_id: id },
    });
    if (projectCount > 0) {
      throw new ConflictException(
        'No se puede eliminar el cliente porque tiene proyectos asociados. Desactívelo en su lugar.',
      );
    }

    await this.prisma.client.delete({ where: { id } });
    return { message: 'Cliente eliminado correctamente' };
  }

  // ──────────────────────────────────────────
  // CONTACTOS
  // ──────────────────────────────────────────

  async findContacts(clientId: string, tenantId: string) {
    await this.findOne(clientId, tenantId); // Verifica ownership
    return this.prisma.contact.findMany({
      where: { client_id: clientId },
      orderBy: { first_name: 'asc' },
    });
  }

  async createContact(
    clientId: string,
    dto: CreateContactDto,
    tenantId: string,
  ) {
    await this.findOne(clientId, tenantId); // Verifica ownership
    return this.prisma.contact.create({
      data: { client_id: clientId, ...dto },
    });
  }

  async updateContact(
    contactId: string,
    dto: UpdateContactDto,
    tenantId: string,
  ) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId },
      include: { client: { select: { tenant_id: true } } },
    });

    if (!contact || contact.client.tenant_id !== tenantId) {
      throw new NotFoundException('Contacto no encontrado');
    }

    return this.prisma.contact.update({ where: { id: contactId }, data: dto });
  }

  async removeContact(contactId: string, tenantId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId },
      include: { client: { select: { tenant_id: true } } },
    });

    if (!contact || contact.client.tenant_id !== tenantId) {
      throw new NotFoundException('Contacto no encontrado');
    }

    await this.prisma.contact.delete({ where: { id: contactId } });
    return { message: 'Contacto eliminado correctamente' };
  }
}
