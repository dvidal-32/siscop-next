import { Controller, Get, Patch, Delete, Param, Body, UseInterceptors, ForbiddenException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { AuditAction } from '../../shared/decorators/audit.decorator';
import { AuditInterceptor } from '../../shared/interceptors/audit.interceptor';

@Controller('tenants')
@UseInterceptors(AuditInterceptor)
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get()
  @RequirePermissions('tenants.view')
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    if (user.tenantId !== id && !user.permissions.includes('tenants.view')) {
      throw new ForbiddenException('No tienes permiso para ver esta empresa');
    }
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @AuditAction('tenants', 'update', 'tenant')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: any,
  ) {
    if (user.tenantId !== id && !user.permissions.includes('tenants.update')) {
      throw new ForbiddenException('No tienes permiso para editar esta empresa');
    }
    return this.tenantsService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('tenants.suspend')
  @AuditAction('tenants', 'update_status', 'tenant')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.tenantsService.updateStatus(id, status);
  }

  @Patch(':id/activate')
  @RequirePermissions('tenants.activate')
  @AuditAction('tenants', 'activate', 'tenant')
  activate(@Param('id') id: string) {
    return this.tenantsService.activateTenant(id);
  }

  @Delete('me')
  @AuditAction('tenants', 'delete', 'tenant')
  deleteMyAccount(@Body('password') password: string, @CurrentUser() user: any) {
    const isSuperAdmin = user.roles?.some((r: any) => r.name === 'Super Administrador');
    
    // Bloquear a los Super Administradores y cualquier suplantación (Impersonation)
    if (isSuperAdmin || user.isImpersonating || !user.realTenantId) {
      throw new ForbiddenException('Los Super Administradores no tienen permitido eliminar cuentas.');
    }

    // Asegurarse de que al menos sea Administrador de la empresa
    if (!user.roles?.some((r: any) => r.name === 'Administrador')) {
      throw new ForbiddenException('Solo los Administradores de la empresa pueden eliminar la cuenta.');
    }

    return this.tenantsService.deleteMyAccount(user.id, user.realTenantId, password);
  }
}
