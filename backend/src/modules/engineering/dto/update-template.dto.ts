import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TemplateMinimumAreaDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  bodies: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minArea: number;
}

export class UpdateTemplateDto {
  @IsString({ message: 'El nombre de la plantilla debe ser una cadena de texto' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'El código de la plantilla debe ser una cadena de texto' })
  @IsOptional()
  code?: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  description?: string;

  @IsString({ message: 'El ID de la línea/sistema debe ser una cadena de texto' })
  @IsOptional()
  systemId?: string;

  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  @IsOptional()
  isActive?: boolean;

  @IsString({ message: 'La imagen del producto debe ser una cadena de texto' })
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  pricingMethod?: string;

  @IsString()
  @IsOptional()
  areaUnit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  areaPriceL1?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  areaPriceL2?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  areaPriceL3?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  areaPriceL4?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateMinimumAreaDto)
  minimumAreas?: TemplateMinimumAreaDto[];
}

