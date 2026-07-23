import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  create(@Body() createDto: any, @CurrentUser() user: any) {
    return this.purchaseOrdersService.create(createDto, user.tenantId, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.purchaseOrdersService.findAll(user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.purchaseOrdersService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any, @CurrentUser() user: any) {
    return this.purchaseOrdersService.update(id, updateDto, user.tenantId);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string, @CurrentUser() user: any) {
    return this.purchaseOrdersService.updateStatus(id, status, user.tenantId);
  }

  @Post(':id/receipts')
  createReceipt(@Param('id') id: string, @Body() receiptDto: any, @CurrentUser() user: any) {
    // Para recibir parcialmente o completo
    return this.purchaseOrdersService.createReceipt(id, receiptDto, user.tenantId, user.id);
  }
}
