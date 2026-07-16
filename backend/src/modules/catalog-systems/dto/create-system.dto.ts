import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateSystemDto {
  @IsString({ message: 'El nombre del sistema/línea debe ser una cadena de texto' })
  name: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  description?: string;

  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  @IsOptional()
  isActive?: boolean;
}
