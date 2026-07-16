import { Controller, Get, Post, Patch, Delete, Body, Param, UseInterceptors } from '@nestjs/common';
import { PlansService } from './plans.service';
import { Public } from '../../shared/decorators/public.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { AuditAction } from '../../shared/decorators/audit.decorator';
import { AuditInterceptor } from '../../shared/interceptors/audit.interceptor';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Controller('plans')
@UseInterceptors(AuditInterceptor)
export class PlansController {
  constructor(private plansService: PlansService) {}

  @Public()
  @Get()
  findAllActive() {
    return this.plansService.findAllActive();
  }

  @Get('all')
  @RequirePermissions('plans.view')
  findAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  @RequirePermissions('plans.view')
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Post()
  @RequirePermissions('plans.create')
  @AuditAction('plans', 'create', 'plan')
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('plans.update')
  @AuditAction('plans', 'update', 'plan')
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('plans.delete')
  @AuditAction('plans', 'delete', 'plan')
  remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }
}
