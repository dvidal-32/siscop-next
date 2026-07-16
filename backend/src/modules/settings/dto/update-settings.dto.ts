import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SettingItemDto {
  @IsString({ message: 'La clave de configuración debe ser texto' })
  @IsNotEmpty({ message: 'La clave de configuración es requerida' })
  key: string;

  @IsString({ message: 'El valor de configuración debe ser texto' })
  @IsNotEmpty({ message: 'El valor de configuración es requerido' })
  value: string;

  @IsString({ message: 'El tipo de valor debe ser texto' })
  @IsNotEmpty({ message: 'El tipo de valor es requerido' })
  valueType: string;
}

export class UpdateSettingsDto {
  @IsArray({ message: 'Las configuraciones deben enviarse en formato de arreglo' })
  @ValidateNested({ each: true })
  @Type(() => SettingItemDto)
  settings: SettingItemDto[];
}
