import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { EngineeringEngineService } from '../engineering/engine/engineering-engine.service';
import { CreateQuoteDto, CreateQuotedProductDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { CreateQuoteVersionDto } from './dto/create-quote-version.dto';

@Injectable()
export class QuotesService {
  constructor(
    private prisma: PrismaService,
    private engineService: EngineeringEngineService,
  ) { }

  // ──────────────────────────────────────────
  // COTIZACIONES
  // ──────────────────────────────────────────

  async findAll(tenantId: string, projectId?: string) {
    return this.prisma.quote.findMany({
      where: {
        tenant_id: tenantId,
        ...(projectId ? { project_id: projectId } : {}),
      },
      include: {
        project: {
          select: { id: true, name: true, client: { select: { id: true, name: true, phone: true, email: true, address: true, tax_id: true } } },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        project: {
          include: { client: { select: { id: true, name: true, email: true, phone: true, address: true, tax_id: true } } },
        },
        versions: {
          orderBy: { version_number: 'desc' },
          include: {
            products: {
              include: { template: { select: { id: true, name: true, code: true } } },
            },
          },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException('Cotización no encontrada');
    }

    return quote;
  }

  async create(dto: CreateQuoteDto, tenantId: string, userId: string) {
    // 1. Verificar que el proyecto pertenece al tenant
    const project = await this.prisma.project.findFirst({
      where: { id: dto.project_id, tenant_id: tenantId },
      include: { client: true },
    });
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const priceListLevel = project.client?.price_list_level || 1;

    // 2. Generar código de cotización autoincrementable
    const code = await this.generateQuoteCode(tenantId);

    // 3. Calcular los productos con el motor de ingeniería
    const calculatedProducts = await this.calculateProducts(
      dto.products || [],
      tenantId,
      priceListLevel,
      dto.margin,
    );

    // 4. Calcular totales de la versión
    const subtotalBruto = calculatedProducts.reduce(
      (sum, p) => sum + p.total_price,
      0,
    );
    const discount = dto.discount ?? 0;
    const subtotalNeto = subtotalBruto - discount;
    
    let tax = 0;
    if (dto.include_tax) {
      const taxSetting = await this.prisma.tenantSetting.findFirst({
        where: { tenant_id: tenantId, key: 'IMPUESTOS_PORCENTAJE' },
      });
      const taxRate = taxSetting ? parseFloat(taxSetting.value) || 18 : 18;
      tax = subtotalNeto * (taxRate / 100);
    }
    
    const total = subtotalNeto + tax;

    // 5. Crear todo en una transacción
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.create({
        data: {
          tenant_id: tenantId,
          project_id: dto.project_id,
          code,
          status: 'draft',
          total,
          created_by: userId,
          updated_by: userId,
          versions: {
            create: {
              version_number: 1,
              status: 'draft',
              subtotal: subtotalBruto,
              discount,
              tax,
              total,
              margin: dto.margin,
              payment_conditions: dto.payment_conditions,
              is_current: true,
              products: {
                create: calculatedProducts,
              },
            },
          },
        },
        include: {
          versions: { include: { products: true } },
        },
      });

      return quote;
    });
  }

  async createVersion(
    quoteId: string,
    dto: CreateQuoteVersionDto,
    tenantId: string,
  ) {
    const quote = await this.findOne(quoteId, tenantId);

    if (quote.status === 'approved') {
      throw new ConflictException(
        'No se pueden crear nuevas versiones en una cotización aprobada',
      );
    }

    const newVersionNumber = quote.current_version + 1;

    // 2. Obtener el proyecto y cliente para saber el priceListLevel
    const project = await this.prisma.project.findFirst({
      where: { id: quote.project_id, tenant_id: tenantId },
      include: { client: true },
    });
    const priceListLevel = project?.client?.price_list_level || 1;

    // 3. Calcular los productos de la nueva versión con el motor
    const calculatedProducts = await this.calculateProducts(
      dto.products || [],
      tenantId,
      priceListLevel,
      dto.margin,
    );

    const subtotalBruto = calculatedProducts.reduce(
      (sum, p) => sum + p.total_price,
      0,
    );
    const discount = dto.discount ?? 0;
    const subtotalNeto = subtotalBruto - discount;
    
    let tax = 0;
    if (dto.include_tax) {
      const taxSetting = await this.prisma.tenantSetting.findFirst({
        where: { tenant_id: tenantId, key: 'IMPUESTOS_PORCENTAJE' },
      });
      const taxRate = taxSetting ? parseFloat(taxSetting.value) || 18 : 18;
      tax = subtotalNeto * (taxRate / 100);
    }
    
    const total = subtotalNeto + tax;

    return this.prisma.$transaction(async (tx) => {
      // Marcar versión anterior como no actual
      await tx.quoteVersion.updateMany({
        where: { quote_id: quoteId },
        data: { is_current: false },
      });

      // Crear nueva versión
      const newVersion = await tx.quoteVersion.create({
        data: {
          quote_id: quoteId,
          version_number: newVersionNumber,
          status: 'draft',
          subtotal: subtotalBruto,
          discount,
          tax,
          total,
          margin: dto.margin,
          payment_conditions: dto.payment_conditions,
          is_current: true,
          products: {
            create: calculatedProducts,
          },
        },
        include: { products: true },
      });

      // Actualizar la cotización padre
      await tx.quote.update({
        where: { id: quoteId },
        data: { current_version: newVersionNumber, total },
      });

      return newVersion;
    });
  }

  async approve(id: string, tenantId: string) {
    const quote = await this.findOne(id, tenantId);

    if (quote.status === 'approved') {
      throw new ConflictException('La cotización ya está aprobada');
    }
    if (quote.status === 'cancelled') {
      throw new ConflictException('No se puede aprobar una cotización cancelada');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.quoteVersion.update({
        where: {
          quote_id_version_number: {
            quote_id: id,
            version_number: quote.current_version,
          },
        },
        data: { status: 'approved' },
      });

      return tx.quote.update({
        where: { id },
        data: { status: 'approved' },
      });
    });
  }

  async updateStatus(id: string, status: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.quote.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: string, tenantId: string) {
    const quote = await this.findOne(id, tenantId);

    if (quote.status === 'approved') {
      throw new ConflictException(
        'No se puede eliminar una cotización aprobada',
      );
    }

    await this.prisma.quote.delete({ where: { id } });
    return { message: 'Cotización eliminada correctamente' };
  }

  // ──────────────────────────────────────────
  // HELPERS PRIVADOS
  // ──────────────────────────────────────────

  /**
   * Genera un código único para la cotización del tenant.
   * Formato: COT-YYYY-NNNN
   */
  private async generateQuoteCode(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.quote.count({
      where: { tenant_id: tenantId },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `COT-${year}-${seq}`;
  }

  /**
   * Invoca el motor de ingeniería para cada producto y construye
   * el snapshot + precios. El motor recibe ANCHO y ALTO en mm.
   */
  private async calculateProducts(
    products: CreateQuotedProductDto[],
    tenantId: string,
    priceListLevel: number = 1,
    margin?: number,
  ) {
    const appliedMargin = margin ?? 1.0; // Sin margen por defecto

    // Pre-cargar áreas mínimas para evitar N+1 query problem
    const uniqueTemplateIds = [...new Set(products.map((p) => p.template_id))];
    const minimumAreas = await this.prisma.templateMinimumArea.findMany({
      where: { template_id: { in: uniqueTemplateIds } },
    });
    
    // Mapa rápido para búsquedas en memoria: key = "templateId_bodies"
    const minAreaMap = new Map<string, number>();
    for (const ma of minimumAreas) {
      minAreaMap.set(`${ma.template_id}_${ma.bodies}`, Number(ma.min_area));
    }

    const calculated = await Promise.all(
      products.map(async (p) => {
        const inputVariables: Record<string, number> = {
          ...(p.variables || {}),
          ANCHO: p.width,
          ALTO: p.height,
          W: p.width,
          H: p.height,
        };

        // Llamar al motor de ingeniería para obtener el desglose de costos
        const engineResult = await this.engineService.simulate(
          p.template_id,
          inputVariables,
          tenantId,
        );

        const unit_cost = engineResult.totalMaterialCost;
        let unit_price = 0;
        let pricing_method = engineResult.pricingMethod || 'cost';
        let applied_price_list: number | null = null;

        // Determinar número de cuerpos para venta mínima
        let bodies = 1;
        for (const key of Object.keys(inputVariables)) {
          if (key.toUpperCase() === 'CUERPOS' || key.toUpperCase() === 'NAVES') {
            bodies = Number(inputVariables[key]) || 1;
            break;
          }
        }

        // Consultar área mínima configurada para este número de cuerpos desde el mapa en memoria
        const minAreaKey = `${p.template_id}_${bodies}`;
        let minArea = minAreaMap.has(minAreaKey) ? minAreaMap.get(minAreaKey)! : null;

        if (pricing_method !== 'area') {
          minArea = null;
        }

        let areaToBill = engineResult.totalAreaUnit || 0;
        let minAreaApplied = false;

        if (pricing_method === 'area') {
           // Usamos la lista de precios
           applied_price_list = priceListLevel;
           let areaPrice = 0;
           switch(Number(priceListLevel)) {
             case 1: areaPrice = Number(engineResult.areaPriceL1) || 0; break;
             case 2: areaPrice = Number(engineResult.areaPriceL2) || Number(engineResult.areaPriceL1) || 0; break;
             case 3: areaPrice = Number(engineResult.areaPriceL3) || Number(engineResult.areaPriceL1) || 0; break;
             case 4: areaPrice = Number(engineResult.areaPriceL4) || Number(engineResult.areaPriceL1) || 0; break;
             default: areaPrice = Number(engineResult.areaPriceL1) || 0;
           }

           // Aplicar venta mínima si el área física real es menor
           if (minArea !== null && minArea > areaToBill) {
             areaToBill = minArea;
             minAreaApplied = true;
           }

           unit_price = areaToBill * areaPrice;
        } else {
           unit_price = unit_cost * appliedMargin;
        }

        const total_price = unit_price * p.quantity;

        // Enriquecer el snapshot con información de la venta mínima
        const enrichedSnapshot = {
          ...engineResult,
          originalArea: engineResult.totalAreaUnit || 0,
          billedArea: areaToBill,
          minAreaApplied,
          minAreaConfigured: minArea,
          bodies,
        };

        return {
          template_id: p.template_id,
          name: p.name,
          width: p.width,
          height: p.height,
          area: areaToBill,
          quantity: p.quantity,
          unit_cost,
          unit_price,
          total_price,
          pricing_method,
          applied_price_list,
          engineering_snapshot: enrichedSnapshot as any, // Snapshot completo enriquecido para congelar
          notes: p.notes,
        };
      }),
    );

    return calculated;
  }
}
