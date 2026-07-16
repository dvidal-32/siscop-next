import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ComponentType } from '@prisma/client';

export class CreateComponentDto {
  @IsString({ message: 'El ID de la plantilla debe ser una cadena de texto' })
  templateId: string;

  @IsString({ message: 'El ID del artículo de catálogo debe ser una cadena de texto' })
  @IsOptional()
  catalogItemId?: string;

  @IsEnum(ComponentType, { message: 'El tipo debe ser PROFILE, GLASS, ACCESSORY, SUPPLY o LABOR' })
  type: ComponentType;

  @IsString({ message: 'El nombre del componente debe ser una cadena de texto' })
  name: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  description?: string;

  @IsInt({ message: 'El orden debe ser un número entero' })
  @Min(0, { message: 'El orden no puede ser menor que 0' })
  @IsOptional()
  order?: number;
}
