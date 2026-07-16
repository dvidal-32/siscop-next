import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { AuditAction } from '../../shared/decorators/audit.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get()
  @RequirePermissions('billing.view')
  findAll(@CurrentTenant() tenantId: string) {
    return this.paymentsService.findAll(tenantId);
  }

  @Get('subscription')
  @RequirePermissions('billing.view')
  getSubscriptionInfo(@CurrentTenant() tenantId: string) {
    return this.paymentsService.getSubscriptionInfo(tenantId);
  }

  @Get('paypal-config')
  @RequirePermissions('billing.view')
  getPayPalConfig() {
    return this.paymentsService.getPayPalConfig();
  }

  @Post('paypal/capture')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('billing.pay')
  @AuditAction('payments', 'create', 'Payment')
  capturePayPal(
    @Body('orderId') orderId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body('targetPlanId') targetPlanId?: string,
  ) {
    return this.paymentsService.capturePayPalPayment(orderId, tenantId, user.id, targetPlanId);
  }
}
