import { IsOptional, IsString, IsNumber, Min, IsBoolean, IsInt } from 'class-validator';

export class UpdatePlanDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  description?: string;

  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  @IsOptional()
  price?: number;

  @IsString({ message: 'El ciclo de facturación debe ser una cadena de texto' })
  @IsOptional()
  billing_cycle?: string;

  @IsInt({ message: 'El número máximo de usuarios debe ser un número entero' })
  @Min(1, { message: 'El número máximo de usuarios debe ser al menos 1' })
  @IsOptional()
  max_users?: number;

  @IsInt({ message: 'El almacenamiento máximo debe ser un número entero' })
  @Min(0, { message: 'El almacenamiento máximo no puede ser negativo' })
  @IsOptional()
  max_storage_mb?: number;

  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  @IsOptional()
  is_active?: boolean;
}
