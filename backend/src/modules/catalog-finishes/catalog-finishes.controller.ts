import { Controller, Get, Post, Patch, Delete, Body, Param, UseInterceptors } from '@nestjs/common';
import { CatalogFinishesService } from './catalog-finishes.service';
import { CreateFinishDto } from './dto/create-finish.dto';
import { UpdateFinishDto } from './dto/update-finish.dto';
import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { AuditAction } from '../../shared/decorators/audit.decorator';
import { AuditInterceptor } from '../../shared/interceptors/audit.interceptor';

@Controller('catalog-finishes')
@UseInterceptors(AuditInterceptor)
export class CatalogFinishesController {
  constructor(private catalogFinishesService: CatalogFinishesService) {}

  @Get()
  @RequirePermissions('settings.view')
  findAll(@CurrentTenant() tenantId: string | null) {
    return this.catalogFinishesService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('settings.view')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string | null) {
    return this.catalogFinishesService.findOne(id, tenantId);
  }

  @Post()
  @RequirePermissions('settings.update')
  @AuditAction('catalog-finishes', 'create', 'finish')
  create(@Body() dto: CreateFinishDto, @CurrentTenant() tenantId: string | null) {
    return this.catalogFinishesService.create(dto, tenantId);
  }

  @Patch(':id')
  @RequirePermissions('settings.update')
  @AuditAction('catalog-finishes', 'update', 'finish')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFinishDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.catalogFinishesService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @RequirePermissions('settings.update')
  @AuditAction('catalog-finishes', 'delete', 'finish')
  delete(@Param('id') id: string, @CurrentTenant() tenantId: string | null) {
    return this.catalogFinishesService.delete(id, tenantId);
  }
}
