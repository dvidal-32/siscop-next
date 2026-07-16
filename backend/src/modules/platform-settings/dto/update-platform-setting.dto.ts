import { IsNotEmpty, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SettingItemDto {
  @IsString({ message: 'La clave debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La clave es requerida' })
  key: string;

  @IsString({ message: 'El valor debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El valor es requerido' })
  value: string;
}

export class UpdatePlatformSettingsDto {
  @IsArray({ message: 'Los ajustes deben enviarse como un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => SettingItemDto)
  settings: SettingItemDto[];
}
