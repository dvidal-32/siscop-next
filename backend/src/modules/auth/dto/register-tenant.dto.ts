import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, Matches } from 'class-validator';

export class RegisterTenantDto {
  // Datos del Tenant
  @IsString({ message: 'El nombre de la empresa debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la empresa es requerido' })
  tenantName: string;

  @IsString({ message: 'El slug debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El slug es requerido' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El slug solo puede contener letras minúsculas, números y guiones',
  })
  tenantSlug: string;

  @IsString({ message: 'La razón social debe ser una cadena de texto' })
  @IsOptional()
  legalName?: string;

  @IsString({ message: 'El identificador fiscal debe ser una cadena de texto' })
  @IsOptional()
  taxId?: string;

  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsOptional()
  phone?: string;

  // Datos del Usuario Administrador
  @IsEmail({}, { message: 'El correo del administrador no es válido' })
  @IsNotEmpty({ message: 'El correo del administrador es requerido' })
  adminEmail: string;

  @IsString({ message: 'El nombre del administrador debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre del administrador es requerido' })
  adminFirstName: string;

  @IsString({ message: 'El apellido del administrador debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El apellido del administrador es requerido' })
  adminLastName: string;

  @IsString({ message: 'La contraseña del administrador debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña del administrador es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  adminPassword: string;
}
