import React, { useState } from 'react';
import DeviceStatus from './DeviceStatus';
import Readings from './Readings';
import '../../Styles/Dashboard.css'; // Basic styles for the layout

// MOCK DATA
const initialDevices = [
    {
        id: 'PS01-DEV',
        location: 'Brgy. Burgos, Moncada, Tarlac',
        status: 'Online',
        readings: [
            { id: 1, title: 'Current pH', value: 9.2, min: 0, max: 14, unit: '', color: '#FFA500' },
            { id: 2, title: 'Turbidity', value: 3.5, min: 0, max: 10, unit: ' NTU', color: '#4CAF50' },
            { id: 3, title: 'Temperature', value: 24, min: 0, max: 50, unit: '°C', color: '#2196F3' },
            { id: 4, title: 'TDS', value: 350, min: 0, max: 1000, unit: ' ppm', color: '#E91E63' },
        ]
    },
    {
        id: 'PS02-DEV',
        location: 'Brgy. Apsayan, Gerona, Tarlac',
        status: 'Online',
        readings: [
            { id: 5, title: 'Current pH', value: 7.1, min: 0, max: 14, unit: '', color: '#FFA500' },
            { id: 6, title: 'Turbidity', value: 2.0, min: 0, max: 10, unit: ' NTU', color: '#4CAF50' },
            { id: 7, title: 'Temperature', value: 26, min: 0, max: 50, unit: '°C', color: '#2196F3' },
            { id: 8, title: 'TDS', value: 300, min: 0, max: 1000, unit: ' ppm', color: '#E91E63' },
        ]
    },
    {
        id: 'PS03-DEV',
        location: 'Brgy. Buenlag, Gerona, Tarlac',
        status: 'Offline',
        readings: [
            { id: 9, title: 'Current pH', value: 6.8, min: 0, max: 14, unit: '', color: '#FFA500' },
            { id: 10, title: 'Turbidity', value: 1.2, min: 0, max: 10, unit: ' NTU', color: '#4CAF50' },
            { id: 11, title: 'Temperature', value: 27, min: 0, max: 50, unit: '°C', color: '#2196F3' },
            { id: 12, title: 'TDS', value: 290, min: 0, max: 1000, unit: ' ppm', color: '#E91E63' },
        ]
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
        ]
    },
];

function Dashboard() {
    const [devices, setDevices] = useState(initialDevices);
    const [selectedDeviceId, setSelectedDeviceId] = useState('PS01-DEV'); // Set an initial selection

    const selectedDevice = devices.find((device) => device.id === selectedDeviceId);

    return (
        <div className='component-wrapper-dashboard'>
            <Readings selectedDevice={selectedDevice} />
            <DeviceStatus 
                devicesData={devices} 
                selectedDeviceId={selectedDeviceId} 
                setSelectedDeviceId={setSelectedDeviceId} 
            />
        </div>
    );
}

export default Dashboard;