import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    role: {
      findMany: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create user', () => {
    it('should throw ForbiddenException if user limit has been reached', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.role.findMany.mockResolvedValue([{ id: 'role1' }]);
      mockPrismaService.user.count.mockResolvedValue(2); // 2 users already exist
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant1',
        plan: {
          name: 'Plan Demo',
          max_users: 2, // limit is 2
        },
      });

      const createUserDto = {
        email: 'test@demo.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        roleIds: ['role1'],
      };

      await expect(service.create(createUserDto, 'tenant1')).rejects.toThrow(
        new ForbiddenException("Su plan actual (Plan Demo) solo permite un máximo de 2 usuarios.")
      );
    });

    it('should not throw if user limit has not been reached', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.role.findMany.mockResolvedValue([{ id: 'role1' }]);
      mockPrismaService.user.count.mockResolvedValue(1); // 1 user exists
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant1',
        plan: {
          name: 'Plan Demo',
          max_users: 2,
        },
      });

      // Mock the transaction callback to simulate database actions
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const txMock = {
          user: {
            create: jest.fn().mockResolvedValue({
              id: 'newuser',
              email: 'test@demo.com',
              first_name: 'Test',
              last_name: 'User',
              status: 'active',
            }),
            findUnique: jest.fn().mockResolvedValue({
              id: 'newuser',
              email: 'test@demo.com',
              first_name: 'Test',
              last_name: 'User',
              status: 'active',
              created_at: new Date(),
            }),
          },
          userRole: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(txMock);
      });

      const createUserDto = {
        email: 'test@demo.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        roleIds: ['role1'],
      };

      const result = await service.create(createUserDto, 'tenant1');
      expect(result).toBeDefined();
    });
  });
});
