import { IsString, IsOptional, IsBoolean } from 'class-validator';

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
}
