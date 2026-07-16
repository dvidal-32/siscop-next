import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { RuleAction } from '@prisma/client';

export class CreateRuleDto {
  @IsString({ message: 'El ID del componente debe ser una cadena de texto' })
  componentId: string;

  @IsString({ message: 'La condición debe ser una cadena de texto con expresión DSL' })
  condition: string;

  @IsEnum(RuleAction, { message: 'La acción debe ser INCLUDE, EXCLUDE o OVERRIDE_FORMULA' })
  action: RuleAction;

  @IsOptional()
  overrideFormula?: any;

  @IsInt({ message: 'La prioridad debe ser un número entero' })
  @Min(0, { message: 'La prioridad no puede ser menor que 0' })
  @IsOptional()
  priority?: number;
}
