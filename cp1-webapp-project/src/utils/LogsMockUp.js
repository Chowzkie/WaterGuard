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

export const userLogs = [
  {
    dateTime: "2025-07-20T09:00:00Z",
    username: "john.doe",
    fullname: "John Doe",
    action: "Logged in successfully",
  },
  {
    dateTime: "2025-07-20T09:05:15Z",
    username: "jane.smith",
    fullname: "Jane Smith",
    action: "Shut off water valve: 'Main Inlet Valve'",
  },
  {
    dateTime: "2025-07-20T09:10:30Z",
    username: "alice.wonder",
    fullname: "Alice Wonderland",
    action: "Changed hardware device parameter: 'pH sensor' to 7.2 (from 6.8)",
  },
  {
    dateTime: "2025-07-20T09:15:45Z",
    username: "john.doe",
    fullname: "John Doe",
    action: "Updated water change interval: 'Tank 1' to 24 hours (from 48 hours)",
  },
  {
    dateTime: "2025-07-20T09:20:00Z",
    username: "bob.builder",
    fullname: "Bob Builder",
    action: "Changed hardware device parameter: 'Turbidity sensor' to 5 NTU (from 8 NTU)",
  },
  {
    dateTime: "2025-07-20T09:25:20Z",
    username: "jane.smith",
    fullname: "Jane Smith",
    action: "Updated account details for 'john.doe': changed password",
  },
  {
    dateTime: "2025-07-20T09:30:40Z",
    username: "alice.wonder",
    fullname: "Alice Wonderland",
    action: "Changed hardware device parameter: 'TDS sensor' to 150 ppm (from 180 ppm)",
  },
  {
    dateTime: "2025-07-20T09:35:05Z",
    username: "john.doe",
    fullname: "John Doe",
    action: "Opened water valve: 'Discharge Valve Unit B'",
  },
  {
    dateTime: "2025-07-20T09:40:10Z",
    username: "bob.builder",
    fullname: "Bob Builder",
    action: "Changed hardware device parameter: 'Temperature sensor' to 25.0 °C (from 26.5 °C)",
  },
  {
    dateTime: "2025-07-20T09:45:30Z",
    username: "jane.smith",
    fullname: "Jane Smith",
    action: "Logged out",
  },
  {
    dateTime: "2025-07-20T10:00:10Z",
    username: "john.doe",
    fullname: "John Doe",
    action: "Created new user account: 'new.engineer'",
  },
  {
    dateTime: "2025-07-20T10:05:00Z",
    username: "alice.wonder",
    fullname: "Alice Wonderland",
    action: "Performed system diagnostic on 'Sensor Hub 3'",
  },
  {
    dateTime: "2025-07-20T10:10:20Z",
    username: "bob.builder",
    fullname: "Bob Builder",
    action: "Acknowledged low pressure alarm: 'Pump Station 1'",
  },
  {
    dateTime: "2025-07-14T09:24:3Z",
    username: "dora.explo",
    fullname: "Dora The Explorer",
    action: "fucked up the system",
  },
];