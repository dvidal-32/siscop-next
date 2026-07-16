import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'siscop_next_secret_key_123',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: { sub: string; email: string; tenantId: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        tenant: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('El usuario no está activo');
    }

    if (user.tenant && user.tenant.status !== 'active') {
      throw new UnauthorizedException('La empresa del usuario está suspendida o inactiva');
    }

    // Flatten permissions for simple checking later
    const permissions = user.roles.reduce((acc, userRole) => {
      userRole.role.permissions.forEach((rolePermission) => {
        if (rolePermission.permission.is_active) {
          acc.add(rolePermission.permission.code);
        }
      });
      return acc;
    }, new Set<string>());

    // ── Impersonation: allow SuperAdmin to operate under a Tenant context ──
    let effectiveTenantId = user.tenant_id;
    let isImpersonating = false;

    if (user.tenant_id === null) {
      const impersonateHeader = req.headers['x-impersonate-tenant-id'];
      if (impersonateHeader) {
        const targetTenant = await this.prisma.tenant.findUnique({
          where: { id: impersonateHeader },
        });
        if (targetTenant) {
          effectiveTenantId = targetTenant.id;
          isImpersonating = true;
          console.log(`[Impersonation] ${user.email} → Tenant "${targetTenant.name}" (${targetTenant.id})`);
        }
      }
    }

    // 1. Contar los usuarios configurados en el tenant
    const configuredUsersCount = effectiveTenantId
      ? await this.prisma.user.count({ where: { tenant_id: effectiveTenantId } })
      : 0;

    // 2. Cargar los detalles del plan del tenant para obtener los límites
    const tenantWithPlan = effectiveTenantId
      ? await this.prisma.tenant.findUnique({
          where: { id: effectiveTenantId },
          include: { plan: true },
        })
      : null;

    const maxUsersLimit = tenantWithPlan?.plan?.max_users || 0;

    // 3. Cargar la suscripción más reciente para evaluar si está expirada
    const activeSub = effectiveTenantId
      ? await this.prisma.subscription.findFirst({
          where: { tenant_id: effectiveTenantId },
          orderBy: { created_at: 'desc' },
        })
      : null;

    const isSubscriptionExpired = effectiveTenantId
      ? (activeSub ? new Date() > activeSub.end_date : true)
      : false;

    const hasUsedDemo = effectiveTenantId
      ? (await this.prisma.subscription.findFirst({
          where: {
            tenant_id: effectiveTenantId,
            plan: { code: 'demo' },
          },
        })) !== null
      : false;

    const hasPaidPlan = effectiveTenantId
      ? (await this.prisma.subscription.findFirst({
          where: {
            tenant_id: effectiveTenantId,
            plan: {
              code: { in: ['basic', 'pro', 'enterprise'] },
            },
          },
        })) !== null ||
        (await this.prisma.payment.findFirst({
          where: {
            tenant_id: effectiveTenantId,
            status: 'completed',
          },
        })) !== null
      : false;

    const isDemoAvailable = !hasUsedDemo && !hasPaidPlan;

    console.log(`[Diagnostic] User: ${user.email}, TenantID: ${effectiveTenantId}${isImpersonating ? ' (impersonating)' : ''}, ConfiguredUsers: ${configuredUsersCount}, MaxUsers: ${maxUsersLimit}, Expired: ${isSubscriptionExpired}, HasUsedDemo: ${hasUsedDemo}, HasPaidPlan: ${hasPaidPlan}, IsDemoAvailable: ${isDemoAvailable}`);

    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      tenantId: effectiveTenantId,
      realTenantId: user.tenant_id,
      isImpersonating,
      status: user.status,
      permissions: Array.from(permissions),
      configuredUsers: configuredUsersCount,
      maxUsers: maxUsersLimit,
      isSubscriptionExpired,
      hasUsedDemo,
      hasPaidPlan,
      isDemoAvailable,
      tenant: tenantWithPlan ? {
        id: tenantWithPlan.id,
        name: tenantWithPlan.name,
        plan: {
          name: tenantWithPlan.plan.name,
          price: tenantWithPlan.plan.price,
          maxUsers: maxUsersLimit,
        }
      } : null,
      subscription: activeSub ? {
        status: activeSub.status,
        startDate: activeSub.start_date,
        endDate: activeSub.end_date,
      } : null,
      roles: user.roles.map((ur: any) => ({
        name: ur.role.name,
        isSystemRole: ur.role.is_system_role
      })),
    };
  }
}
