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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { AuditAction } from '../../shared/decorators/audit.decorator';
import { AuditInterceptor } from '../../shared/interceptors/audit.interceptor';

@Controller('projects')
@UseInterceptors(AuditInterceptor)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  @RequirePermissions('projects.view')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.projectsService.findAll(tenantId, clientId);
  }

  @Get(':id')
  @RequirePermissions('projects.view')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.projectsService.findOne(id, tenantId);
  }

  @Post()
  @RequirePermissions('projects.create')
  @AuditAction('projects', 'create', 'project')
  create(
    @Body() dto: CreateProjectDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.create(dto, tenantId, user.id);
  }

  @Patch(':id')
  @RequirePermissions('projects.update')
  @AuditAction('projects', 'update', 'project')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.update(id, dto, tenantId, user.id);
  }

  @Delete(':id')
  @RequirePermissions('projects.delete')
  @AuditAction('projects', 'delete', 'project')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.projectsService.remove(id, tenantId);
  }
}
