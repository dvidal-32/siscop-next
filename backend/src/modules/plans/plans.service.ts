import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.plan.findMany({
      where: { is_active: true },
      orderBy: { price: 'asc' },
    });
  }

  async findAll() {
    return this.prisma.plan.findMany({
      orderBy: { price: 'asc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });
    if (!plan) {
      throw new NotFoundException('Plan no encontrado');
    }
    return plan;
  }

  async create(dto: CreatePlanDto) {
    // Validar código único
    const existing = await this.prisma.plan.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException('Ya existe un plan con este código');
    }

    return this.prisma.plan.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        billing_cycle: dto.billing_cycle,
        max_users: dto.max_users,
        max_storage_mb: dto.max_storage_mb,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.findOne(id);

    return this.prisma.plan.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        billing_cycle: dto.billing_cycle,
        max_users: dto.max_users,
        max_storage_mb: dto.max_storage_mb,
        is_active: dto.is_active,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Soft delete para no romper suscripciones existentes
    return this.prisma.plan.update({
      where: { id },
      data: { is_active: false },
    });
  }
}
