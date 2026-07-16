import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsInt, Min } from 'class-validator';
import { VariableType } from '@prisma/client';

export class UpdateVariableDto {
  @IsString({ message: 'El nombre interno de la variable debe ser una cadena de texto' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'La etiqueta de la variable debe ser una cadena de texto' })
  @IsOptional()
  label?: string;

  @IsEnum(VariableType, { message: 'El tipo debe ser NUMBER, STRING, BOOLEAN o LIST' })
  @IsOptional()
  type?: VariableType;

  @IsString({ message: 'El valor por defecto debe ser una cadena de texto' })
  @IsOptional()
  defaultValue?: string;

  @IsBoolean({ message: 'El campo requerido debe ser un booleano' })
  @IsOptional()
  isRequired?: boolean;

  @IsNumber({}, { message: 'El valor mínimo debe ser un número' })
  @IsOptional()
  minValue?: number;

  @IsNumber({}, { message: 'El valor máximo debe ser un número' })
  @IsOptional()
  maxValue?: number;

  @IsOptional()
  listOptions?: any;

  @IsInt({ message: 'El orden debe ser un número entero' })
  @Min(0, { message: 'El orden no puede ser menor que 0' })
  @IsOptional()
  order?: number;
}
