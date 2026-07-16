import { Test, TestingModule } from '@nestjs/testing';
import { LibraryService } from './library.service';
import { PrismaService } from '../../../shared/database/prisma.service';

describe('LibraryService', () => {
  let service: LibraryService;
  let prisma: PrismaService;

  const mockPrismaService = {
    engineeringTemplate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LibraryService>(LibraryService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('getGlobalTemplates', () => {
    it('debe listar plantillas globales (tenant_id = null)', async () => {
      mockPrismaService.engineeringTemplate.findMany.mockResolvedValue([
        { id: '1', name: 'Global Window', tenant_id: null },
      ]);

      const result = await service.getGlobalTemplates();
      expect(result).toHaveLength(1);
      expect(result[0].tenant_id).toBeNull();
      expect(mockPrismaService.engineeringTemplate.findMany).toHaveBeenCalledWith({
        where: { tenant_id: null, is_active: true },
        include: {
          system: true,
          _count: { select: { variables: true, components: true } },
        },
        orderBy: { name: 'asc' },
      });
    });
  });
});
