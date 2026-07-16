import { BadRequestException } from '@nestjs/common';
import { EngineeringDslService } from './engineering-dsl.service';

describe('EngineeringDslService', () => {
  let service: EngineeringDslService;

  beforeEach(() => {
    service = new EngineeringDslService();
  });

  // ──────────────────────────────────────────
  // EVALUACIÓN MATEMÁTICA
  // ──────────────────────────────────────────
  describe('evaluateMath', () => {
    it('debe evaluar una fórmula simple con una variable', () => {
      const result = service.evaluateMath('ANCHO / 2', { ANCHO: 1500 });
      expect(result).toBe(750);
    });

    it('debe evaluar una fórmula con resta y múltiples variables', () => {
      const result = service.evaluateMath('ALTO - HOLGURA * 2', {
        ALTO: 1200,
        HOLGURA: 5,
      });
      expect(result).toBe(1190);
    });

    it('debe evaluar una fórmula compleja de corte de jamba', () => {
      // Fórmula real: Alto del vano menos la holgura por ambos lados
      const result = service.evaluateMath('ALTO - (HOLGURA * 2)', {
        ALTO: 1800,
        HOLGURA: 5,
      });
      expect(result).toBe(1790);
    });

    it('debe evaluar una fórmula de ancho de vidrio (2 naves)', () => {
      // Ancho del vidrio = (ancho total / naves) - descuento de perfiles
      const result = service.evaluateMath('(ANCHO / NAVES) - 15', {
        ANCHO: 1600,
        NAVES: 2,
      });
      expect(result).toBe(785);
    });

    it('debe evaluar una constante numérica', () => {
      const result = service.evaluateMath('2', { ANCHO: 1500 });
      expect(result).toBe(2);
    });

    it('debe evaluar fórmulas con decimales', () => {
      const result = service.evaluateMath('ANCHO / 2 - 3.5', { ANCHO: 1500 });
      expect(result).toBe(746.5);
    });

    it('debe evaluar multiplicación de variables', () => {
      const result = service.evaluateMath('NAVES * 2', { NAVES: 2 });
      expect(result).toBe(4);
    });

    it('debe manejar paréntesis anidados', () => {
      const result = service.evaluateMath(
        '((ANCHO - 10) / 2) + 5',
        { ANCHO: 1000 },
      );
      expect(result).toBe(500);
    });

    it('debe evitar reemplazos parciales de variables', () => {
      // ANCHO_TOTAL no debe reemplazar parcialmente ANCHO
      const result = service.evaluateMath('ANCHO_TOTAL - ANCHO', {
        ANCHO_TOTAL: 2000,
        ANCHO: 1500,
      });
      expect(result).toBe(500);
    });

    it('debe lanzar error con fórmula vacía', () => {
      expect(() => service.evaluateMath('', { ANCHO: 1500 })).toThrow(
        BadRequestException,
      );
    });
  });

  // ──────────────────────────────────────────
  // EVALUACIÓN DE CONDICIONES
  // ──────────────────────────────────────────
  describe('evaluateCondition', () => {
    it('debe evaluar condición mayor que (verdadero)', () => {
      const result = service.evaluateCondition('ALTO > 1500', { ALTO: 1800 });
      expect(result).toBe(true);
    });

    it('debe evaluar condición mayor que (falso)', () => {
      const result = service.evaluateCondition('ALTO > 1500', { ALTO: 1200 });
      expect(result).toBe(false);
    });

    it('debe evaluar condición de igualdad', () => {
      const result = service.evaluateCondition('NAVES == 2', { NAVES: 2 });
      expect(result).toBe(true);
    });

    it('debe evaluar condición con AND', () => {
      const result = service.evaluateCondition('ANCHO > 1000 AND ALTO > 1000', {
        ANCHO: 1500,
        ALTO: 1200,
      });
      expect(result).toBe(true);
    });

    it('debe evaluar condición con OR', () => {
      const result = service.evaluateCondition('ANCHO > 2000 OR ALTO > 1500', {
        ANCHO: 1000,
        ALTO: 1800,
      });
      expect(result).toBe(true);
    });

    it('debe evaluar condición menor o igual', () => {
      const result = service.evaluateCondition('NAVES <= 3', { NAVES: 2 });
      expect(result).toBe(true);
    });

    it('debe evaluar condición de desigualdad', () => {
      const result = service.evaluateCondition('NAVES != 1', { NAVES: 2 });
      expect(result).toBe(true);
    });
  });

  // ──────────────────────────────────────────
  // SEGURIDAD — RECHAZO DE INYECCIÓN
  // ──────────────────────────────────────────
  describe('security', () => {
    const variables = { ANCHO: 1500 };

    it('debe rechazar eval()', () => {
      expect(() => service.evaluateMath('eval("1+1")', variables)).toThrow(
        BadRequestException,
      );
    });

    it('debe rechazar process.exit()', () => {
      expect(() => service.evaluateMath('process.exit()', variables)).toThrow(
        BadRequestException,
      );
    });

    it('debe rechazar require()', () => {
      expect(() =>
        service.evaluateMath('require("fs")', variables),
      ).toThrow(BadRequestException);
    });

    it('debe rechazar acceso a global', () => {
      expect(() =>
        service.evaluateMath('global.something', variables),
      ).toThrow(BadRequestException);
    });

    it('debe rechazar bloques de código con llaves', () => {
      expect(() =>
        service.evaluateMath('{ return 1; }', variables),
      ).toThrow(BadRequestException);
    });

    it('debe rechazar funciones', () => {
      expect(() =>
        service.evaluateMath('function test() { return 1 }', variables),
      ).toThrow(BadRequestException);
    });

    it('debe rechazar while loops', () => {
      expect(() =>
        service.evaluateMath('while(true) {}', variables),
      ).toThrow(BadRequestException);
    });

    it('debe rechazar for loops', () => {
      expect(() =>
        service.evaluateMath('for(var i=0;i<10;i++) {}', variables),
      ).toThrow(BadRequestException);
    });

    it('debe rechazar __proto__', () => {
      expect(() =>
        service.evaluateMath('__proto__', variables),
      ).toThrow(BadRequestException);
    });

    it('debe rechazar constructor', () => {
      expect(() =>
        service.evaluateMath('constructor', variables),
      ).toThrow(BadRequestException);
    });

    it('debe rechazar template literals', () => {
      expect(() =>
        service.evaluateMath('`${1+1}`', variables),
      ).toThrow(BadRequestException);
    });
  });

  // ──────────────────────────────────────────
  // FUNCIONES SEGURAS
  // ──────────────────────────────────────────
  describe('safe functions', () => {
    it('debe evaluar ROUND', () => {
      const result = service.evaluateMath('ROUND(ANCHO / 3)', { ANCHO: 1000 });
      expect(result).toBe(333);
    });

    it('debe evaluar CEIL', () => {
      const result = service.evaluateMath('CEIL(ANCHO / 3)', { ANCHO: 1000 });
      expect(result).toBe(334);
    });

    it('debe evaluar FLOOR', () => {
      const result = service.evaluateMath('FLOOR(ANCHO / 3)', { ANCHO: 1000 });
      expect(result).toBe(333);
    });

    it('debe evaluar ABS', () => {
      const result = service.evaluateMath('ABS(ANCHO - 2000)', { ANCHO: 1500 });
      expect(result).toBe(500);
    });
  });

  // ──────────────────────────────────────────
  // VALIDACIÓN DE FÓRMULAS
  // ──────────────────────────────────────────
  describe('validateFormula', () => {
    it('debe validar una fórmula correcta', () => {
      const result = service.validateFormula('ANCHO / 2 - 3.5', ['ANCHO', 'ALTO']);
      expect(result.valid).toBe(true);
    });

    it('debe rechazar una fórmula con código malicioso', () => {
      const result = service.validateFormula('eval("hack")', ['ANCHO']);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
