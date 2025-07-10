export const initialDevices = [
  {
    id: 'PS01-DEV',
    location: 'Brgy. Burgos, Moncada, Tarlac',
    status: 'Online',
    readings: [
      { id: 1, title: 'Current pH', value: 9.2, min: 0, max: 14, unit: '', color: '#FFA500' },
      { id: 2, title: 'Turbidity', value: 3.5, min: 0, max: 10, unit: ' NTU', color: '#4CAF50' },
      { id: 3, title: 'Temperature', value: 45, min: 0, max: 50, unit: '°C', color: '#2196F3' },
      { id: 4, title: 'TDS', value: 350, min: 0, max: 1000, unit: ' ppm', color: '#E91E63' },
    ],
    // --- Add specific historical data for PS01-DEV ---
    history: {
      time: ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00'],
      readings: {
        ph: [6.8, 7.1, 7.3, 7.0, 6.9, 7.2, 7.1, 7.3, 7.4, 7.2, 7.1],
        turbidity: [2.5, 3.1, 3.8, 4.0, 3.6, 2.8, 3.0, 3.5, 3.9, 3.3, 3.2],
        temperature: [22, 23, 23.5, 24, 24.5, 25, 26, 26.5, 27, 27.5, 28],
        tds: [320, 330, 340, 360, 350, 345, 355, 360, 370, 380, 390],
      },
    },
    alerts: [
      { time: '11:45 AM', message: 'Valve closed due to high pH', value: 9.1, level: 'high' },
      { time: '10:30 AM', message: 'High turbidity detected', value: 8.9, level: 'medium' },
      { time: '09:58 AM', message: 'pH normalized to safe level', value: 6.5, level: 'safe' },
    ],
  },
  {
    id: 'PS02-DEV',
    location: 'Brgy. Camposanto 1 Norte, Moncada Tarlac',
    status: 'Offline',
    readings: [
      { id: 5, title: 'Current pH', value: 7.1, min: 0, max: 14, unit: '', color: '#FFA500' },
      { id: 6, title: 'Turbidity', value: 2.0, min: 0, max: 10, unit: ' NTU', color: '#4CAF50' },
      { id: 7, title: 'Temperature', value: 26, min: 0, max: 50, unit: '°C', color: '#2196F3' },
      { id: 8, title: 'TDS', value: 300, min: 0, max: 1000, unit: ' ppm', color: '#E91E63' },
    ],
    // --- Add specific historical data for PS02-DEV ---
    history: {
      time: ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00'],
      readings: {
        ph: [7.0, 7.2, 7.0, 7.1, 7.3, 7.0, 6.9, 7.1, 7.0, 7.2, 7.1],
        turbidity: [1.8, 2.0, 2.1, 2.5, 2.3, 2.0, 1.9, 2.2, 2.0, 1.8, 2.1],
        temperature: [24, 24.5, 25, 25.5, 26, 26.5, 27, 27.5, 28, 28.5, 29],
        tds: [280, 290, 295, 300, 310, 305, 300, 295, 290, 285, 280],
      },
    },
    alerts: [
      { time: '09:00 AM', message: 'Device PS02-DEV offline', value: null, level: 'high' },
      { time: '08:00 AM', message: 'Turbidity stable', value: 2.0, level: 'safe' },
    ],
  },
  {
    id: 'PS03-DEV',
    location: 'Brgy. San Roque, Moncada Tarlac',
    status: 'Online',
    readings: [
      { id: 9, title: 'Current pH', value: 6.8, min: 0, max: 14, unit: '', color: '#FFA500' },
      { id: 10, title: 'Turbidity', value: 1.2, min: 0, max: 10, unit: ' NTU', color: '#4CAF50' },
      { id: 11, title: 'Temperature', value: 27, min: 0, max: 50, unit: '°C', color: '#2196F3' },
      { id: 12, title: 'TDS', value: 290, min: 0, max: 1000, unit: ' ppm', color: '#E91E63' },
    ],
    // --- Add specific historical data for PS03-DEV ---
    history: {
      time: ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00'],
      readings: {
        ph: [6.5, 6.7, 6.8, 6.9, 7.0, 7.1, 7.0, 6.9, 6.8, 6.7, 6.6],
        turbidity: [1.0, 1.1, 1.2, 1.3, 1.2, 1.1, 1.0, 1.1, 1.2, 1.3, 1.4],
        temperature: [25, 25.5, 26, 26.5, 27, 27.5, 28, 28.5, 29, 29.5, 30],
        tds: [270, 275, 280, 285, 290, 295, 300, 305, 310, 315, 320],
      },
    },
    alerts: [
      { time: '10:15 AM', message: 'System running optimally', value: null, level: 'safe' },
      { time: '07:00 AM', message: 'Routine check complete', value: null, level: 'safe' },
    ],
  },
  {
    id: 'PS04-DEV',
    location: 'Brgy. Poblacion, Moncada Tarlac',
    status: 'Maintenance',
    readings: [
      { id: 13, title: 'Current pH', value: 8.5, min: 0, max: 14, unit: '', color: '#FFA500' },
      { id: 14, title: 'Turbidity', value: 4.5, min: 0, max: 10, unit: ' NTU', color: '#4CAF50' },
      { id: 15, title: 'Temperature', value: 22, min: 0, max: 50, unit: '°C', color: '#2196F3' },
      { id: 16, title: 'TDS', value: 370, min: 0, max: 1000, unit: ' ppm', color: '#E91E63' },
    ],
    // --- Add specific historical data for PS04-DEV ---
    history: {
      time: ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00'],
      readings: {
        ph: [8.0, 8.2, 8.5, 8.3, 8.1, 8.0, 7.9, 8.0, 8.2, 8.4, 8.5],
        turbidity: [4.0, 4.2, 4.5, 4.3, 4.1, 4.0, 3.9, 4.0, 4.2, 4.4, 4.5],
        temperature: [20, 20.5, 21, 21.5, 22, 22.5, 23, 23.5, 24, 24.5, 25],
        tds: [350, 355, 360, 365, 370, 375, 380, 385, 390, 395, 400],
      },
    },
    alerts: [
      { time: '11:00 AM', message: 'Device PS04-DEV under maintenance', value: null, level: 'medium' },
      { time: '09:30 AM', message: 'Turbidity elevated, monitoring', value: 4.5, level: 'medium' },
    ],
  },
  {
    id: 'PS05-DEV',
    location: 'Brgy. Sapang, Moncada Tarlac',
    status: 'Offline',
    readings: [
      { id: 17, title: 'Current pH', value: 5, min: 0, max: 14, unit: '', color: '#FFA500' },
      { id: 18, title: 'Turbididty', value: 3, min: 0, max: 10, unit: ' NTU', color: '#4CAF50' },
      { id: 19, title: 'Temperature', value: 12, min: 0, max: 50, unit: ' °C', color: '#2196F3' },
      { id: 20, title: 'TDS', value: 240, min: 0, max: 1000, unit: ' ppm', color: '#E91E63' },
    ],
    // --- Add specific historical data for PS05-DEV ---
    history: {
      time: ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00'],
      readings: {
        ph: [5.0, 5.1, 5.2, 5.3, 5.4, 5.5, 5.4, 5.3, 5.2, 5.1, 5.0],
        turbidity: [2.8, 2.9, 3.0, 3.1, 3.2, 3.1, 3.0, 2.9, 2.8, 2.7, 2.6],
        temperature: [10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15],
        tds: [220, 225, 230, 235, 240, 245, 250, 255, 260, 265, 270],
      },
    },
    alerts: [
      { time: '10:45 AM', message: 'Device PS05-DEV offline', value: null, level: 'high' },
      { time: '08:15 AM', message: 'Low pH detected', value: 5.0, level: 'high' },
    ],
  },
];