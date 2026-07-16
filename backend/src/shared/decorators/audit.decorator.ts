import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit_action';

export interface AuditMetadata {
  module: string;
  action: string;
  model?: string; // Prisma model name (e.g. 'user', 'role', 'tenant')
}

export const AuditAction = (module: string, action: string, model?: string) =>
  SetMetadata(AUDIT_ACTION_KEY, { module, action, model });
