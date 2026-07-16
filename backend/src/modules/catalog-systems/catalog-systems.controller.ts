import { Controller, Get, Post, Patch, Delete, Body, Param, UseInterceptors } from '@nestjs/common';
import { CatalogSystemsService } from './catalog-systems.service';
import { CreateSystemDto } from './dto/create-system.dto';
import { UpdateSystemDto } from './dto/update-system.dto';
import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { AuditAction } from '../../shared/decorators/audit.decorator';
import { AuditInterceptor } from '../../shared/interceptors/audit.interceptor';

@Controller('catalog-systems')
@UseInterceptors(AuditInterceptor)
export class CatalogSystemsController {
  constructor(private catalogSystemsService: CatalogSystemsService) {}

  @Get()
  @RequirePermissions('settings.view')
  findAll(@CurrentTenant() tenantId: string | null) {
    return this.catalogSystemsService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('settings.view')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string | null) {
    return this.catalogSystemsService.findOne(id, tenantId);
  }

  @Post()
  @RequirePermissions('settings.update')
  @AuditAction('catalog-systems', 'create', 'system')
  create(@Body() dto: CreateSystemDto, @CurrentTenant() tenantId: string | null) {
    return this.catalogSystemsService.create(dto, tenantId);
  }

  @Patch(':id')
  @RequirePermissions('settings.update')
  @AuditAction('catalog-systems', 'update', 'system')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSystemDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.catalogSystemsService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @RequirePermissions('settings.update')
  @AuditAction('catalog-systems', 'delete', 'system')
  delete(@Param('id') id: string, @CurrentTenant() tenantId: string | null) {
    return this.catalogSystemsService.delete(id, tenantId);
  }
}
