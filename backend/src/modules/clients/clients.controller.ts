import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { AuditAction } from '../../shared/decorators/audit.decorator';
import { AuditInterceptor } from '../../shared/interceptors/audit.interceptor';

@Controller('clients')
@UseInterceptors(AuditInterceptor)
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  // ──────────────────────────────────────────
  // CLIENTES
  // ──────────────────────────────────────────

  @Get()
  @RequirePermissions('clients.view')
  findAll(@CurrentTenant() tenantId: string) {
    return this.clientsService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('clients.view')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.clientsService.findOne(id, tenantId);
  }

  @Post()
  @RequirePermissions('clients.create')
  @AuditAction('clients', 'create', 'client')
  create(
    @Body() dto: CreateClientDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.create(dto, tenantId, user.id);
  }

  @Patch(':id')
  @RequirePermissions('clients.update')
  @AuditAction('clients', 'update', 'client')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.update(id, dto, tenantId, user.id);
  }

  @Delete(':id')
  @RequirePermissions('clients.delete')
  @AuditAction('clients', 'delete', 'client')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.clientsService.remove(id, tenantId);
  }

  // ──────────────────────────────────────────
  // CONTACTOS
  // ──────────────────────────────────────────

  @Get(':clientId/contacts')
  @RequirePermissions('clients.view')
  findContacts(
    @Param('clientId') clientId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.clientsService.findContacts(clientId, tenantId);
  }

  @Post(':clientId/contacts')
  @RequirePermissions('clients.update')
  @AuditAction('clients', 'create', 'contact')
  createContact(
    @Param('clientId') clientId: string,
    @Body() dto: CreateContactDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.clientsService.createContact(clientId, dto, tenantId);
  }

  @Patch('contacts/:contactId')
  @RequirePermissions('clients.update')
  @AuditAction('clients', 'update', 'contact')
  updateContact(
    @Param('contactId') contactId: string,
    @Body() dto: UpdateContactDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.clientsService.updateContact(contactId, dto, tenantId);
  }

  @Delete('contacts/:contactId')
  @RequirePermissions('clients.update')
  @AuditAction('clients', 'delete', 'contact')
  removeContact(
    @Param('contactId') contactId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.clientsService.removeContact(contactId, tenantId);
  }
}
