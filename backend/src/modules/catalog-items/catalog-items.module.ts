import { Module } from '@nestjs/common';
import { CatalogItemsService } from './catalog-items.service';
import { CatalogItemsController } from './catalog-items.controller';

@Module({
  controllers: [CatalogItemsController],
  providers: [CatalogItemsService],
  exports: [CatalogItemsService],
})
export class CatalogItemsModule {}
