import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  ValidateNested,
  IsArray,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CompositeComponentDto {
  /** Nombre del sub-elemento (ej. "Puerta", "Vidrio Fijo") */
  @IsString()
  name: string;

  /** Tipo del sub-elemento en el grid visual */
  @IsString()
  element_type: string; // "product" | "divider" | "hole"

  /** Si es template de ingeniería o artículo de catálogo */
  @IsOptional()
  @IsString()
  item_type?: string; // "template" | "catalog_item"

  @IsOptional()
  @IsString()
  template_id?: string;

  @IsOptional()
  @IsString()
  catalog_item_id?: string;

  /** Medidas exactas en mm */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  width?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  height?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  variables?: Record<string, any>;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Posición y tamaño en el grid visual del diseñador */
  @IsOptional()
  @IsObject()
  layout_data?: {
    x: number;
    y: number;
    w: number;
    h: number;
    sort_order?: number;
  };

  /** Orden de aparición dentro del padre */
  @IsOptional()
  @IsInt()
  sort_order?: number;
}

export class CreateQuotedProductDto {
  @IsOptional()
  @IsString()
  item_type?: string; // "template" | "catalog_item" | "composite"

  @IsOptional()
  @IsString()
  template_id?: string;

  @IsOptional()
  @IsString()
  catalog_item_id?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  width?: number; // mm

  @IsOptional()
  @IsNumber()
  @IsPositive()
  height?: number; // mm

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  variables?: Record<string, any>;

  // ── Campos para ítems compuestos (Fachadas) ──
  /** true si este producto es una composición (ej. "Frente Comercial") */
  @IsOptional()
  @IsBoolean()
  is_composite?: boolean;

  /** Sub-elementos que componen esta fachada */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompositeComponentDto)
  sub_components?: CompositeComponentDto[];
}

export class CreateQuoteDto {
  @IsString()
  project_id: string;

  @IsOptional()
  @IsNumber()
  margin?: number; // e.g. 1.40 para 40%

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number; // Monto fijo de descuento

  @IsOptional()
  @IsString()
  payment_conditions?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotedProductDto)
  products?: CreateQuotedProductDto[];

  @IsOptional()
  @IsBoolean()
  include_tax?: boolean;
}
