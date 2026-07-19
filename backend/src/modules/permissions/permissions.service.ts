import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(isSuperAdmin: boolean) {
    const filterOptions: any = { is_active: true };

    if (!isSuperAdmin) {
      filterOptions.module = {
        notIn: ['plans', 'platform-settings', 'tenants', 'library'],
      };
    }

    return this.prisma.permission.findMany({
      where: filterOptions,
      orderBy: { module: 'asc' },
    });
  }
}
