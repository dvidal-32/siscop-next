import { Controller, Get } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@Controller('permissions')
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('roles.view')
  findAll(@CurrentUser() user: any) {
    const isSuperAdmin = user.realTenantId === null;
    return this.permissionsService.findAll(isSuperAdmin);
  }
}
