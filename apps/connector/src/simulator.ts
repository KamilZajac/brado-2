import * as dotenv from 'dotenv';
import * as fs from "fs";
import axios from "axios";
import {LiveReading, TempReading} from "@brado/types";
const xml2js = require('xml2js');

console.log("SIMULATOR MODE")
let lastValues = {
    1: 0,
    2: 0,
}

const QUEUE_FILE = 'queue.json';

let queue: any[] = [];

if (fs.existsSync(QUEUE_FILE)) {
    queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
}

function saveQueue() {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

// async function tryFlushQueue() {
//     if (queue.length === 0) return;
//
//     try {
//         const response = await axios.post(process.env.READINGS_ENDPOINT ?? "http://localhost:3000/reading", {data: queue});
//         console.log(`Sent ${queue.length} readings`);
//         queue = [];
//         saveQueue();
//     } catch (err) {
//         console.log('Backend offline - will try again later...');
//     }
// }

async function tryFlushQueue() {

    queue = queue.map(reading => ({
        ...reading,
        timestamp: isNaN(reading.timestamp) ? new Date(reading.timestamp).getTime() : reading.timestamp
    }))

    if (queue.length === 0) return;

    const CHUNK_SIZE = 1000;
    const TIMEOUT_MS = 1000;
    let chunk: any[] = [];

    console.log(chunk)

    try {
        while (queue.length > 0) {
            chunk = queue.splice(0, CHUNK_SIZE)

            console.log(process.env.READINGS_ENDPOINT)
            await axios.post(process.env.READINGS_ENDPOINT ?? "http://localhost:3000/connector-reading", {data: chunk});
            console.log(`Sent ${chunk.length} readings`);
            saveQueue();

            await new Promise(resolve => setTimeout(resolve, TIMEOUT_MS));
        }
    } catch (err) {
        console.log('Backend offline - will try again later...');
        queue = [...chunk, ...queue];
        saveQueue();
    }
}

async function addReading(datas: LiveReading[]) {
    queue.push(...datas);
    saveQueue();
    await tryFlushQueue();
}


async function start() {
    while (true) {
        const nowDate = new Date();
        const now = nowDate.toISOString().replace("T", " ").split(".")[0];
        const datas: LiveReading[] = [];

        lastValues['1'] = lastValues['1'] + Math.floor(Math.random() * (90 - 70 + 1)) + 70;
        lastValues['2'] = lastValues['2'] + Math.floor(Math.random() * (90 - 70 + 1)) + 70;
        datas.push({
            sensorId: 1,
            value: lastValues['1'],
            timestamp: nowDate.getTime().toString(),
            delta: -1
        });
        datas.push({
            sensorId: 2,
            value: lastValues['2'],
            timestamp: nowDate.getTime().toString(),
            delta: -1
        });



        addReading(datas).then()


        readTemperatures();
        await new Promise((resolve) => setTimeout(resolve, 10000));
    }
}

// temperature
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
                console.error('Error parsing XML:', err);
            });

    } catch (error) {
        console.error('Error fetching or parsing XML:', error.message);

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
    await axios.post( "http://localhost:3000/connector-temp", {data: readings});

}


async function loadLatest() {
    const readingsResponse = await axios.get("http://localhost:3000/connector-reading/latest");

    console.log(readingsResponse.data);
    lastValues[1] = readingsResponse.data['1'];
    lastValues[2] = readingsResponse.data['2'];

}

loadLatest().then(() => {
    start();
})

