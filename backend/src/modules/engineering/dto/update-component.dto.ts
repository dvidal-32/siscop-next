import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ComponentType } from '@prisma/client';

export class UpdateComponentDto {
  @IsString({ message: 'El ID del artículo de catálogo debe ser una cadena de texto' })
  @IsOptional()
  catalogItemId?: string;

  @IsString({ message: 'El nombre de la variable dinámica debe ser una cadena de texto' })
  @IsOptional()
  dynamicItemVariable?: string;

  @IsEnum(ComponentType, { message: 'El tipo debe ser PROFILE, GLASS, ACCESSORY, SUPPLY o LABOR' })
  @IsOptional()
  type?: ComponentType;

  @IsString({ message: 'El nombre del componente debe ser una cadena de texto' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  description?: string;

  @IsInt({ message: 'El orden debe ser un número entero' })
  @Min(0, { message: 'El orden no puede ser menor que 0' })
  @IsOptional()
  order?: number;
}
