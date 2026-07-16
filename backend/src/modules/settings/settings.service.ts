import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.tenantSetting.findMany({
      where: { tenant_id: tenantId },
      orderBy: { key: 'asc' },
    });
  }

  async upsertMany(dto: UpdateSettingsDto, tenantId: string) {
    return this.prisma.$transaction(async (tx) => {
      const results: any[] = [];
      for (const item of dto.settings) {
        const setting = await tx.tenantSetting.upsert({
          where: {
            tenant_id_key: {
              tenant_id: tenantId,
              key: item.key,
            },
          },
          update: {
            value: item.value,
            value_type: item.valueType,
          },
          create: {
            tenant_id: tenantId,
            key: item.key,
            value: item.value,
            value_type: item.valueType,
          },
        });
        results.push(setting);
      }
      return results;
    });
  }
}
