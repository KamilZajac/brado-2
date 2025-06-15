import ModbusRTU from "modbus-serial";
import * as dotenv from 'dotenv';
import * as fs from "fs";
import axios from "axios";
import {LiveReading, TempReading} from "@brado/types";
const xml2js = require('xml2js');

dotenv.config();


const portName = process.env.PORTNAME || "COM2";
const startAddress = parseInt(process.env.STARTADDRESS || "1");
const numberOfRegisters = parseInt(process.env.NUMBER_OF_REGISTERS || "7");

import * as winston from 'winston';
import 'winston-daily-rotate-file';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) =>
            `[${timestamp}] ${level.toUpperCase()}: ${message}`
        )
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

logger.add(new winston.transports.DailyRotateFile({
    filename: 'logs/app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d'
}));

console.log(`Port: ${portName}`);
console.log(`Start address: ${startAddress}`);
console.log(`Number of registers: ${numberOfRegisters}`);

logger.info(`Started reading from ${portName} at ${new Date().toISOString()}`);

const QUEUE_FILE = 'queue.json';

let queue: any[] = [];

if (fs.existsSync(QUEUE_FILE)) {
    queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
}

function saveQueue() {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}


async function tryFlushQueue() {

    queue = queue.map(reading => ({
        ...reading,
        timestamp: isNaN(reading.timestamp) ? new Date(reading.timestamp).getTime() : reading.timestamp
    }))

    if (queue.length === 0) return;

    const CHUNK_SIZE = 1000;
    const TIMEOUT_MS = 1000;
    let chunk: any[] = [];

    try {
        while (queue.length > 0) {
            chunk = queue.splice(0, CHUNK_SIZE)

            await axios.post(process.env.READINGS_ENDPOINT ?? "http://57.129.131.80:3100/connector-reading", {data: chunk});
            console.log(new Date().toISOString());
            logger.info(`Sent ${chunk.length} readings at ${new Date().toISOString()}`);
            saveQueue();

            await new Promise(resolve => setTimeout(resolve, TIMEOUT_MS));
        }
    } catch (err) {
        console.log('Backend offline - will try again later...');
        logger.error(`Backend offline at ${new Date().toISOString()}: ${err.message}`);
        queue = [...chunk, ...queue];
        saveQueue();
    }
}

async function addReading(datas: LiveReading[]) {
    queue.push(...datas);
    saveQueue();
    await tryFlushQueue();
}


const meterAddresses = [1, 2];

async function readSensors() {
    const client = new ModbusRTU();
    let connected = false;

    try {
        await client.connectRTUBuffered(portName, {
            baudRate: 9600,
            parity: "none",
            dataBits: 8,
            stopBits: 1,
        });

        connected = true;

        const nowDate = new Date().getTime();
        const datas: LiveReading[] = [];

        for (const id of meterAddresses) {
            try {
                client.setID(id);
                const data = await client.readHoldingRegisters(startAddress, numberOfRegisters);
                const val = data.data.reverse()[0]
                datas.push({
                    sensorId: id,
                    value: val,
                    timestamp: nowDate.toString(),
                    delta: -1
                });
            } catch (err) {
                logger.error(`Błąd odczytu z licznika ${id}: ${err.message} at ${new Date().toISOString()}`);
                console.error(`Błąd odczytu z licznika ${id}:`, (err as any).message);
            }
        }

        if (datas.length) {
            addReading(datas).then()
        }

    } catch (err) {
        console.error(new Date().toISOString())
        console.error('cannot send');
        logger.error(`cannot send - ${err.message} at ${new Date().toISOString()}`);
    } finally {
        if (connected) {
            try {
                client.close();
            } catch (closeErr) {
                console.warn(`[!] Error closing port: ${closeErr.message}`);
            }
        }
    }
}
function getMsUntilNextMinute(): number {
    const now = new Date();
    return 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
}


async function parseXMLtoReading(xml) {
    try {
        // const xml = response.data;

        const parser = new xml2js.Parser({ explicitArray: false });

        return parser.parseStringPromise(xml)
            .then(result => {
                // Readable formatting
                const sensors = result.root.sns;

                const readings: TempReading[] = []

                const timestamp = new Date().getTime().toString();

                if(sensors.every(sensor => !sensor.$.val2 && !sensor.$.val3 && sensor.$.val)) {
                    const temperature = parseFloat(sensors[0].$.val);
                    const humidity = parseFloat(sensors[1].$.val);
                    const dewPoint = parseFloat(sensors[2].$.val);
                    const sensorId = result.root.status.$.location.toString();
                    readings.push({id: -1, temperature, humidity, dewPoint, sensorId, timestamp});
                } else {
                    sensors.forEach(sensor => {
                        readings.push({
                            id: -1,
                            timestamp,
                            temperature: parseFloat(sensor.$.val),
                            humidity: parseFloat(sensor.$.val2),
                            dewPoint: parseFloat(sensor.$.val3),
                            sensorId: sensor.$.name
                        })
                    })
                }

                return readings

            })
            .catch(err => {
                logger.error(`Error parsing XML: ${err.message} at ${new Date().toISOString()}`);
                console.error('Error parsing XML:', err);
            });

    } catch (error) {
        console.error('Error fetching or parsing XML:', error.message);
        logger.error(`Error parsing XML: ${error.message} at ${new Date().toISOString()}`);

    }
}


async function fetchTempEndpoints(endpoints) {
    const requests = endpoints.map((url) =>
        axios.get(url).then(response => ({
            url,
            data: response.data,
            status: response.status
        })).catch(error => ({
            url,
            error: error.message,
            status: error.response?.status || null
        }))
    );

    const results = await Promise.all(requests);
    return results;
}

async function readTemperatures(): Promise<void> {
    const endpoints = [
        'http://89.22.215.52:41233/fresh.xml',
        'http://89.22.215.52:41232/fresh.xml',
        'http://89.22.215.52:41231/fresh.xml',
        'http://89.22.215.52:41230/fresh.xml'
    ];

    // const readings: TempReading[] = [];

    const xmlDatas = await fetchTempEndpoints(endpoints);

    const parsedDatas = xmlDatas.map(data => parseXMLtoReading(data.data))

    const readings = (await Promise.all(parsedDatas)).flat()


    // Todo add queue
    // console.log(readings);
    // await axios.post(process.env.READINGS_ENDPOINT.replace('connector-reading', 'connector-temp') ?? "http://57.129.131.80:3100/connector-temp", {data: readings});
    await axios.post(process.env.READINGS_ENDPOINT ? process.env.READINGS_ENDPOINT.replace('connector-reading', 'connector-temp') : "http://localhost:3000/connector-temp", {data: readings});

}

function startReadingEveryMinute() {
    const delay = getMsUntilNextMinute();
    console.log(`⏳ First reading in ${delay}ms`);

    setTimeout(() => {
        // Run first reading exactly at the top of next minute
        readSensors().then()
        // Then repeat every 60 seconds
        setInterval(readSensors, 60000);

        readTemperatures().then()
        // Then repeat every 60 seconds
        setInterval(readTemperatures, 60000);
    }, delay);
}

startReadingEveryMinute();
