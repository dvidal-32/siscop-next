import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { CreateQuoteVersionDto } from './dto/create-quote-version.dto';
import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { AuditAction } from '../../shared/decorators/audit.decorator';
import { AuditInterceptor } from '../../shared/interceptors/audit.interceptor';

@Controller('quotes')
@UseInterceptors(AuditInterceptor)
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  @Get()
  @RequirePermissions('quotes.view')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.quotesService.findAll(tenantId, projectId);
  }

  @Get(':id')
  @RequirePermissions('quotes.view')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.quotesService.findOne(id, tenantId);
  }

  @Post()
  @RequirePermissions('quotes.create')
  @AuditAction('quotes', 'create', 'quote')
  create(
    @Body() dto: CreateQuoteDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.quotesService.create(dto, tenantId, user.id);
  }

  @Post(':id/versions')
  @RequirePermissions('quotes.update')
  @AuditAction('quotes', 'create', 'quote_version')
  createVersion(
    @Param('id') id: string,
    @Body() dto: CreateQuoteVersionDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.quotesService.createVersion(id, dto, tenantId);
  }

  @Post(':id/approve')
  @RequirePermissions('quotes.approve')
  @AuditAction('quotes', 'approve', 'quote')
  approve(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.quotesService.approve(id, tenantId);
  }

  @Patch(':id/status')
  @RequirePermissions('quotes.update')
  @AuditAction('quotes', 'update', 'quote_status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.quotesService.updateStatus(id, status, tenantId);
  }

  @Delete(':id')
  @RequirePermissions('quotes.delete')
  @AuditAction('quotes', 'delete', 'quote')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.quotesService.remove(id, tenantId);
  }
}
