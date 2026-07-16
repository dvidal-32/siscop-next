import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsArray, ArrayUnique } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsOptional()
  firstName?: string;

  @IsString({ message: 'El apellido debe ser una cadena de texto' })
  @IsOptional()
  lastName?: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsArray({ message: 'Los roles deben enviarse como un arreglo' })
  @ArrayUnique({ message: 'Los roles no deben contener duplicados' })
  @IsString({ each: true, message: 'Cada rol debe ser el ID en formato de cadena' })
  roleIds: string[];
}
