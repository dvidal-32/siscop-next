import { Controller, Get, Post, Patch, Body, Param, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { AuditAction } from '../../shared/decorators/audit.decorator';
import { AuditInterceptor } from '../../shared/interceptors/audit.interceptor';

@Controller('users')
@UseInterceptors(AuditInterceptor)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.view')
  findAll(@CurrentTenant() tenantId: string) {
    return this.usersService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('users.view')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.usersService.findOne(id, tenantId);
  }

  @Post()
  @RequirePermissions('users.create')
  @AuditAction('users', 'create', 'user')
  create(@Body() dto: CreateUserDto, @CurrentTenant() tenantId: string) {
    return this.prismaCreateWrapper(dto, tenantId);
  }

  private prismaCreateWrapper(dto: CreateUserDto, tenantId: string) {
    return this.usersService.create(dto, tenantId);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  @AuditAction('users', 'update', 'user')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.usersService.update(id, dto, tenantId);
  }

  @Patch(':id/status')
  @RequirePermissions('users.update')
  @AuditAction('users', 'update_status', 'user')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() currentUser: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.usersService.updateStatus(id, status, currentUser.id, tenantId);
  }
}
