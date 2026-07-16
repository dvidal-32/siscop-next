import { IsString } from 'class-validator';

export class ImportTemplateDto {
  @IsString({ message: 'El ID de la plantilla global debe ser una cadena de texto' })
  globalTemplateId: string;
}
