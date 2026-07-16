import { Controller, Get, Patch, Body, UseInterceptors } from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service';
import { UpdatePlatformSettingsDto } from './dto/update-platform-setting.dto';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { AuditAction } from '../../shared/decorators/audit.decorator';
import { AuditInterceptor } from '../../shared/interceptors/audit.interceptor';

@Controller('platform-settings')
@UseInterceptors(AuditInterceptor)
export class PlatformSettingsController {
  constructor(private service: PlatformSettingsService) {}

  @Get()
  @RequirePermissions('platform-settings.view')
  findAll() {
    return this.service.findAll();
  }

  @Patch()
  @RequirePermissions('platform-settings.update')
  @AuditAction('platform-settings', 'update', 'platform-setting')
  update(@Body() dto: UpdatePlatformSettingsDto) {
    return this.service.update(dto);
  }
}
