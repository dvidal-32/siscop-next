import { IsOptional, IsString, IsArray, ArrayUnique } from 'class-validator';

export class UpdateRoleDto {
  @IsString({ message: 'El nombre del rol debe ser una cadena de texto' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  description?: string;

  @IsArray({ message: 'Los permisos deben enviarse como un arreglo' })
  @ArrayUnique({ message: 'Los permisos no deben contener duplicados' })
  @IsString({ each: true, message: 'Cada permiso debe ser el ID en formato de cadena' })
  @IsOptional()
  permissionIds?: string[];
}
