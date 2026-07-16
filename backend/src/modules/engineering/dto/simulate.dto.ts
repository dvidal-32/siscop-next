import { IsString, IsObject } from 'class-validator';

export class SimulateDto {
  @IsString({ message: 'El ID de la plantilla debe ser una cadena de texto' })
  templateId: string;

  @IsObject({ message: 'Las variables deben ser un objeto con pares clave-valor' })
  variables: Record<string, number | string | boolean>;
}
