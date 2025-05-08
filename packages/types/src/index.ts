export type LiveReading = {
    timestamp: string,
    value: number;
    sensorId: number;
    delta: number;
    dailyTotal?: number; // virtual field
}

export type DataReadingWithDeltas = LiveReading & {
    previous: number | null,
    deltaFromPrevious: number | null,
    todayStart: number | null,
    deltaToday: number | null,
}

export type LiveUpdate = {
    [key: string]: LiveSensorUpdate;
}

export type LiveSensorUpdate = {
    readings: LiveReading[]
    average5: number,
    average60 : number,
}


export type HourlyReading = LiveReading &{
    max: number;
    min: number;
    average: number;
}
