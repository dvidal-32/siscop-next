import { Controller, Get } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';

@Controller('audit-logs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit.view')
  findAll(@CurrentTenant() tenantId: string) {
    return this.auditService.findAll(tenantId);
  }
}
