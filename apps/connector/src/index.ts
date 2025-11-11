import * as fs from "fs";
import ModbusRTU from "modbus-serial";
import axios from "axios";
import * as path from "path";
import {LiveReading, TempReading} from "@brado/types";
import * as dotenv from 'dotenv';
const xml2js = require('xml2js');

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

const isDev = true;
if (isDev) {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(), // Optional: colorize console output
            winston.format.printf(({ timestamp, level, message }) =>
                `[${timestamp}] ${level}: ${message}`
            )
        )
    }));
}

logger.add(new winston.transports.DailyRotateFile({
    filename: 'logs/app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d'
}));


dotenv.config();


if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}


// Constants
const client = new ModbusRTU();

const MOXA_IP = "89.22.215.52";
const MOXA_PORT = 950;
const SENSOR_IDS: number[] = [1, 2];
const REGISTER_ADDR = 7;

const POLL_INTERVAL = 10_000;
const POST_INTERVAL = 60_000;
const CONNECTION_TIMEOUT = 5000;
const UNSENT_FILE = path.join(__dirname, "unsent_readings.json");

// Data structures
const lastReadings = new Map<number, LiveReading>();       // sensorId -> LiveReading (last reading)
const lastSuccessfulReadings = new Map<number, LiveReading>(); // sensorId -> LiveReading (last successful reading)
const sensorConnectionStatus = new Map<number, boolean>(); // sensorId -> boolean (true if connected)
const sendBuffer: LiveReading[] = [];                // Array<LiveReading> (for reset values)

// --- Helpers ---

function getTimestamp(): string {
    return new Date().getTime().toString();
}

// No longer needed as we don't store readings by minute

function loadUnsentFromFile(): LiveReading[] {
    if (fs.existsSync(UNSENT_FILE)) {
        try {
            const content = fs.readFileSync(UNSENT_FILE, "utf8");
            logger.info(`Loading ${UNSENT_FILE} with unsent readings`);
            return JSON.parse(content);
        } catch (err) {
            logger.error(`Failed to read unsent file: ${(err as Error).message}`);
        }
    }
    return [];
}

function saveUnsentToFile(data: LiveReading[]): void {
    try {
        fs.writeFileSync(UNSENT_FILE, JSON.stringify(data, null, 2), "utf8");
        logger.info(`Saved ${data.length} unsent readings to ${UNSENT_FILE}`);
    } catch (err) {
        logger.error(`Failed to write unsent file: ${(err as Error).message}`);
    }
}

function clearUnsentFile(): void {
    try {
        fs.unlinkSync(UNSENT_FILE);
        logger.info(`Cleared unsent readings file ${UNSENT_FILE}`);
    } catch (err) {
        logger.debug(`No unsent file to clear: ${(err as Error).message}`);
    }
}

// No longer needed as we only store the latest reading per sensor

function storeReading(reading: LiveReading): void {
    // Always store the latest reading for each sensor
    lastReadings.set(reading.sensorId, reading);

    // If it's a successful reading, also store it as the last successful reading
    if (!reading.isConnectionFailure) {
        lastSuccessfulReadings.set(reading.sensorId, reading);
    }

    const readingType = reading.isReset ? ' (reset)' :
                        reading.isConnectionFailure ? ' (connection failure)' : '';

    logger.info(`Stored reading for sensor ${reading.sensorId}${readingType} with value ${reading.value}`);
}

// --- Modbus ---

async function connectIfNeeded(): Promise<void> {
    if (!client.isOpen) {
        logger.info(`Attempting to connect to Modbus server at ${MOXA_IP}:${MOXA_PORT}`);
        try {
            // Set a timeout for the connection attempt
            const connectPromise = client.connectTelnet(MOXA_IP, { port: MOXA_PORT });
            await Promise.race([
                connectPromise,
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("Connection timeout")), CONNECTION_TIMEOUT)
                )
            ]);
            logger.info(`Successfully connected to Modbus server at ${MOXA_IP}:${MOXA_PORT}`);
        } catch (err) {
            logger.error(`Failed to connect to Modbus server: ${(err as Error).message}`);
            throw err; // Re-throw to be handled by the caller
        }
    }
}

// --- Poll every 10s ---

async function pollSensors(): Promise<void> {
    const timestamp = getTimestamp();

    logger.info(`Polling sensors at ${timestamp}`);
    for (const sensorId of SENSOR_IDS) {
        try {
            await connectIfNeeded();
            client.setID(sensorId);
            logger.debug(`Reading from sensor ${sensorId} at register ${REGISTER_ADDR}`);
            const data = await client.readHoldingRegisters(REGISTER_ADDR, 1);
            const value = data.data[0];

            // Create current reading
            const current: LiveReading = { id: -1, timestamp, value, sensorId, delta: -1 };

            // Get previous reading
            const last = lastReadings.get(sensorId);

            // Check if this is a connection recovery
            const wasConnected = sensorConnectionStatus.get(sensorId);

            if (wasConnected === false) {
                logger.warn(`Sensor ${sensorId} connection recovered`);
            }

            // Update connection status
            sensorConnectionStatus.set(sensorId, true);

            if (last) {
                logger.info(`Sensor ${sensorId} reading: ${last.value} → ${value}`);

                // Check for sensor reset
                if (value < last.value) {
                    logger.warn(`Sensor ${sensorId} reset detected: ${last.value} → ${value}`);

                    // Mark the current reading as a reset
                    current.isReset = true;

                    // Add both readings to the send buffer for immediate sending
                    // This is the only case where we want to send both readings
                    sendBuffer.push({...last, isReset: true});
                    sendBuffer.push(current);
                    logger.info(`Added reset readings to send buffer for sensor ${sensorId}`);
                }
            }

            // Store the reading
            storeReading(current);

        } catch (err) {
            logger.error(`Sensor ${sensorId} read failed: ${(err as Error).message}`);

            // Mark sensor as disconnected
            sensorConnectionStatus.set(sensorId, false);

            // If we have a last successful reading, use it
            const lastSuccessful = lastSuccessfulReadings.get(sensorId);
            if (lastSuccessful) {
                // Create a new reading based on the last successful one
                const fallbackReading: LiveReading = {
                    id: -1,
                    timestamp,
                    value: lastSuccessful.value,
                    sensorId,
                    delta: -1,
                    isConnectionFailure: true
                };

                // Store the fallback reading
                storeReading(fallbackReading);
                logger.warn(`Using last successful reading for sensor ${sensorId} due to connection failure`);
            } else {
                logger.warn(`No fallback reading available for sensor ${sensorId}`);
            }
        }
    }
}

// --- Send every minute ---

async function postReadings(): Promise<void> {
    const timestamp = getTimestamp();

    logger.debug("Starting temperature readings collection");
    readTemperatures();

    logger.info(`Preparing to send readings at ${timestamp}`);

    // Get readings from the send buffer (resets)
    const specialReadings = [...sendBuffer];
    sendBuffer.length = 0;

    if (specialReadings.length > 0) {
        logger.info(`Processing ${specialReadings.length} special readings (resets/recoveries)`);
    }

    // Get the latest reading for each sensor
    const latestReadings: LiveReading[] = [];
    for (const sensorId of SENSOR_IDS) {
        const reading = lastReadings.get(sensorId);
        if (reading) {
            latestReadings.push(reading);
        } else {
            logger.warn(`No latest reading available for sensor ${sensorId}`);
        }
    }

    // Add any unsent data from previous failures
    const unsent = loadUnsentFromFile();
    if (unsent.length > 0) {
        logger.info(`Found ${unsent.length} previously unsent readings`);
    }

    // Combine all readings to send
    const allReadings: LiveReading[] = [
        ...unsent,           // Previously unsent readings
        ...specialReadings,  // Reset readings (both before and after reset)
        ...latestReadings    // Latest reading for each sensor
    ];

    if (allReadings.length === 0) {
        logger.info("No readings to send");
        return;
    }

    const backendEndpoint = process.env.READINGS_ENDPOINT ?? "http://57.129.131.80:3100/connector-reading"

    logger.info(`Using backend endpoint: ${backendEndpoint}`);

    try {
        logger.info(`Sending ${allReadings.length} readings to backend at ${timestamp}`);
        await axios.post(backendEndpoint, {data: allReadings});
        logger.info("Successfully sent readings to backend");

        // Clear the unsent file after successful send
        clearUnsentFile();
        lastSuccessfulReadings.clear()

    } catch (err) {
        logger.error(`Backend not available, saving to file: ${(err as Error).message}`);

        // Save all readings to the unsent file
        saveUnsentToFile(allReadings);
    }


}

// --- Initialization ---

async function initialize(): Promise<void> {
    logger.info("Starting sensor monitoring application");
    logger.info(`Configuration: MOXA_IP=${MOXA_IP}, MOXA_PORT=${MOXA_PORT}, SENSOR_IDS=${SENSOR_IDS.join(',')}`);
    logger.info(`Intervals: Poll=${POLL_INTERVAL/1000}s, Post=${POST_INTERVAL/1000}s`);

    // Initialize connection status for all sensors
    for (const sensorId of SENSOR_IDS) {
        sensorConnectionStatus.set(sensorId, false);
        logger.debug(`Initialized sensor ${sensorId} connection status to false`);
    }

    // Initial poll to get sensor values
    try {
        logger.info("Performing initial sensor poll");
        await pollSensors();
    } catch (err) {
        logger.error(`Initial poll failed: ${(err as Error).message}`);
    }

    // Start timers
    logger.info(`Starting poll timer (every ${POLL_INTERVAL/1000}s)`);
    setInterval(pollSensors, POLL_INTERVAL);

    logger.info(`Starting post timer (every ${POST_INTERVAL/1000}s)`);
    setInterval(postReadings, POST_INTERVAL);

    // Schedule an immediate check for sending data
    logger.info("Scheduling immediate data send");
    setTimeout(postReadings, 1000);

    logger.info("Initialization complete");
}



// Temperature

async function parseXMLtoReading(xml) {
    try {
        logger.debug("Starting XML parsing");
        const parser = new xml2js.Parser({ explicitArray: false });

        return parser.parseStringPromise(xml)
            .then(result => {
                // Readable formatting
                const sensors = result.root.sns;
                logger.debug(`Found ${sensors.length} sensors in XML data`);

                const readings: TempReading[] = []
                const timestamp = new Date().getTime().toString();

                if(sensors.every(sensor => sensor.$.name?.includes('Basen'))){
                    sensors.forEach(sensor => {
                        const reading = {
                            id: -1,
                            timestamp,
                            temperature: parseFloat(sensor.$.val),
                            humidity: 0,
                            dewPoint: 0,
                            sensorId: sensor.$.name
                        };
                        readings.push(reading);
                        logger.debug(`Parsed temperature reading: temp=${reading.temperature}, humidity=${reading.humidity}, dewPoint=${reading.dewPoint}, sensorId=${reading.sensorId}`);
                    });

                } else if(sensors.every(sensor => !sensor.$.val2 && !sensor.$.val3 && sensor.$.val)) {
                    logger.debug("Processing XML in legacy format");
                    const temperature = parseFloat(sensors[0].$.val);
                    const humidity = parseFloat(sensors[1].$.val);
                    const dewPoint = parseFloat(sensors[2].$.val);
                    const sensorId = result.root.status.$.location.toString();
                    readings.push({id: -1, temperature, humidity, dewPoint, sensorId, timestamp});
                    logger.debug(`Parsed temperature reading: temp=${temperature}, humidity=${humidity}, dewPoint=${dewPoint}, sensorId=${sensorId}`);
                } else {
                    logger.debug("Processing XML in standard format");
                    sensors.forEach(sensor => {
                        const reading = {
                            id: -1,
                            timestamp,
                            temperature: parseFloat(sensor.$.val),
                            humidity: parseFloat(sensor.$.val2),
                            dewPoint: parseFloat(sensor.$.val3),
                            sensorId: sensor.$.name
                        };
                        readings.push(reading);
                        logger.debug(`Parsed temperature reading: temp=${reading.temperature}, humidity=${reading.humidity}, dewPoint=${reading.dewPoint}, sensorId=${reading.sensorId}`);
                    });
                }

                logger.info(`Successfully parsed ${readings.length} temperature readings from XML`);
                return readings;
            })
            .catch(err => {
                logger.error(`Error parsing XML: ${err.message}`);
                return [];
            });

    } catch (error) {
        logger.error(`Error in XML parsing process: ${(error as Error).message}`);
        return [];
    }
}


async function fetchTempEndpoints(endpoints) {
    logger.info(`Fetching temperature data from ${endpoints.length} endpoints`);

    const requests = endpoints.map((url) =>
        axios.get(url).then(response => {
            logger.debug(`Successfully fetched data from ${url} with status ${response.status}`);
            return {
                url,
                data: response.data,
                status: response.status
            };
        }).catch(error => {
            logger.error(`Failed to fetch data from ${url}: ${error.message}`);
            return {
                url,
                error: error.message,
                status: error.response?.status || null
            };
        })
    );

    logger.debug("Waiting for all temperature endpoint requests to complete");
    const results = await Promise.all(requests);

    const successCount = results.filter(r => !r.error).length;
    const failCount = results.length - successCount;

    logger.info(`Temperature endpoints fetch complete: ${successCount} successful, ${failCount} failed`);
    return results;
}

async function readTemperatures(): Promise<void> {
    logger.info("Starting temperature readings collection");

    const endpoints = [
        'http://89.22.215.52:41233/fresh.xml',
        'http://89.22.215.52:41232/fresh.xml',
        'http://89.22.215.52:41231/fresh.xml',
        'http://89.22.215.52:41230/fresh.xml',
        'http://89.22.215.52:41234/fresh.xml',
        'http://89.22.215.52:41235/fresh.xml'
    ];

    try {
        // Fetch XML data from all endpoints
        const xmlDatas = await fetchTempEndpoints(endpoints);

        // Parse XML data into readings
        logger.debug("Parsing XML data from temperature endpoints");
        const parsedDatas = xmlDatas.map(data => parseXMLtoReading(data.data));

        // Wait for all parsing to complete and flatten the results
        const readings = (await Promise.all(parsedDatas)).flat();

        if (readings.length === 0) {
            logger.warn("No temperature readings were parsed from the endpoints");
            return;
        }

        logger.info(`Sending ${readings.length} temperature readings to backend`);

        // Determine the endpoint to use
        const tempEndpoint = process.env.TEMP_ENDPOINT || "http://localhost:3000/connector-temp";
        logger.debug(`Using temperature endpoint: ${tempEndpoint}`);

        // Send the readings to the backend
        await axios.post(tempEndpoint, {data: readings});
        logger.info("Successfully sent temperature readings to backend");
    } catch (error) {
        logger.error(`Failed to process or send temperature readings: ${(error as Error).message}`);
    }
}


// Start the application
logger.info("Starting application initialization");
initialize().catch(err => {
    logger.error(`FATAL: Initialization failed: ${err.message}`);
    logger.error(`Stack trace: ${err.stack}`);
    logger.info("Application shutting down due to initialization failure");
    process.exit(1);
});




// import ModbusRTU from "modbus-serial";
// import * as dotenv from 'dotenv';
// import * as fs from "fs";
// import axios from "axios";
// import {LiveReading, TempReading} from "@brado/types";

//
// dotenv.config();
//
//
// const portName = process.env.PORTNAME || "COM2";
// const startAddress = parseInt(process.env.STARTADDRESS || "1");
// const numberOfRegisters = parseInt(process.env.NUMBER_OF_REGISTERS || "7");
//
// import * as winston from 'winston';
// import 'winston-daily-rotate-file';
//
// const logger = winston.createLogger({
//     level: 'info',
//     format: winston.format.combine(
//         winston.format.timestamp(),
//         winston.format.printf(({ timestamp, level, message }) =>
//             `[${timestamp}] ${level.toUpperCase()}: ${message}`
//         )
//     ),
//     transports: [
//         new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
//         new winston.transports.File({ filename: 'logs/combined.log' })
//     ]
// });
//
// logger.add(new winston.transports.DailyRotateFile({
//     filename: 'logs/app-%DATE%.log',
//     datePattern: 'YYYY-MM-DD',
//     maxFiles: '14d'
// }));
//
// console.log(`Port: ${portName}`);
// console.log(`Start address: ${startAddress}`);
// console.log(`Number of registers: ${numberOfRegisters}`);
//
// logger.info(`Started reading from ${portName} at ${new Date().toISOString()}`);
//
// const QUEUE_FILE = 'queue.json';
//
// let queue: any[] = [];
//
// if (fs.existsSync(QUEUE_FILE)) {
//     queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
// }
//
// function saveQueue() {
//     fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
// }
//
//
// async function tryFlushQueue() {
//
//     queue = queue.map(reading => ({
//         ...reading,
//         timestamp: isNaN(reading.timestamp) ? new Date(reading.timestamp).getTime() : reading.timestamp
//     }))
//
//     if (queue.length === 0) return;
//
//     const CHUNK_SIZE = 1000;
//     const TIMEOUT_MS = 1000;
//     let chunk: any[] = [];
//
//     try {
//         while (queue.length > 0) {
//             chunk = queue.splice(0, CHUNK_SIZE)
//
//             await axios.post(process.env.READINGS_ENDPOINT ?? "http://57.129.131.80:3100/connector-reading", {data: chunk});
//             console.log(new Date().toISOString());
//             logger.info(`Sent ${chunk.length} readings at ${new Date().toISOString()}`);
//             saveQueue();
//
//             await new Promise(resolve => setTimeout(resolve, TIMEOUT_MS));
//         }
//     } catch (err) {
//         console.log('Backend offline - will try again later...');
//         logger.error(`Backend offline at ${new Date().toISOString()}: ${err.message}`);
//         queue = [...chunk, ...queue];
//         saveQueue();
//     }
// }
//
// async function addReading(datas: LiveReading[]) {
//     queue.push(...datas);
//     saveQueue();
//     await tryFlushQueue();
// }
//
//
// const meterAddresses = [1, 2];
//
// async function readSensors() {
//     const client = new ModbusRTU();
//     let connected = false;
//
//     try {
//         await client.connectRTUBuffered(portName, {
//             baudRate: 9600,
//             parity: "none",
//             dataBits: 8,
//             stopBits: 1,
//         });
//
//         connected = true;
//
//         const nowDate = new Date().getTime();
//         const datas: LiveReading[] = [];
//
//         for (const id of meterAddresses) {
//             try {
//                 client.setID(id);
//                 const data = await client.readHoldingRegisters(startAddress, numberOfRegisters);
//                 const val = data.data.reverse()[0]
//                 datas.push({
//                     sensorId: id,
//                     value: val,
//                     timestamp: nowDate.toString(),
//                     delta: -1
//                 });
//             } catch (err) {
//                 logger.error(`Błąd odczytu z licznika ${id}: ${err.message} at ${new Date().toISOString()}`);
//                 console.error(`Błąd odczytu z licznika ${id}:`, (err as any).message);
//             }
//         }
//
//         if (datas.length) {
//             addReading(datas).then()
//         }
//
//     } catch (err) {
//         console.error(new Date().toISOString())
//         console.error('cannot send');
//         logger.error(`cannot send - ${err.message} at ${new Date().toISOString()}`);
//     } finally {
//         if (connected) {
//             try {
//                 client.close();
//             } catch (closeErr) {
//                 console.warn(`[!] Error closing port: ${closeErr.message}`);
//             }
//         }
//     }
// }
// function getMsUntilNextMinute(): number {
//     const now = new Date();
//     return 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
// }
//
//

//
// function startReadingEveryMinute() {
//     const delay = getMsUntilNextMinute();
//     console.log(`⏳ First reading in ${delay}ms`);
//
//     setTimeout(() => {
//         // Run first reading exactly at the top of next minute
//         readSensors().then()
//         // Then repeat every 60 seconds
//         setInterval(readSensors, 60000);
//
//         readTemperatures().then()
//         // Then repeat every 60 seconds
//         setInterval(readTemperatures, 60000);
//     }, delay);
// }
//
// startReadingEveryMinute();
