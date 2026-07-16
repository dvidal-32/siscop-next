import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionGuard } from './subscription.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';

describe('SubscriptionGuard', () => {
  let guard: SubscriptionGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<SubscriptionGuard>(SubscriptionGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (user: any, method: string, path: string): ExecutionContext => {
    const request = {
      user,
      method,
      path,
    };
    const http = {
      getRequest: () => request,
    };
    return {
      switchToHttp: () => http,
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('should return true if route is public', () => {
    mockReflector.getAllAndOverride.mockReturnValue(true); // Public route
    const context = createMockExecutionContext(null, 'GET', '/dashboard');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true if subscription is not expired', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false); // Private route
    const user = { tenantId: 'tenant1', isSubscriptionExpired: false };
    const context = createMockExecutionContext(user, 'GET', '/dashboard');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true if subscription is expired but route is allowed (e.g. GET /auth/me)', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const user = { tenantId: 'tenant1', isSubscriptionExpired: true };
    const context = createMockExecutionContext(user, 'GET', '/auth/me');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if subscription is expired and route is not allowed (e.g. GET /dashboard)', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const user = { tenantId: 'tenant1', isSubscriptionExpired: true };
    const context = createMockExecutionContext(user, 'GET', '/dashboard');
    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('Su suscripción ha expirado. Por favor, adquiera un plan de pago para continuar usando el sistema.')
    );
  });
});
