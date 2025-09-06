// Dashboard.jsx
import React, { useState, useEffect, useContext } from 'react';
import DeviceStatus from './DeviceStatus';
import Readings from './Readings';
import '../../Styles/Dashboard.css';
import AlertsContext from '../../utils/AlertsContext';

function Dashboard() {
    // Get the raw device data from the context (provided by App.jsx)
    const { devices: devicesFromContext } = useContext(AlertsContext);

    const [transformedDevices, setTransformedDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState(null);

    // This useEffect will now correctly transform the DATABASE data
    useEffect(() => {
        if (devicesFromContext && devicesFromContext.length > 0) {
            const newTransformedDevices = devicesFromContext.map(device => {
                // Ensure latestReading exists to prevent crashes
                const readings = device.latestReading || {};
                
                return {
                    // --- SCHEMA CHANGES ---
                    id: device._id, // Use _id from MongoDB
                    label: device.label,
                    location: device.location,
                    status: device.currentState ? device.currentState.status : 'Offline', // Use currentState.status
                    
                    // --- DATA TRANSFORMATION ---
                    // Create the 'readings' array that the child components expect
                    readings: [
                        { id: 1, title: 'pH Level', value: readings.PH || 0, min: 0, max: 14, unit: '', color: '#FFA500' },
                        { id: 2, title: 'Turbidity', value: readings.TURBIDITY || 0, min: 0, max: 10, unit: ' NTU', color: '#4CAF50' },
                        { id: 3, title: 'Temperature', value: readings.TEMP || 0, min: 0, max: 50, unit: '°C', color: '#2196F3' },
                        { id: 4, title: 'TDS', value: readings.TDS || 0, min: 0, max: 1000, unit: ' ppm', color: '#E91E63' },
                    ]
                };
            });
            
            setTransformedDevices(newTransformedDevices);

            // Set the first device as selected by default if none is selected
            if (!selectedDeviceId && newTransformedDevices.length > 0) {
                setSelectedDeviceId(newTransformedDevices[0].id);
            }
        }
    }, [devicesFromContext, selectedDeviceId]);

    // Find the currently selected device from our transformed list
    const selectedDevice = transformedDevices.find(device => device.id === selectedDeviceId);

    return (
        <div className='component-wrapper-dashboard'>
            <Readings 
                selectedDevice={selectedDevice} 
                deviceStatus={selectedDevice ? selectedDevice.status : null}
            />
            <DeviceStatus
                devicesData={transformedDevices}
                selectedDeviceId={selectedDeviceId}
                setSelectedDeviceId={setSelectedDeviceId}
            />
        </div>
    );
}

export default Dashboard;

