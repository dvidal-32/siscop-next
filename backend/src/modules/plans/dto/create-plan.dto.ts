import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, IsBoolean, IsInt } from 'class-validator';

export class CreatePlanDto {
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El código es requerido' })
  code: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  description?: string;

  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price: number;

  @IsString({ message: 'El ciclo de facturación debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El ciclo de facturación es requerido' })
  billing_cycle: string;

  @IsInt({ message: 'El número máximo de usuarios debe ser un número entero' })
  @Min(1, { message: 'El número máximo de usuarios debe ser al menos 1' })
  max_users: number;

  @IsInt({ message: 'El almacenamiento máximo debe ser un número entero' })
  @Min(0, { message: 'El almacenamiento máximo no puede ser negativo' })
  max_storage_mb: number;

  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  @IsOptional()
  is_active?: boolean;
}
