import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * EngineeringDslService — Motor del DSL interno para fórmulas de ingeniería.
 *
 * Evalúa expresiones matemáticas y condiciones lógicas de forma segura,
 * sin usar eval() ni permitir código JavaScript libre.
 *
 * Operadores soportados:
 * - Matemáticos: +, -, *, /, (, ), %
 * - Comparación: >, <, >=, <=, ==, !=
 * - Lógicos: AND, OR, NOT
 * - Funciones: ROUND, CEIL, FLOOR, MIN, MAX, ABS, IF
 *
 * Las variables se inyectan como un diccionario { ANCHO: 1500, ALTO: 1200 }
 */
@Injectable()
export class EngineeringDslService {
  // Palabras/patrones prohibidos para prevenir inyección de código
  private readonly FORBIDDEN_PATTERNS = [
    /\beval\b/i,
    /\bfunction\b/i,
    /\breturn\b/i,
    /\bimport\b/i,
    /\brequire\b/i,
    /\bprocess\b/i,
    /\bglobal\b/i,
    /\bwindow\b/i,
    /\bdocument\b/i,
    /\bconsole\b/i,
    /\bsetTimeout\b/i,
    /\bsetInterval\b/i,
    /\bwhile\b/i,
    /\bfor\b/i,
    /\bnew\b/i,
    /\bthis\b/i,
    /\bclass\b/i,
    /\bprototype\b/i,
    /\b__proto__\b/i,
    /\bconstructor\b/i,
    /\bObject\b/,
    /\bArray\b/,
    /\bFunction\b/,
    /\bPromise\b/,
    /[;{}[\]]/,       // No se permiten bloques de código
    /`/,              // No se permiten template literals
    /\$\{/,           // No se permiten template expressions
  ];

  // Funciones seguras permitidas en el DSL
  private readonly SAFE_FUNCTIONS: Record<string, (...args: number[]) => number> = {
    ROUND: (x: number, decimals = 0) => {
      const factor = Math.pow(10, decimals);
      return Math.round(x * factor) / factor;
    },
    CEIL: (x: number) => Math.ceil(x),
    FLOOR: (x: number) => Math.floor(x),
    MIN: (...args: number[]) => Math.min(...args),
    MAX: (...args: number[]) => Math.max(...args),
    ABS: (x: number) => Math.abs(x),
    SQRT: (x: number) => Math.sqrt(x),
    POW: (base: number, exp: number) => Math.pow(base, exp),
  };

  /**
   * Valida que una expresión no contenga código malicioso.
   */
  private validateExpression(expression: string): void {
    for (const pattern of this.FORBIDDEN_PATTERNS) {
      if (pattern.test(expression)) {
        throw new BadRequestException(
          `Expresión no permitida: la fórmula contiene un patrón prohibido "${expression}"`,
        );
      }
    }
  }

  /**
   * Reemplaza las variables por sus valores numéricos en la expresión.
   */
  private substituteVariables(
    expression: string,
    variables: Record<string, number>,
  ): string {
    let result = expression;

    // Ordenar variables por longitud de nombre (más largo primero)
    // para evitar reemplazos parciales: ANCHO_TOTAL antes que ANCHO
    const sortedVarNames = Object.keys(variables).sort(
      (a, b) => b.length - a.length,
    );

    for (const varName of sortedVarNames) {
      const regex = new RegExp(`\\b${varName}\\b`, 'g');
      result = result.replace(regex, String(variables[varName]));
    }

    return result;
  }

  /**
   * Reemplaza las funciones seguras (ROUND, CEIL, etc.) por sus implementaciones.
   * Maneja funciones anidadas recursivamente.
   */
  private substituteFunctions(expression: string, variables: Record<string, number>): string {
    let result = expression;
    let maxIterations = 50; // Protección contra loops infinitos

    // Manejo especial de IF(condición, valorSiVerdad, valorSiFalso)
    const ifRegex = /IF\s*\(([^,]+),\s*([^,]+),\s*([^)]+)\)/gi;
    while (ifRegex.test(result) && maxIterations-- > 0) {
      result = result.replace(ifRegex, (_, condition, trueVal, falseVal) => {
        const condResult = this.evaluateCondition(condition.trim(), variables);
        return condResult ? trueVal.trim() : falseVal.trim();
      });
    }

    // Reemplazar funciones matemáticas seguras
    for (const [funcName, func] of Object.entries(this.SAFE_FUNCTIONS)) {
      const funcRegex = new RegExp(
        `${funcName}\\s*\\(([^()]+)\\)`,
        'gi',
      );

      maxIterations = 50;
      while (funcRegex.test(result) && maxIterations-- > 0) {
        result = result.replace(funcRegex, (_, argsStr: string) => {
          const args = argsStr.split(',').map((arg) => {
            const evaluated = this.safeEvaluateMathExpression(arg.trim());
            return evaluated;
          });
          return String(func(...args));
        });
      }
    }

    return result;
  }

  /**
   * Evalúa una expresión matemática pura (solo números y operadores).
   * Esta función solo se ejecuta después de que todas las variables
   * y funciones han sido sustituidas.
   */
  private safeEvaluateMathExpression(expression: string): number {
    // Verificar que solo contiene caracteres matemáticos válidos
    const sanitized = expression.trim();
    if (!/^[\d\s+\-*/%().]+$/.test(sanitized)) {
      throw new BadRequestException(
        `Expresión matemática inválida: "${expression}" contiene caracteres no permitidos`,
      );
    }

    try {
      // Usar Function con scope aislado (solo operaciones matemáticas)
      // Esto es seguro porque ya validamos que solo hay números y operadores
      const fn = new Function(`"use strict"; return (${sanitized});`);
      const result = fn();

      if (typeof result !== 'number' || !isFinite(result)) {
        throw new BadRequestException(
          `La fórmula "${expression}" produjo un resultado inválido: ${result}`,
        );
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `Error al evaluar la fórmula: "${expression}" — ${error.message}`,
      );
    }
  }

  /**
   * Evalúa una fórmula matemática inyectando las variables del contexto.
   *
   * @param formula - Expresión DSL (ej: "ANCHO / 2 - 3.5")
   * @param variables - Diccionario de variables (ej: { ANCHO: 1500, ALTO: 1200 })
   * @returns Resultado numérico de la evaluación
   */
  evaluateMath(formula: string, variables: Record<string, number>): number {
    if (!formula || formula.trim() === '') {
      throw new BadRequestException('La fórmula no puede estar vacía');
    }

    // 1. Validar seguridad
    this.validateExpression(formula);

    // 2. Sustituir funciones (IF, ROUND, etc.)
    let expression = this.substituteFunctions(formula, variables);

    // 3. Sustituir variables por valores
    expression = this.substituteVariables(expression, variables);

    // 4. Evaluar la expresión matemática pura
    return this.safeEvaluateMathExpression(expression);
  }

  /**
   * Evalúa una condición booleana inyectando las variables del contexto.
   *
   * @param condition - Expresión booleana DSL (ej: "ALTO > 1500")
   * @param variables - Diccionario de variables
   * @returns true/false
   */
  evaluateCondition(
    condition: string,
    variables: Record<string, number>,
  ): boolean {
    if (!condition || condition.trim() === '') {
      throw new BadRequestException('La condición no puede estar vacía');
    }

    // Validar seguridad
    this.validateExpression(condition);

    let expression = condition;

    // Reemplazar operador '=' por '==' si no está precedido por >, <, ! ni seguido por =
    expression = expression.replace(/(?<![<>=!])=(?!=)/g, '==');

    // Reemplazar operadores lógicos textuales por operadores JS
    expression = expression.replace(/\bAND\b/gi, '&&');
    expression = expression.replace(/\bOR\b/gi, '||');
    expression = expression.replace(/\bNOT\b/gi, '!');

    // Sustituir variables
    expression = this.substituteVariables(expression, variables);

    // Verificar que solo contiene caracteres de condición válidos
    const sanitized = expression.trim();
    if (!/^[\d\s+\-*/%().><=!&|]+$/.test(sanitized)) {
      throw new BadRequestException(
        `Condición inválida: "${condition}" contiene caracteres no permitidos después de la sustitución`,
      );
    }

    try {
      const fn = new Function(`"use strict"; return (${sanitized});`);
      const result = fn();

      return Boolean(result);
    } catch (error) {
      throw new BadRequestException(
        `Error al evaluar la condición: "${condition}" — ${error.message}`,
      );
    }
  }

  /**
   * Valida una fórmula sin evaluarla, útil para validar en el CRUD
   * antes de guardar en la base de datos.
   *
   * @param formula - Expresión a validar
   * @param variableNames - Lista de nombres de variables válidas para esta plantilla
   */
  validateFormula(formula: string, variableNames: string[]): { valid: boolean; error?: string } {
    try {
      this.validateExpression(formula);

      // Crear un contexto de prueba con valor 1 para cada variable
      const testVariables: Record<string, number> = {};
      for (const name of variableNames) {
        testVariables[name] = 1;
      }

      this.evaluateMath(formula, testVariables);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}
