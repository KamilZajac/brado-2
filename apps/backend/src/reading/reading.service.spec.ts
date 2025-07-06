import { Test, TestingModule } from '@nestjs/testing';
import { ReadingService } from './reading.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LiveReadingEntity } from './entities/minute-reading.entity';
import { HourlyReadingEntity } from './entities/hourly-reading-entity';
import { ReadingsGateway } from './readings.gateway';
import { SettingsService } from '../settings/settings.service';
import { Repository } from 'typeorm';
import { LiveReading } from '@brado/types';

describe('ReadingService', () => {
  let service: ReadingService;
  let liveReadingsRepo: Repository<LiveReadingEntity>;

  const mockReadingsGateway = {
    sendLifeUpdate: jest.fn(),
  };

  const mockSettingsService = {
    getSettings: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReadingService,
        {
          provide: getRepositoryToken(LiveReadingEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(HourlyReadingEntity),
          useClass: Repository,
        },
        {
          provide: ReadingsGateway,
          useValue: mockReadingsGateway,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    service = module.get<ReadingService>(ReadingService);
    liveReadingsRepo = module.get<Repository<LiveReadingEntity>>(
      getRepositoryToken(LiveReadingEntity),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrUpdateLiveReading', () => {
    it('should create a new reading with delta=0 when no previous readings exist', async () => {
      // Mock findLastNBySensorId to return empty array (no previous readings)
      jest.spyOn(service, 'findLastNBySensorId').mockResolvedValue([]);

      // Mock findNextBySensorIdAfterTimestamp to return null (no next reading)
      jest.spyOn(service, 'findNextBySensorIdAfterTimestamp').mockResolvedValue(null);

      // Mock repository methods
      jest.spyOn(liveReadingsRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(liveReadingsRepo, 'create').mockImplementation((entity) => entity as any);
      jest.spyOn(liveReadingsRepo, 'save').mockImplementation((entity) => Promise.resolve(entity as any));

      const newReading: LiveReading = {
        sensorId: 1,
        value: 100,
        timestamp: Date.now().toString(),
      };

      const result = await service.createOrUpdateLiveReading(newReading);

      expect(result.delta).toBe(0);
      // Verify that findNextBySensorIdAfterTimestamp was called
      expect(service.findNextBySensorIdAfterTimestamp).toHaveBeenCalledWith(
        newReading.sensorId,
        newReading.timestamp
      );
    });

    it('should create a new reading with correct delta when previous reading exists', async () => {
      // Mock previous reading
      const previousReading: LiveReading = {
        id: '1',
        sensorId: 1,
        value: 50,
        delta: 50,
        timestamp: (Date.now() - 60000).toString(), // 1 minute ago
      };

      // Mock findLastNBySensorId to return previous reading
      jest.spyOn(service, 'findLastNBySensorId').mockResolvedValue([previousReading]);

      // Mock findNextBySensorIdAfterTimestamp to return null (no next reading)
      jest.spyOn(service, 'findNextBySensorIdAfterTimestamp').mockResolvedValue(null);

      // Mock repository methods
      jest.spyOn(liveReadingsRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(liveReadingsRepo, 'create').mockImplementation((entity) => entity as any);
      jest.spyOn(liveReadingsRepo, 'save').mockImplementation((entity) => Promise.resolve(entity as any));

      const newReading: LiveReading = {
        sensorId: 1,
        value: 100,
        timestamp: Date.now().toString(),
      };

      const result = await service.createOrUpdateLiveReading(newReading);

      // Delta should be current value - previous value
      expect(result.delta).toBe(50); // 100 - 50 = 50
      // Verify that findNextBySensorIdAfterTimestamp was called
      expect(service.findNextBySensorIdAfterTimestamp).toHaveBeenCalledWith(
        newReading.sensorId,
        newReading.timestamp
      );
    });

    it('should handle sensor reset (current value < previous value)', async () => {
      // Mock previous reading with higher value
      const previousReading: LiveReading = {
        id: '1',
        sensorId: 1,
        value: 100,
        delta: 50,
        timestamp: (Date.now() - 60000).toString(), // 1 minute ago
      };

      // Mock findLastNBySensorId to return previous reading
      jest.spyOn(service, 'findLastNBySensorId').mockResolvedValue([previousReading]);

      // Mock findNextBySensorIdAfterTimestamp to return null (no next reading)
      jest.spyOn(service, 'findNextBySensorIdAfterTimestamp').mockResolvedValue(null);

      // Mock repository methods
      jest.spyOn(liveReadingsRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(liveReadingsRepo, 'create').mockImplementation((entity) => entity as any);
      jest.spyOn(liveReadingsRepo, 'save').mockImplementation((entity) => Promise.resolve(entity as any));

      const newReading: LiveReading = {
        sensorId: 1,
        value: 30, // Less than previous value (sensor reset)
        timestamp: Date.now().toString(),
      };

      const result = await service.createOrUpdateLiveReading(newReading);

      // When sensor resets, delta should be the current value
      expect(result.delta).toBe(30);
      // Verify that findNextBySensorIdAfterTimestamp was called
      expect(service.findNextBySensorIdAfterTimestamp).toHaveBeenCalledWith(
        newReading.sensorId,
        newReading.timestamp
      );
    });

    it('should update an existing reading and recalculate delta', async () => {
      // Mock existing reading
      const existingReading: LiveReading = {
        id: '2',
        sensorId: 1,
        value: 80,
        delta: 30,
        timestamp: Date.now().toString(),
      };

      // Mock previous reading
      const previousReading: LiveReading = {
        id: '1',
        sensorId: 1,
        value: 50,
        delta: 50,
        timestamp: (Date.now() - 60000).toString(), // 1 minute ago
      };

      // Mock findLastNBySensorId to return both readings
      jest.spyOn(service, 'findLastNBySensorId').mockResolvedValue([existingReading, previousReading]);

      // Mock findNextBySensorIdAfterTimestamp to return null (no next reading)
      jest.spyOn(service, 'findNextBySensorIdAfterTimestamp').mockResolvedValue(null);

      // Mock repository methods
      jest.spyOn(liveReadingsRepo, 'findOne').mockResolvedValue(existingReading as any);
      jest.spyOn(liveReadingsRepo, 'merge').mockImplementation((_, entity) => ({...existingReading, ...entity} as any));
      jest.spyOn(liveReadingsRepo, 'create').mockImplementation((entity) => entity as any);
      jest.spyOn(liveReadingsRepo, 'save').mockImplementation((entity) => Promise.resolve(entity as any));

      const updatedReading: LiveReading = {
        id: '2',
        sensorId: 1,
        value: 100, // Changed from 80 to 100
        timestamp: existingReading.timestamp,
      };

      const result = await service.createOrUpdateLiveReading(updatedReading);

      // Delta should be recalculated: current value - previous value
      expect(result.delta).toBe(50); // 100 - 50 = 50
      // Verify that findNextBySensorIdAfterTimestamp was called
      expect(service.findNextBySensorIdAfterTimestamp).toHaveBeenCalledWith(
        updatedReading.sensorId,
        updatedReading.timestamp
      );
    });

    it('should update the next reading delta when it exists', async () => {
      // Mock current reading
      const currentReading: LiveReading = {
        sensorId: 1,
        value: 100,
        timestamp: Date.now().toString(),
      };

      // Mock next reading
      const nextReading: LiveReading = {
        id: '3',
        sensorId: 1,
        value: 150,
        delta: 70, // Incorrect delta that needs to be updated
        timestamp: (Date.now() + 60000).toString(), // 1 minute later
      };

      // Mock findLastNBySensorId to return empty array (no previous readings)
      jest.spyOn(service, 'findLastNBySensorId').mockResolvedValue([]);

      // Mock findNextBySensorIdAfterTimestamp to return the next reading
      jest.spyOn(service, 'findNextBySensorIdAfterTimestamp').mockResolvedValue(nextReading);

      // Mock repository methods
      jest.spyOn(liveReadingsRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(liveReadingsRepo, 'create').mockImplementation((entity) => entity as any);

      // Create a spy for the save method to track calls
      const saveSpy = jest.spyOn(liveReadingsRepo, 'save')
        .mockImplementation((entity) => Promise.resolve(entity as any));

      const result = await service.createOrUpdateLiveReading(currentReading);

      // Verify current reading's delta
      expect(result.delta).toBe(0);

      // Verify that save was called twice (once for current reading, once for next reading)
      expect(saveSpy).toHaveBeenCalledTimes(2);

      // Verify that the next reading's delta was updated correctly
      // The second call to save should have the next reading with updated delta
      const savedNextReading = saveSpy.mock.calls[1][0];
      expect(savedNextReading.delta).toBe(50); // 150 - 100 = 50
    });

    it('should handle sensor reset for the next reading', async () => {
      // Mock current reading
      const currentReading: LiveReading = {
        sensorId: 1,
        value: 200,
        timestamp: Date.now().toString(),
      };

      // Mock next reading with lower value (reset)
      const nextReading: LiveReading = {
        id: '3',
        sensorId: 1,
        value: 50, // Less than current value (sensor reset)
        delta: 30, // Incorrect delta that needs to be updated
        timestamp: (Date.now() + 60000).toString(), // 1 minute later
      };

      // Mock findLastNBySensorId to return empty array (no previous readings)
      jest.spyOn(service, 'findLastNBySensorId').mockResolvedValue([]);

      // Mock findNextBySensorIdAfterTimestamp to return the next reading
      jest.spyOn(service, 'findNextBySensorIdAfterTimestamp').mockResolvedValue(nextReading);

      // Mock repository methods
      jest.spyOn(liveReadingsRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(liveReadingsRepo, 'create').mockImplementation((entity) => entity as any);

      // Create a spy for the save method to track calls
      const saveSpy = jest.spyOn(liveReadingsRepo, 'save')
        .mockImplementation((entity) => Promise.resolve(entity as any));

      const result = await service.createOrUpdateLiveReading(currentReading);

      // Verify current reading's delta
      expect(result.delta).toBe(0);

      // Verify that save was called twice (once for current reading, once for next reading)
      expect(saveSpy).toHaveBeenCalledTimes(2);

      // Verify that the next reading's delta was updated correctly
      // For sensor reset, delta should be the current value
      const savedNextReading = saveSpy.mock.calls[1][0];
      expect(savedNextReading.delta).toBe(50); // Reset value
    });
  });
});
