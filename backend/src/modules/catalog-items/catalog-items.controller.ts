import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseInterceptors } from '@nestjs/common';
import { CatalogItemsService } from './catalog-items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { AuditAction } from '../../shared/decorators/audit.decorator';
import { AuditInterceptor } from '../../shared/interceptors/audit.interceptor';

@Controller('catalog-items')
@UseInterceptors(AuditInterceptor)
export class CatalogItemsController {
  constructor(private catalogItemsService: CatalogItemsService) {}

  @Get()
  @RequirePermissions('settings.view')
  findAll(@CurrentTenant() tenantId: string | null, @Query('type') type?: string) {
    return this.catalogItemsService.findAll(tenantId, type);
  }

  @Get(':id')
  @RequirePermissions('settings.view')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string | null) {
    return this.catalogItemsService.findOne(id, tenantId);
  }

  @Post()
  @RequirePermissions('settings.update')
  @AuditAction('catalog-items', 'create', 'catalog_item')
  create(@Body() dto: CreateItemDto, @CurrentTenant() tenantId: string | null) {
    return this.catalogItemsService.create(dto, tenantId);
  }

  @Patch('bulk-prices')
  @RequirePermissions('settings.update')
  @AuditAction('catalog-items', 'bulk_update_prices', 'catalog_item')
  bulkUpdatePrices(
    @Body() body: { items: { id: string; cost: number; price_1?: number; price_2?: number; price_3?: number; price_4?: number }[] },
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.catalogItemsService.bulkUpdatePrices(body.items, tenantId);
  }

  @Patch(':id')
  @RequirePermissions('settings.update')
  @AuditAction('catalog-items', 'update', 'catalog_item')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
    @CurrentTenant() tenantId: string | null,
  ) {
    return this.catalogItemsService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @RequirePermissions('settings.update')
  @AuditAction('catalog-items', 'delete', 'catalog_item')
  delete(@Param('id') id: string, @CurrentTenant() tenantId: string | null) {
    return this.catalogItemsService.delete(id, tenantId);
  }
}
