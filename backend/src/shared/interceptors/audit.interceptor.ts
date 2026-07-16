import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../database/prisma.service';
import { AUDIT_ACTION_KEY, AuditMetadata } from '../decorators/audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const auditMeta = this.reflector.get<AuditMetadata>(AUDIT_ACTION_KEY, context.getHandler());
    if (!auditMeta || !user) {
      return next.handle();
    }

    const { module, action, model } = auditMeta;
    const entityId = request.params?.id;
    let oldValue: any = null;

    if (model && entityId && (request.method === 'PATCH' || request.method === 'PUT' || request.method === 'DELETE')) {
      try {
        const prismaModel = (this.prisma as any)[model];
        if (prismaModel && typeof prismaModel.findUnique === 'function') {
          oldValue = await prismaModel.findUnique({ where: { id: entityId } });
        }
      } catch (err) {
        console.error('AuditInterceptor: failed to fetch old value', err);
      }
    }

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          let newValue: any = null;
          const entityName = model || 'system';
          let finalEntityId = entityId || 'system';

          if (request.method === 'POST' && responseBody) {
            newValue = responseBody;
            if (responseBody.id) {
              finalEntityId = responseBody.id;
            }
          } else if ((request.method === 'PATCH' || request.method === 'PUT') && model && finalEntityId) {
            const prismaModel = (this.prisma as any)[model];
            if (prismaModel && typeof prismaModel.findUnique === 'function') {
              newValue = await prismaModel.findUnique({ where: { id: finalEntityId } });
            }
          }

          // Save AuditLog
          await this.prisma.auditLog.create({
            data: {
              tenant_id: user.tenantId || null,
              user_id: user.id || null,
              action,
              module,
              entity_name: entityName,
              entity_id: String(finalEntityId),
              old_value: oldValue ? JSON.stringify(oldValue) : null,
              new_value: newValue ? JSON.stringify(newValue) : null,
              ip_address: request.ip || null,
              user_agent: request.headers['user-agent'] || null,
            },
          });
        } catch (auditErr) {
          console.error('AuditInterceptor: failed to write audit log', auditErr);
        }
      }),
    );
  }
}
