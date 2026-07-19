import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { EngineeringModule } from '../engineering/engineering.module';

@Module({
  imports: [EngineeringModule], // Para usar el motor de cálculo
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
