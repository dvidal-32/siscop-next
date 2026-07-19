import { IsOptional, IsString, IsArray, ArrayUnique, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsOptional()
  firstName?: string;

  @IsString({ message: 'El apellido debe ser una cadena de texto' })
  @IsOptional()
  lastName?: string;

  @IsArray({ message: 'Los roles deben enviarse como un arreglo' })
  @ArrayUnique({ message: 'Los roles no deben contener duplicados' })
  @IsString({ each: true, message: 'Cada rol debe ser el ID en formato de cadena' })
  @IsOptional()
  roleIds?: string[];

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsOptional()
  password?: string;
}
