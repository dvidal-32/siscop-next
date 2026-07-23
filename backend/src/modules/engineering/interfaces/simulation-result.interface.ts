import { ComponentType } from '@prisma/client';

export interface FormulaResult {
  quantity: number;
  width?: number;
  height?: number;
  length?: number;
  area?: number;
}

export interface ComponentResult {
  componentId: string;
  catalogItemId?: string;
  catalogItemCode?: string;
  type: ComponentType;
  name: string;
  description?: string;
  included: boolean;
  excludedByRule?: string;
  formulas: FormulaResult;
  materialCost?: number;
  unit?: string;
}

export interface SimulationResult {
  templateId: string;
  templateName: string;
  templateCode: string;
  inputVariables: Record<string, number | string | boolean>;
  evaluatedVariables?: Record<string, number>;
  components: ComponentResult[];
  totalMaterialCost: number;
  
  // Pricing metadata
  pricingMethod?: string;
  areaUnit?: string;
  areaPriceL1?: number | null;
  areaPriceL2?: number | null;
  areaPriceL3?: number | null;
  areaPriceL4?: number | null;
  totalAreaMm2?: number;
  totalAreaUnit?: number;
  
  calculatedAt: Date;
  logs: string[];
}
