import * as dotenv from 'dotenv';
import * as fs from "fs";
import axios from "axios";
import {LiveReading} from "@brado/types";

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

            await axios.post(process.env.READINGS_ENDPOINT ?? "http://localhost:3000/reading", {data: chunk});
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


        console.log(datas)

        addReading(datas).then()

        await new Promise((resolve) => setTimeout(resolve, 10000));
    }
}


async function loadLatest() {
    const readingsResponse = await axios.get("http://localhost:3000/reading/latest");

    console.log(readingsResponse.data);
    lastValues[1] = readingsResponse.data['1'];
    lastValues[2] = readingsResponse.data['2'];

}

loadLatest().then(() => {
    start();
})

