import { Test, TestingModule } from '@nestjs/testing';
import { TemperatureController } from './temperature.controller';
import { TemperatureService } from './temperature.service';

describe('TemperatureController', () => {
  let controller: TemperatureController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemperatureController],
      providers: [TemperatureService],
    }).compile();

    controller = module.get<TemperatureController>(TemperatureController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
