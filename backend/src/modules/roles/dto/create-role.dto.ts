import { IsNotEmpty, IsOptional, IsString, IsArray, ArrayUnique } from 'class-validator';

export class CreateRoleDto {
  @IsString({ message: 'El nombre del rol debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre del rol es requerido' })
  name: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  description?: string;

  @IsArray({ message: 'Los permisos deben enviarse como un arreglo' })
  @ArrayUnique({ message: 'Los permisos no deben contener duplicados' })
  @IsString({ each: true, message: 'Cada permiso debe ser el ID en formato de cadena' })
  permissionIds: string[];
}
