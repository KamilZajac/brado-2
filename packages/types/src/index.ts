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



export interface SettingsRequest {
    hourlyTarget: number;
    sensorNames: string[];
}


export enum UserRole {
    SUPER_ADMIN = 'super_admin',
    ADMIN = 'admin',
    WORKER = 'worker',
}

export interface User {
    id: number;
    username: string;
    role: UserRole;
}

export interface CreateUser {
    username: string;
    role: UserRole;
    password: string;
}

export interface Annotation {
    id: number;
    timestamp: string;
    value: number;
    text: string;
    sensorId: number;
    user: User;
}
