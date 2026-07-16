import { Module } from '@nestjs/common';
import { EngineeringController } from './engineering.controller';
import { EngineeringService } from './engineering.service';
import { EngineeringDslService } from './dsl/engineering-dsl.service';
import { EngineeringEngineService } from './engine/engineering-engine.service';
import { LibraryController } from './library/library.controller';
import { LibraryService } from './library/library.service';

@Module({
  controllers: [EngineeringController, LibraryController],
  providers: [
    EngineeringService,
    EngineeringDslService,
    EngineeringEngineService,
    LibraryService,
  ],
  exports: [
    EngineeringService,
    EngineeringDslService,
    EngineeringEngineService,
    LibraryService,
  ],
})
export class EngineeringModule {}
