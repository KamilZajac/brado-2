import ModbusRTU from "modbus-serial";
import * as dotenv from 'dotenv';
import * as fs from "fs";
import axios from "axios";
import {LiveReading} from "@brado/types";

dotenv.config();


const portName = process.env.PORTNAME || "COM2";
const startAddress = parseInt(process.env.STARTADDRESS || "1");
const numberOfRegisters = parseInt(process.env.NUMBER_OF_REGISTERS || "7");

console.log(`Port: ${portName}`);
console.log(`Start address: ${startAddress}`);
console.log(`Number of registers: ${numberOfRegisters}`);


const QUEUE_FILE = 'queue.json';

let queue: any[] = [];

if (fs.existsSync(QUEUE_FILE)) {
    queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
}

function saveQueue() {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

async function tryFlushQueue() {

    if (queue.length === 0) return;

    try {
        const response = await axios.post(process.env.READINGS_ENDPOINT ?? "http://localhost:3100/reading", {data: queue});
        console.log(`Sent ${queue.length} readings`);
        queue = [];
        saveQueue();
    } catch (err) {
        console.log('Backend offline - will try again later...');
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

        console.log('connected');
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
                });
            } catch (err) {
                console.error(`Błąd odczytu z licznika ${id}:`, (err as any).message);
            }
        }

        if (datas.length) {
            addReading(datas).then()
        }

    } catch (err) {
        console.error('.');
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

function startReadingEveryMinute() {
    const delay = getMsUntilNextMinute();
    console.log(`⏳ First reading in ${delay}ms`);

    setTimeout(() => {
        // Run first reading exactly at the top of next minute
        readSensors().then()

        // Then repeat every 60 seconds
        setInterval(readSensors, 60000);
    }, delay);
}

startReadingEveryMinute();
