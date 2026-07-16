import { Test, TestingModule } from '@nestjs/testing';
import { EngineeringEngineService } from './engineering-engine.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { EngineeringDslService } from '../dsl/engineering-dsl.service';
import { RuleAction, ComponentType, VariableType } from '@prisma/client';

describe('EngineeringEngineService', () => {
  let service: EngineeringEngineService;
  let prisma: PrismaService;
  let dslService: EngineeringDslService;

  const mockPrismaService = {
    engineeringTemplate: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngineeringEngineService,
        EngineeringDslService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EngineeringEngineService>(EngineeringEngineService);
    prisma = module.get<PrismaService>(PrismaService);
    dslService = module.get<EngineeringDslService>(EngineeringDslService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe simular correctamente un desglose de componentes con fórmulas y costos', async () => {
    const mockTemplate = {
      id: 'template-id',
      name: 'Ventana Corrediza 2 Hojas',
      code: 'VC-02',
      variables: [
        { name: 'ANCHO', label: 'Ancho', type: VariableType.NUMBER, is_required: true, min_value: 500, max_value: 3000, default_value: '1500' },
        { name: 'ALTO', label: 'Alto', type: VariableType.NUMBER, is_required: true, min_value: 500, max_value: 3000, default_value: '1200' },
      ],
      components: [
        {
          id: 'comp-1',
          name: 'Jamba',
          type: ComponentType.PROFILE,
          catalog_item_id: 'item-jamba',
          catalog_item: { id: 'item-jamba', code: 'P-001', unit: 'm', cost: 10 }, // Costo $10 por metro
          rules: [],
          formula: {
            quantity_formula: '2',
            height_formula: 'ALTO - 10',
            length_formula: 'ALTO - 10', // 1.19m
          },
        },
        {
          id: 'comp-2',
          name: 'Felpa',
          type: ComponentType.ACCESSORY,
          catalog_item_id: 'item-felpa',
          catalog_item: { id: 'item-felpa', code: 'A-002', unit: 'u', cost: 2 }, // $2 por unidad
          rules: [
            {
              condition: 'ANCHO > 1000',
              action: RuleAction.INCLUDE,
            }
          ],
          formula: {
            quantity_formula: '4',
          },
        }
      ],
    };

    mockPrismaService.engineeringTemplate.findFirst.mockResolvedValue(mockTemplate);

    const result = await service.simulate(
      'template-id',
      { ANCHO: 1200, ALTO: 1200 },
      'tenant-id',
    );

    expect(result).toBeDefined();
    expect(result.templateName).toBe('Ventana Corrediza 2 Hojas');
    expect(result.components).toHaveLength(2);

    // Componente 1: Jamba (Perfil)
    const jamba = result.components.find((c) => c.name === 'Jamba');
    expect(jamba).toBeDefined();
    expect(jamba?.included).toBe(true);
    expect(jamba?.formulas.quantity).toBe(2);
    expect(jamba?.formulas.length).toBe(1190);
    // Costo: $10/m * 1.19m * 2 = $23.8
    expect(jamba?.materialCost).toBe(23.8);

    // Componente 2: Felpa (Accesorio)
    const felpa = result.components.find((c) => c.name === 'Felpa');
    expect(felpa).toBeDefined();
    expect(felpa?.included).toBe(true);
    expect(felpa?.formulas.quantity).toBe(4);
    // Costo: $2/u * 4 = $8
    expect(felpa?.materialCost).toBe(8);

    expect(result.totalMaterialCost).toBe(31.8);
  });
});
