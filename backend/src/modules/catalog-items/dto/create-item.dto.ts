import { IsString, IsNumber, IsBoolean, IsOptional, Min, IsIn } from 'class-validator';

export class CreateItemDto {
  @IsString({ message: 'El código del artículo debe ser una cadena de texto' })
  code: string;

  @IsString({ message: 'El nombre del artículo debe ser una cadena de texto' })
  name: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  description?: string;

  @IsString({ message: 'El tipo de artículo debe ser una cadena de texto' })
  @IsIn(['profile', 'glass', 'accessory', 'supply'], { message: 'El tipo debe ser profile, glass, accessory o supply' })
  type: string;

  @IsString({ message: 'La unidad de medida debe ser una cadena de texto' })
  unit: string;

  @IsNumber({}, { message: 'El costo debe ser un número decimal' })
  @Min(0, { message: 'El costo no puede ser menor que 0' })
  cost: number;

  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  @IsOptional()
  isActive?: boolean;

  @IsString({ message: 'La imagen del producto debe ser una cadena de texto base64' })
  @IsOptional()
  image?: string;

  // Campos específicos de perfiles
  @IsNumber({}, { message: 'El peso por metro debe ser un número' })
  @Min(0, { message: 'El peso por metro no puede ser menor que 0' })
  @IsOptional()
  weightPerMeter?: number;

  @IsNumber({}, { message: 'El largo estándar debe ser un número' })
  @Min(0, { message: 'El largo estándar no puede ser menor que 0' })
  @IsOptional()
  standardLength?: number;

  @IsString({ message: 'El ID de la línea debe ser una cadena de texto' })
  @IsOptional()
  systemId?: string;

  // Campos específicos de vidrios
  @IsNumber({}, { message: 'El espesor en milímetros debe ser un número' })
  @Min(0, { message: 'El espesor no puede ser menor que 0' })
  @IsOptional()
  thicknessMm?: number;

  @IsString({ message: 'El tipo de vidrio debe ser una cadena de texto' })
  @IsOptional()
  glassType?: string; // monolithic, tempered, laminated, double

  @IsNumber({}, { message: 'El peso por metro cuadrado debe ser un número' })
  @Min(0, { message: 'El peso por metro cuadrado no puede ser menor que 0' })
  @IsOptional()
  weightPerM2?: number;
}
