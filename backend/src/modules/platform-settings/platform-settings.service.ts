import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { UpdatePlatformSettingsDto } from './dto/update-platform-setting.dto';
import { PlatformSetting } from '@prisma/client';

@Injectable()
export class PlatformSettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.platformSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async update(dto: UpdatePlatformSettingsDto) {
    return this.prisma.$transaction(async (tx) => {
      const results: PlatformSetting[] = [];
      for (const item of dto.settings) {
        // Buscar configuración existente para preservar su value_type
        const existing = await tx.platformSetting.findUnique({
          where: { key: item.key },
        });

        const valueType = existing ? existing.value_type : 'string';

        const updated = await tx.platformSetting.upsert({
          where: { key: item.key },
          update: { value: item.value },
          create: {
            key: item.key,
            value: item.value,
            value_type: valueType,
          },
        });
        results.push(updated);
      }
      return results;
    });
  }
}
