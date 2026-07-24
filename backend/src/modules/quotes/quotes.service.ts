import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { EngineeringEngineService } from '../engineering/engine/engineering-engine.service';
import { CreateQuoteDto, CreateQuotedProductDto, CompositeComponentDto } from './dto/create-quote.dto';
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
              where: { parent_id: null }, // Solo ítems raíz (sin padre)
              orderBy: { sort_order: 'asc' },
              include: { 
                template: { select: { id: true, name: true, code: true } },
                catalog_item: { select: { id: true, name: true, code: true, unit: true } },
                // Incluir sub-ítems (hijos) para productos compuestos
                components: {
                  orderBy: { sort_order: 'asc' },
                  include: {
                    template: { select: { id: true, name: true, code: true } },
                    catalog_item: { select: { id: true, name: true, code: true, unit: true } },
                  },
                },
              },
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
      // Separar ítems raíz (sin padre) de los compuestos que necesitan crear hijos
      const rootProducts = calculatedProducts.filter((p: any) => !p._sub_components);
      const compositeProducts = calculatedProducts.filter((p: any) => p._sub_components);

      // Construir los datos de creación, excluyendo el marcador interno
      const rootCreateData = rootProducts.map(({ _sub_components, ...p }: any) => p);

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
                create: rootCreateData,
              },
            },
          },
        },
        include: {
          versions: { include: { products: true } },
        },
      });

      // Crear los ítems compuestos con sus hijos
      if (compositeProducts.length > 0) {
        const versionId = quote.versions[0].id;
        for (const { _sub_components, ...compositeData } of compositeProducts) {
          const parent = await tx.quotedProduct.create({
            data: { ...compositeData, quote_version_id: versionId },
          });
          // Crear cada sub-componente vinculado al padre
          if (_sub_components && _sub_components.length > 0) {
            await tx.quotedProduct.createMany({
              data: _sub_components.map((child: any) => ({
                ...child,
                quote_version_id: versionId,
                parent_id: parent.id,
              })),
            });
          }
        }
      }

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

      const rootProducts = calculatedProducts.filter((p: any) => !p._sub_components);
      const compositeProducts = calculatedProducts.filter((p: any) => p._sub_components);
      
      const rootCreateData = rootProducts.map(({ _sub_components, ...p }: any) => p);

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
            create: rootCreateData,
          },
        },
        include: { products: true },
      });

      // Crear los ítems compuestos con sus hijos
      if (compositeProducts.length > 0) {
        for (const { _sub_components, ...compositeData } of compositeProducts) {
          const parent = await tx.quotedProduct.create({
            data: { ...compositeData, quote_version_id: newVersion.id },
          });
          
          if (_sub_components && _sub_components.length > 0) {
            await tx.quotedProduct.createMany({
              data: _sub_components.map((child: any) => ({
                ...child,
                quote_version_id: newVersion.id,
                parent_id: parent.id,
              })),
            });
          }
        }
      }

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
   * Calcula el precio de un sub-componente individual de una fachada.
   */
  private async calculateSingleComponent(
    component: CompositeComponentDto,
    tenantId: string,
    priceListLevel: number,
    margin: number,
    sortOrder: number = 0,
  ) {
    const itemType = component.item_type || (component.catalog_item_id ? 'catalog_item' : 'template');

    // Manejar huecos, divisores o celdas vacías sin producto asignado
    if (!component.template_id && !component.catalog_item_id) {
      return {
        item_type: component.item_type || 'none',
        name: component.name || 'Elemento sin asignar',
        width: component.width,
        height: component.height,
        area: ((component.width || 0) / 1000) * ((component.height || 0) / 1000),
        quantity: component.quantity || 1,
        unit_cost: 0,
        unit_price: 0,
        total_price: 0,
        pricing_method: 'none',
        applied_price_list: null,
        layout_data: component.layout_data || null,
        sort_order: sortOrder,
        notes: component.notes,
        engineering_snapshot: undefined,
      };
    }

    if (itemType === 'catalog_item' && component.catalog_item_id) {
      const item = await this.prisma.catalogItem.findFirst({
        where: { id: component.catalog_item_id },
      });
      const unitCost = Number(item?.cost || 0);
      const unit = (item?.unit || '').toLowerCase();
      let computedFactor = 1;
      if (['m2', 'p2'].includes(unit)) {
        computedFactor = unit === 'p2'
          ? ((component.width || 0) / 304.8) * ((component.height || 0) / 304.8)
          : ((component.width || 0) / 1000) * ((component.height || 0) / 1000);
      } else if (['m', 'pl'].includes(unit)) {
        computedFactor = unit === 'pl' ? ((component.width || 0) / 304.8) : ((component.width || 0) / 1000);
      }
      const totalPrice = unitCost * computedFactor * (component.quantity || 1);
      return {
        item_type: itemType,
        catalog_item_id: component.catalog_item_id,
        name: component.name || item?.name || 'Artículo',
        width: component.width,
        height: component.height,
        area: computedFactor !== 1 ? computedFactor : 0,
        quantity: component.quantity || 1,
        unit_cost: unitCost,
        unit_price: unitCost,
        total_price: totalPrice,
        pricing_method: 'item',
        applied_price_list: null,
        layout_data: component.layout_data || null,
        sort_order: sortOrder,
        notes: component.notes,
        engineering_snapshot: undefined,
      };
    }

    // Template de ingeniería
    const inputVariables: Record<string, number> = {
      ...(component.variables || {}),
      ANCHO: component.width || 0,
      ALTO: component.height || 0,
      W: component.width || 0,
      H: component.height || 0,
    };
    const engineResult = await this.engineService.simulate(component.template_id!, inputVariables, tenantId);
    const unit_cost = engineResult.totalMaterialCost;
    const unit_price = unit_cost * margin;
    const total_price = unit_price * (component.quantity || 1);
    return {
      item_type: itemType,
      template_id: component.template_id,
      name: component.name,
      width: component.width,
      height: component.height,
      area: ((component.width || 0) / 1000) * ((component.height || 0) / 1000),
      quantity: component.quantity || 1,
      unit_cost,
      unit_price,
      total_price,
      pricing_method: 'cost',
      applied_price_list: null,
      layout_data: component.layout_data || null,
      sort_order: sortOrder,
      notes: component.notes,
      engineering_snapshot: { ...engineResult, inputVariables } as any,
    };
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
    const uniqueTemplateIds = [...new Set(products.map((p) => p.template_id))].filter((id): id is string => Boolean(id));
    const minimumAreas = await this.prisma.templateMinimumArea.findMany({
      where: { template_id: { in: uniqueTemplateIds } },
    });
    
    // Mapa rápido para búsquedas en memoria: key = "templateId_bodies"
    const minAreaMap = new Map<string, number>();
    for (const ma of minimumAreas) {
      minAreaMap.set(`${ma.template_id}_${ma.bodies}`, Number(ma.min_area));
    }

    const catalogItemIds = [...new Set(products.filter(p => p.item_type === 'catalog_item' && p.catalog_item_id).map((p) => p.catalog_item_id))] as string[];
    const catalogItems = catalogItemIds.length > 0 ? await this.prisma.catalogItem.findMany({
      where: { id: { in: catalogItemIds } },
    }) : [];
    const catalogItemMap = new Map(catalogItems.map(item => [item.id, item]));

    const calculated = await Promise.all(
      products.map(async (p) => {
        // ── Manejo de ítems compuestos (Fachadas) ──
        if (p.is_composite === true && p.sub_components && p.sub_components.length > 0) {
          // Calcular cada sub-componente individualmente
          const calculatedChildren = await Promise.all(
            p.sub_components.map((comp, idx) =>
              this.calculateSingleComponent(comp, tenantId, priceListLevel, appliedMargin, idx)
            )
          );
          // El total del padre es la suma de todos sus hijos
          const compositeTotal = calculatedChildren.reduce((sum, c) => sum + c.total_price, 0);
          return {
            item_type: 'composite',
            name: p.name,
            width: p.width,
            height: p.height,
            area: ((p.width || 0) / 1000) * ((p.height || 0) / 1000),
            quantity: p.quantity,
            unit_cost: compositeTotal / p.quantity,
            unit_price: compositeTotal / p.quantity,
            total_price: compositeTotal,
            pricing_method: 'cost',
            applied_price_list: null,
            is_composite: true,
            notes: p.notes,
            engineering_snapshot: undefined,
            // Marcador interno (no se guarda en DB directamente en el padre)
            _sub_components: calculatedChildren,
          };
        }

        if (p.item_type === 'catalog_item' && p.catalog_item_id) {
          const item = catalogItemMap.get(p.catalog_item_id);
          const unitCost = Number(item?.cost || 0);
          const unitPrice = unitCost; // Precio directo de inventario
          
          let computedFactor = 1;
          const unit = (item?.unit || '').toLowerCase();
          
          if (['m2', 'p2'].includes(unit)) {
            if (unit === 'p2') computedFactor = ((p.width || 0) / 304.8) * ((p.height || 0) / 304.8);
            else computedFactor = ((p.width || 0) / 1000) * ((p.height || 0) / 1000);
          } else if (['m', 'pl'].includes(unit)) {
            if (unit === 'pl') computedFactor = ((p.width || 0) / 304.8);
            else computedFactor = ((p.width || 0) / 1000);
          }

          const totalPrice = unitPrice * computedFactor * p.quantity;
          
          return {
            item_type: p.item_type,
            catalog_item_id: p.catalog_item_id,
            name: p.name || item?.name || 'Artículo',
            width: p.width,
            height: p.height,
            area: computedFactor !== 1 ? computedFactor : 0,
            quantity: p.quantity,
            unit_cost: unitCost,
            unit_price: unitPrice,
            total_price: totalPrice,
            pricing_method: 'item',
            applied_price_list: null,
            engineering_snapshot: undefined,
            notes: p.notes,
          };
        }

        const inputVariables: Record<string, number> = {
          ...(p.variables || {}),
          ANCHO: p.width || 0,
          ALTO: p.height || 0,
          W: p.width || 0,
          H: p.height || 0,
        };

        // Llamar al motor de ingeniería para obtener el desglose de costos
        const engineResult = await this.engineService.simulate(
          p.template_id!,
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
          item_type: 'template',
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
