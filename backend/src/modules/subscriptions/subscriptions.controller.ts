import { Controller, Get } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get()
  findCurrent(@CurrentTenant() tenantId: string) {
    return this.subscriptionsService.findCurrent(tenantId);
  }
}
