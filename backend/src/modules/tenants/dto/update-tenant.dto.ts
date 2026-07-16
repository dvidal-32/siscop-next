import { IsOptional, IsString, IsEmail } from 'class-validator';

export class UpdateTenantDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'La razón social debe ser una cadena de texto' })
  @IsOptional()
  legalName?: string;

  @IsString({ message: 'El identificador fiscal debe ser una cadena de texto' })
  @IsOptional()
  taxId?: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsOptional()
  phone?: string;

  @IsString({ message: 'El logo debe ser una cadena de texto' })
  @IsOptional()
  logo?: string;

  @IsString({ message: 'El país debe ser una cadena de texto' })
  @IsOptional()
  country?: string;

  @IsString({ message: 'La ciudad debe ser una cadena de texto' })
  @IsOptional()
  city?: string;

  @IsString({ message: 'El municipio debe ser una cadena de texto' })
  @IsOptional()
  municipality?: string;

  @IsString({ message: 'La calle debe ser una cadena de texto' })
  @IsOptional()
  street?: string;

  @IsString({ message: 'El número debe ser una cadena de texto' })
  @IsOptional()
  number?: string;

  @IsString({ message: 'El código postal debe ser una cadena de texto' })
  @IsOptional()
  postalCode?: string;

  @IsString({ message: 'El WhatsApp debe ser una cadena de texto' })
  @IsOptional()
  whatsapp?: string;

  @IsString({ message: 'El ID del plan debe ser una cadena de texto' })
  @IsOptional()
  planId?: string;
}
