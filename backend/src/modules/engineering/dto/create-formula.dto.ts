import { IsString, IsOptional } from 'class-validator';

export class CreateFormulaDto {
  @IsString({ message: 'El ID del componente debe ser una cadena de texto' })
  componentId: string;

  @IsString({ message: 'La fórmula de cantidad debe ser una cadena de texto' })
  @IsOptional()
  quantityFormula?: string;

  @IsString({ message: 'La fórmula de ancho debe ser una cadena de texto' })
  @IsOptional()
  widthFormula?: string;

  @IsString({ message: 'La fórmula de alto debe ser una cadena de texto' })
  @IsOptional()
  heightFormula?: string;

  @IsString({ message: 'La fórmula de largo debe ser una cadena de texto' })
  @IsOptional()
  lengthFormula?: string;

  @IsString({ message: 'La fórmula de área debe ser una cadena de texto' })
  @IsOptional()
  areaFormula?: string;
}
