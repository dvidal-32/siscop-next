import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { RuleAction } from '@prisma/client';

export class UpdateRuleDto {
  @IsString({ message: 'La condición debe ser una cadena de texto con expresión DSL' })
  @IsOptional()
  condition?: string;

  @IsEnum(RuleAction, { message: 'La acción debe ser INCLUDE, EXCLUDE o OVERRIDE_FORMULA' })
  @IsOptional()
  action?: RuleAction;

  @IsOptional()
  overrideFormula?: any;

  @IsInt({ message: 'La prioridad debe ser un número entero' })
  @Min(0, { message: 'La prioridad no puede ser menor que 0' })
  @IsOptional()
  priority?: number;
}
