import { DataSource } from 'typeorm';
import {LiveReadingEntity} from "./reading/entities/minute-reading.entity";
import {LiveReading} from "@brado/types";

async function seedDatabase() {
    const AppDataSource = new DataSource({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
        database: 'brado',
        entities: [LiveReadingEntity],
        synchronize: true,
    });

    await AppDataSource.initialize();

    const readings: LiveReading[] = [];

    const startDate = new Date();
    startDate.setHours(5, 0, 0, 0);
    startDate.setDate(startDate.getDate()); // 5 days ago at 5 AM

    const endHour = 20; // 1 PM
    const intervalSeconds = 60; // every 5 seconds

    // Initial values (starting from 0)
    let sensorValues = {
        1: 0,
        2: 0,
    };

    for (let day = 0; day < 1; day++) {
        const dayStart = new Date(startDate);
        dayStart.setDate(startDate.getDate() + day);

        for (
            let timestamp = new Date(dayStart);
            timestamp.getHours() < endHour;
            timestamp.setSeconds(timestamp.getSeconds() + intervalSeconds)
        ) {
            [1, 2].forEach((sensorId) => {
                const increment =
                    5000 / (60 * 60 / intervalSeconds) +
                    Math.random() * 10 - 5; // ~5000 units/hour ± some randomness

                sensorValues[sensorId] += increment;

                readings.push(
                    AppDataSource.getRepository(LiveReadingEntity).create({
                        sensorId,
                        value: Math.round(sensorValues[sensorId]),
                        timestamp: timestamp.toString(),
                    }),
                );
            });
        }
    }

    // console.log(readings[0]);
    // console.log(readings[1]);
    // console.log(readings[2]);
    // console.log(readings[3]);
    const chunkSize = 1000;
    for (let i = 0; i < readings.length; i += chunkSize) {
        const chunk = readings.slice(i, i + chunkSize);
        await AppDataSource.getRepository(LiveReadingEntity).save(chunk);
    }

    await AppDataSource.destroy();
}

seedDatabase().catch(console.error);
