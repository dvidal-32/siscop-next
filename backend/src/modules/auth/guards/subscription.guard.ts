import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../shared/decorators/public.decorator';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user, method, path } = request;

    // If there is no authenticated user (or it is a global user without tenant), let it pass
    if (!user || !user.tenantId) {
      return true;
    }

    if (user.isSubscriptionExpired) {
      if (!this.isAllowedRouteForExpiredSubscription(method, path, user.tenantId)) {
        throw new ForbiddenException(
          'Su suscripción ha expirado. Por favor, adquiera un plan de pago para continuar usando el sistema.'
        );
      }
    }

    return true;
  }

  private isAllowedRouteForExpiredSubscription(method: string, path: string, tenantId: string): boolean {
    // Normalize path by removing trailing slash
    const cleanPath = path.replace(/\/$/, '');

    // Allow auth profile loading, logout, and token refresh
    if (cleanPath === '/auth/me' && method === 'GET') return true;
    if (cleanPath === '/auth/logout' && method === 'POST') return true;
    if (cleanPath === '/auth/refresh' && method === 'POST') return true;

    // Allow fetching plans
    if (cleanPath === '/plans' && method === 'GET') return true;

    // Allow viewing and updating own tenant/company (specifically to update the plan)
    if ((cleanPath === `/tenants/${tenantId}`) && (method === 'GET' || method === 'PATCH')) {
      return true;
    }

    // Allow billing/payments and subscriptions checking and processing
    if (cleanPath === '/payments/subscription' && method === 'GET') return true;
    if (cleanPath === '/payments/paypal/capture' && method === 'POST') return true;
    if (cleanPath === '/payments/paypal-config' && method === 'GET') return true;
    if (cleanPath === '/payments' && method === 'GET') return true;
    if (cleanPath === '/subscriptions' && method === 'GET') return true;

    return false;
  }
}
