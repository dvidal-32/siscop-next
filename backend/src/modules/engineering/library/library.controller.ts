import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { LibraryService } from './library.service';
import { ImportTemplateDto } from '../dto/import-template.dto';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { CurrentTenant } from '../../../shared/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../../shared/decorators/require-permissions.decorator';
import { AuditAction } from '../../../shared/decorators/audit.decorator';
import { AuditInterceptor } from '../../../shared/interceptors/audit.interceptor';

/**
 * Controlador de la Biblioteca Global.
 *
 * Endpoints bajo /engineering/library → Para tenants (listar e importar)
 * Endpoints bajo /superadmin/library → Para SuperAdmin (CRUD global)
 */
@Controller()
@UseInterceptors(AuditInterceptor)
export class LibraryController {
  constructor(private libraryService: LibraryService) {}

  // ──────────────────────────────────────────
  // ENDPOINTS PARA TENANTS
  // ──────────────────────────────────────────

  @Get('engineering/library/templates')
  @RequirePermissions('engineering.view')
  getGlobalTemplates() {
    return this.libraryService.getGlobalTemplates();
  }

  @Get('engineering/library/templates/:id')
  @RequirePermissions('engineering.view')
  getGlobalTemplateDetail(@Param('id') id: string) {
    return this.libraryService.getGlobalTemplateDetail(id);
  }

  @Post('engineering/library/import')
  @RequirePermissions('engineering.import')
  @AuditAction('engineering', 'import', 'engineering_template')
  importTemplate(
    @Body() dto: ImportTemplateDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.libraryService.importTemplate(dto.globalTemplateId, tenantId);
  }

  // ──────────────────────────────────────────
  // ENDPOINTS PARA SUPERADMIN
  // ──────────────────────────────────────────

  @Get('superadmin/library/templates')
  @RequirePermissions('library.view')
  getGlobalTemplatesAdmin() {
    return this.libraryService.getGlobalTemplates();
  }

  @Post('superadmin/library/templates')
  @RequirePermissions('library.create')
  @AuditAction('library', 'create', 'global_template')
  createGlobalTemplate(@Body() dto: CreateTemplateDto) {
    return this.libraryService.createGlobalTemplate(dto);
  }

  @Patch('superadmin/library/templates/:id')
  @RequirePermissions('library.update')
  @AuditAction('library', 'update', 'global_template')
  updateGlobalTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.libraryService.updateGlobalTemplate(id, dto);
  }

  @Delete('superadmin/library/templates/:id')
  @RequirePermissions('library.delete')
  @AuditAction('library', 'delete', 'global_template')
  deleteGlobalTemplate(@Param('id') id: string) {
    return this.libraryService.deleteGlobalTemplate(id);
  }
}
