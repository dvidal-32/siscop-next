import { Controller, Get, Patch, Body, UseInterceptors } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { AuditAction } from '../../shared/decorators/audit.decorator';
import { AuditInterceptor } from '../../shared/interceptors/audit.interceptor';

@Controller('settings')
@UseInterceptors(AuditInterceptor)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  @RequirePermissions('settings.view')
  findAll(@CurrentTenant() tenantId: string) {
    return this.settingsService.findAll(tenantId);
  }

  @Patch()
  @RequirePermissions('settings.update')
  @AuditAction('settings', 'update_bulk', 'tenantSetting')
  upsertMany(@Body() dto: UpdateSettingsDto, @CurrentTenant() tenantId: string) {
    return this.settingsService.upsertMany(dto, tenantId);
  }
}
