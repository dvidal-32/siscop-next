import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class CreateTaxDto {
  @IsString({ message: 'El nombre del impuesto debe ser una cadena de texto' })
  name: string;

  @IsNumber({}, { message: 'La tasa del impuesto debe ser un número' })
  @Min(0, { message: 'La tasa no puede ser menor a 0' })
  @Max(100, { message: 'La tasa no puede ser mayor a 100' })
  rate: number;

  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  @IsOptional()
  isActive?: boolean;

  @IsBoolean({ message: 'El estado por defecto debe ser un booleano' })
  @IsOptional()
  isDefault?: boolean;
}
