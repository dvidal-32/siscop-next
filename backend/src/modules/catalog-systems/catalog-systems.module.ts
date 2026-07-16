import { Module } from '@nestjs/common';
import { CatalogSystemsService } from './catalog-systems.service';
import { CatalogSystemsController } from './catalog-systems.controller';

@Module({
  controllers: [CatalogSystemsController],
  providers: [CatalogSystemsService],
  exports: [CatalogSystemsService],
})
export class CatalogSystemsModule {}
