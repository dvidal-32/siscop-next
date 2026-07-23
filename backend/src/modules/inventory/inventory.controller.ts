import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('items')
  findAllItems(@CurrentUser() user: any) {
    return this.inventoryService.findAllItems(user.tenantId);
  }

  @Get('items/low-stock')
  findLowStockItems(@CurrentUser() user: any) {
    return this.inventoryService.findLowStockItems(user.tenantId);
  }

  @Get('items/warehouse/:warehouseId')
  findItemsByWarehouse(@Param('warehouseId') warehouseId: string, @CurrentUser() user: any) {
    return this.inventoryService.findItemsByWarehouse(warehouseId, user.tenantId);
  }

  @Post('movements/manual')
  createManualMovement(@Body() createMovementDto: any, @CurrentUser() user: any) {
    // Para ENTRADA, SALIDA, AJUSTE manual
    return this.inventoryService.createManualMovement(createMovementDto, user.tenantId, user.id);
  }

  @Get('movements')
  findAllMovements(@CurrentUser() user: any) {
    return this.inventoryService.findAllMovements(user.tenantId);
  }

  @Patch('items/:id/min-max')
  updateMinMax(@Param('id') id: string, @Body() updateDto: any, @CurrentUser() user: any) {
    return this.inventoryService.updateMinMax(id, updateDto, user.tenantId);
  }
}
