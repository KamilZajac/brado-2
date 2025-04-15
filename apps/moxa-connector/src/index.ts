import ModbusRTU from "modbus-serial";
import * as dotenv from 'dotenv';
import {DataReading} from "@brado/shared-models";
import fs from "fs";
import axios from "axios";
dotenv.config();

const client = new ModbusRTU();

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
        const response = await axios.post(process.env.READINGS_ENDPOINT ?? "http://localhost:3000/reading", {data: queue});
        console.log(`Sent ${queue.length} readings`);
        queue = [];
        saveQueue();
    } catch (err) {
        console.log('Backend offline - will try again later...');
    }
}

async function addReading(datas: DataReading[]) {
    queue.push(...datas);
    saveQueue();
    await tryFlushQueue();
}


const meterAddresses = [1, 2];

async function start() {
    try {
        await client.connectRTUBuffered(portName, {
            baudRate: 9600,
            parity: "none",
            dataBits: 8,
            stopBits: 1,
        });

        console.log(`Połączono z portem ${portName}`);

        while (true) {
            const nowDate = new Date();
            const now = nowDate.toISOString().replace("T", " ").split(".")[0];
            const datas: DataReading[] = [];

            for (const id of meterAddresses) {
                try {
                    client.setID(id);
                    const data = await client.readHoldingRegisters(startAddress, numberOfRegisters);
                    console.log(`Licznik ${id}:`);
                    const val = data.data.reverse()[0]

                    datas.push({
                        sensorId: 1,
                        value: val,
                        timestamp: nowDate,
                    });
                    // data.data.forEach((val, i) => {
                    //     console.log(`Rejestr ${startAddress + i}: ${val}`);
                    // });
                } catch (err) {
                    console.error(`Błąd odczytu z licznika ${id}:`, (err as any).message);
                }
            }

            addReading(datas).then()

            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    } catch (err) {
        console.error("Błąd połączenia:", (err as any).message);
        process.exit(1);
    }
}

start().then()
