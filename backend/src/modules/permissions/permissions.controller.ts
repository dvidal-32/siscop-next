import { Controller, Get } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';

@Controller('permissions')
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('roles.view')
  findAll() {
    return this.permissionsService.findAll();
  }
}
