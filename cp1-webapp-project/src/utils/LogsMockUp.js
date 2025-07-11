// data.js or mockData.js

export const systemLogsData = [
    {
        id: 1, // Add an id for key prop
        dateTime: '2025-07-11 10:45:00',
        deviceId: 'PS01-DEV',
        event: 'Valve Closed due to high pH level',
        location: 'Brgy. Example, Tarlac',
        status: 'Warning',
    },
    {
        id: 2,
        dateTime: '2025-07-11 10:46:30',
        deviceId: 'PS02-DEV',
        event: 'Pump restarted by system',
        location: 'Moncada Water Station',
        status: 'Success',
    },
    {
        id: 3,
        dateTime: '2025-07-11 10:47:15',
        deviceId: 'TEMP-SENSOR-01',
        event: 'Temperature sensor offline',
        location: 'Reservoir A',
        status: 'Error',
    },
    {
        id: 4,
        dateTime: '2025-07-11 10:48:00',
        deviceId: 'PS01-DEV',
        event: 'Valve opened by the administrator',
        location: 'Brgy. Example, Tarlac',
        status: 'Success',
    },
    {
        id: 5,
        dateTime: '2025-07-11 10:49:22',
        deviceId: 'FLOW-MTR-03',
        event: 'Abnormal flow rate detected',
        location: 'Sector 3 Pipeline',
        status: 'Warning',
    },
    {
        id: 6,
        dateTime: '2025-07-11 10:50:05',
        deviceId: 'FILTER-01',
        event: 'Filter cleaned successfully',
        location: 'Filtration Plant',
        status: 'Success',
    },
    {
        id: 7,
        dateTime: '2025-07-11 10:51:10',
        deviceId: 'PH-SENSOR-02',
        event: 'pH sensor calibration required',
        location: 'Treatment Tank 2',
        status: 'Info', // This status is still relevant for System Logs if you want to keep it
    },
    {
        id: 8,
        dateTime: '2025-07-11 10:52:00',
        deviceId: 'CHEM-INJ-UNIT',
        event: 'Chemical injection rate adjusted',
        location: 'Chemical Dosing Unit',
        status: 'Success',
    },
];

export const sensorLogsData = [
    {
        id: 1,
        dateTime: '2025-07-11 10:45:00',
        parameter: 'pH',
        value: '7.2',
        unit: '',
        status: 'Active',
    },
    {
        id: 2,
        dateTime: '2025-07-11 10:45:30',
        parameter: 'Turbidity',
        value: '0.5',
        unit: 'NTU',
        status: 'Active',
    },
    {
        id: 3,
        dateTime: '2025-07-11 10:46:00',
        parameter: 'Temperature',
        value: '29.1',
        unit: '°C',
        status: 'Active',
    },
    {
        id: 4,
        dateTime: '2025-07-11 10:46:30',
        parameter: 'TDS',
        value: '180',
        unit: 'ppm',
        status: 'Active',
    },
    {
        id: 5,
        dateTime: '2025-07-11 10:47:00',
        parameter: 'pH',
        value: 'N/A',
        unit: '',
        status: 'Offline', // pH sensor is offline
    },
    {
        id: 6,
        dateTime: '2025-07-11 10:47:30',
        parameter: 'Turbidity',
        value: 'N/A',
        unit: 'NTU',
        status: 'Maintenance', // Turbidity sensor under maintenance
    },
    {
        id: 7,
        dateTime: '2025-07-11 10:48:00',
        parameter: 'Temperature',
        value: '28.9',
        unit: '°C',
        status: 'Active',
    },
    {
        id: 8,
        dateTime: '2025-07-11 10:48:30',
        parameter: 'TDS',
        value: 'N/A',
        unit: 'ppm',
        status: 'Offline', // TDS sensor is offline
    },
];