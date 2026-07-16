import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async findCurrent(tenantId: string) {
    return this.prisma.subscription.findFirst({
      where: { tenant_id: tenantId },
      include: {
        plan: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
