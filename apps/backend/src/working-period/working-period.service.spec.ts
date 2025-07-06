import { Test, TestingModule } from '@nestjs/testing';
import { WorkingPeriodService } from './working-period.service';

describe('WorkingPeriodService', () => {
  let service: WorkingPeriodService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkingPeriodService],
    }).compile();

    service = module.get<WorkingPeriodService>(WorkingPeriodService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
