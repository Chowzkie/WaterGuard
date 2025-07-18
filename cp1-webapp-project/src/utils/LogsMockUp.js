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
        deviceId: 'PS01-DEV',
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
        deviceId: 'PS02-DEV',
        event: 'Abnormal flow rate detected',
        location: 'Sector 3 Pipeline',
        status: 'Warning',
    },
    {
        id: 6,
        dateTime: '2025-07-11 10:50:05',
        deviceId: 'PS04-DEV',
        event: 'Filter cleaned successfully',
        location: 'Filtration Plant',
        status: 'Success',
    },
    {
        id: 7,
        dateTime: '2025-07-11 10:51:10',
        deviceId: 'PS02-DEV',
        event: 'pH sensor calibration required',
        location: 'Treatment Tank 2',
        status: 'Info', // This status is still relevant for System Logs if you want to keep it
    },
    {
        id: 8,
        dateTime: '2025-07-11 10:52:00',
        deviceId: 'PS03-DEV',
        event: 'Chemical injection rate adjusted',
        location: 'Chemical Dosing Unit',
        status: 'Success',
    },
];
