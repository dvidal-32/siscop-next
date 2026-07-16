import { Controller, Get, Post, Patch, Delete, Body, Param, UseInterceptors } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { AuditAction } from '../../shared/decorators/audit.decorator';
import { AuditInterceptor } from '../../shared/interceptors/audit.interceptor';

@Controller('roles')
@UseInterceptors(AuditInterceptor)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles.view')
  findAll(@CurrentTenant() tenantId: string) {
    return this.rolesService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('roles.view')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.rolesService.findOne(id, tenantId);
  }

  @Post()
  @RequirePermissions('roles.create')
  @AuditAction('roles', 'create', 'role')
  create(@Body() dto: CreateRoleDto, @CurrentTenant() tenantId: string) {
    return this.prismaCreateWrapper(dto, tenantId);
  }

  private prismaCreateWrapper(dto: CreateRoleDto, tenantId: string) {
    return this.rolesService.create(dto, tenantId);
  }

  @Patch(':id')
  @RequirePermissions('roles.update')
  @AuditAction('roles', 'update', 'role')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolesService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @RequirePermissions('roles.delete')
  @AuditAction('roles', 'delete', 'role')
  delete(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.rolesService.delete(id, tenantId);
  }
}
