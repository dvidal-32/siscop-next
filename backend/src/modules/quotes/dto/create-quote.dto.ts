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
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuotedProductDto {
  @IsOptional()
  @IsString()
  item_type?: string;

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
