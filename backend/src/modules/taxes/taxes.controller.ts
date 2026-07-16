import { Controller, Get, Post, Patch, Delete, Body, Param, UseInterceptors } from '@nestjs/common';
import { TaxesService } from './taxes.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { AuditAction } from '../../shared/decorators/audit.decorator';
import { AuditInterceptor } from '../../shared/interceptors/audit.interceptor';

@Controller('taxes')
@UseInterceptors(AuditInterceptor)
export class TaxesController {
  constructor(private taxesService: TaxesService) {}

  @Get()
  @RequirePermissions('settings.view')
  findAll(@CurrentTenant() tenantId: string) {
    return this.taxesService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('settings.view')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.taxesService.findOne(id, tenantId);
  }

  @Post()
  @RequirePermissions('settings.update')
  @AuditAction('taxes', 'create', 'tax')
  create(@Body() dto: CreateTaxDto, @CurrentTenant() tenantId: string) {
    return this.taxesService.create(dto, tenantId);
  }

  @Patch(':id')
  @RequirePermissions('settings.update')
  @AuditAction('taxes', 'update', 'tax')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaxDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.taxesService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @RequirePermissions('settings.update')
  @AuditAction('taxes', 'delete', 'tax')
  delete(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.taxesService.delete(id, tenantId);
  }
}
