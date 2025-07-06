import { Test, TestingModule } from '@nestjs/testing';
import { WorkingPeriodController } from './working-period.controller';
import { WorkingPeriodService } from './working-period.service';

describe('WorkingPeriodController', () => {
  let controller: WorkingPeriodController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkingPeriodController],
      providers: [WorkingPeriodService],
    }).compile();

    controller = module.get<WorkingPeriodController>(WorkingPeriodController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
