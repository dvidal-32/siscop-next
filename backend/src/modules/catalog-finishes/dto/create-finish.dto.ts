import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreateFinishDto {
  @IsString({ message: 'El nombre del acabado debe ser una cadena de texto' })
  name: string;

  @IsString({ message: 'El código del acabado debe ser una cadena de texto' })
  @IsOptional()
  code?: string;

  @IsNumber({}, { message: 'El multiplicador de precio debe ser un número decimal' })
  @Min(0, { message: 'El multiplicador de precio no puede ser menor que 0' })
  @IsOptional()
  priceMultiplier?: number;

  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  @IsOptional()
  isActive?: boolean;
}
