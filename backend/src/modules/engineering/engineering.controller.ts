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
import { EngineeringService } from './engineering.service';
import { EngineeringEngineService } from './engine/engineering-engine.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { CreateVariableDto } from './dto/create-variable.dto';
import { UpdateVariableDto } from './dto/update-variable.dto';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';
import { CreateFormulaDto } from './dto/create-formula.dto';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { SimulateDto } from './dto/simulate.dto';
import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { AuditAction } from '../../shared/decorators/audit.decorator';
import { AuditInterceptor } from '../../shared/interceptors/audit.interceptor';

@Controller('engineering')
@UseInterceptors(AuditInterceptor)
export class EngineeringController {
  constructor(
    private engineeringService: EngineeringService,
    private engineService: EngineeringEngineService,
  ) {}

  // ──────────────────────────────────────────
  // PLANTILLAS
  // ──────────────────────────────────────────

  @Get('templates')
  @RequirePermissions('engineering.view')
  findAllTemplates(@CurrentTenant() tenantId: string) {
    return this.engineeringService.findAllTemplates(tenantId);
  }

  @Get('templates/:id')
  @RequirePermissions('engineering.view')
  findOneTemplate(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.engineeringService.findOneTemplate(id, tenantId);
  }

  @Post('templates')
  @RequirePermissions('engineering.create')
  @AuditAction('engineering', 'create', 'engineering_template')
  createTemplate(
    @Body() dto: CreateTemplateDto,
    @CurrentTenant() tenantId: string,
  ) {
    const fs = require('fs');
    fs.appendFileSync('test-log.txt', `\n--- CREATE TEMPLATE ---\nDTO received: ${JSON.stringify(dto)}\n`);
    return this.engineeringService.createTemplate(dto, tenantId);
  }

  @Patch('templates/:id')
  @RequirePermissions('engineering.update')
  @AuditAction('engineering', 'update', 'engineering_template')
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentTenant() tenantId: string,
  ) {
    const fs = require('fs');
    fs.appendFileSync('test-log.txt', `\n--- UPDATE TEMPLATE ---\nDTO received: ${JSON.stringify(dto)}\n`);
    return this.engineeringService.updateTemplate(id, dto, tenantId);
  }

  @Delete('templates/:id')
  @RequirePermissions('engineering.delete')
  @AuditAction('engineering', 'delete', 'engineering_template')
  deleteTemplate(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.engineeringService.deleteTemplate(id, tenantId);
  }

  // ──────────────────────────────────────────
  // VARIABLES
  // ──────────────────────────────────────────

  @Post('variables')
  @RequirePermissions('engineering.create')
  @AuditAction('engineering', 'create', 'engineering_variable')
  createVariable(
    @Body() dto: CreateVariableDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.engineeringService.createVariable(dto, tenantId);
  }

  @Patch('variables/:id')
  @RequirePermissions('engineering.create')
  @AuditAction('engineering', 'update', 'engineering_variable')
  updateVariable(
    @Param('id') id: string,
    @Body() dto: UpdateVariableDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.engineeringService.updateVariable(id, dto, tenantId);
  }

  @Delete('variables/:id')
  @RequirePermissions('engineering.delete')
  @AuditAction('engineering', 'delete', 'engineering_variable')
  deleteVariable(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.engineeringService.deleteVariable(id, tenantId);
  }

  // ──────────────────────────────────────────
  // COMPONENTES
  // ──────────────────────────────────────────

  @Post('components')
  @RequirePermissions('engineering.create')
  @AuditAction('engineering', 'create', 'engineering_component')
  createComponent(
    @Body() dto: CreateComponentDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.engineeringService.createComponent(dto, tenantId);
  }

  @Patch('components/:id')
  @RequirePermissions('engineering.create')
  @AuditAction('engineering', 'update', 'engineering_component')
  updateComponent(
    @Param('id') id: string,
    @Body() dto: UpdateComponentDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.engineeringService.updateComponent(id, dto, tenantId);
  }

  @Delete('components/:id')
  @RequirePermissions('engineering.delete')
  @AuditAction('engineering', 'delete', 'engineering_component')
  deleteComponent(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.engineeringService.deleteComponent(id, tenantId);
  }

  // ──────────────────────────────────────────
  // FÓRMULAS
  // ──────────────────────────────────────────

  @Post('formulas')
  @RequirePermissions('engineering.create')
  @AuditAction('engineering', 'create', 'engineering_formula')
  createOrUpdateFormula(
    @Body() dto: CreateFormulaDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.engineeringService.createOrUpdateFormula(dto, tenantId);
  }

  // ──────────────────────────────────────────
  // REGLAS
  // ──────────────────────────────────────────

  @Post('rules')
  @RequirePermissions('engineering.create')
  @AuditAction('engineering', 'create', 'engineering_rule')
  createRule(
    @Body() dto: CreateRuleDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.engineeringService.createRule(dto, tenantId);
  }

  @Patch('rules/:id')
  @RequirePermissions('engineering.create')
  @AuditAction('engineering', 'update', 'engineering_rule')
  updateRule(
    @Param('id') id: string,
    @Body() dto: UpdateRuleDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.engineeringService.updateRule(id, dto, tenantId);
  }

  @Delete('rules/:id')
  @RequirePermissions('engineering.delete')
  @AuditAction('engineering', 'delete', 'engineering_rule')
  deleteRule(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.engineeringService.deleteRule(id, tenantId);
  }

  // ──────────────────────────────────────────
  // SIMULADOR
  // ──────────────────────────────────────────

  @Post('simulate')
  @RequirePermissions('engineering.simulate')
  simulate(
    @Body() dto: SimulateDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.engineService.simulate(dto.templateId, dto.variables, tenantId);
  }
}
