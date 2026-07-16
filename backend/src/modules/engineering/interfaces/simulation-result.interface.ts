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
  components: ComponentResult[];
  totalMaterialCost: number;
  calculatedAt: Date;
  logs: string[];
}
