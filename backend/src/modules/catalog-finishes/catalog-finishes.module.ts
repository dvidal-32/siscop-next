import { Module } from '@nestjs/common';
import { CatalogFinishesService } from './catalog-finishes.service';
import { CatalogFinishesController } from './catalog-finishes.controller';

@Module({
  controllers: [CatalogFinishesController],
  providers: [CatalogFinishesService],
  exports: [CatalogFinishesService],
})
export class CatalogFinishesModule {}
