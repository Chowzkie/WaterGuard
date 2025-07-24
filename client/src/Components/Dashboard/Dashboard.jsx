// Dashboard.jsx
import React, { useState, useEffect, useContext } from 'react';
import DeviceStatus from './DeviceStatus';
import Readings from './Readings';
import '../../Styles/Dashboard.css';
import AlertsContext from '../../utils/AlertsContext'; // Import AlertsContext

function Dashboard() {
    // Use useContext to access the devices from AlertsContext
    const { devices: deviceLocationsFromContext } = useContext(AlertsContext);

    const [devices, setDevices] = useState([]);
    // IMPORTANT: selectedDeviceId should now match the actual 'id' from your FAKE_API_DATA
    const [selectedDeviceId, setSelectedDeviceId] = useState(null);

    // Update internal state when context data changes
    useEffect(() => {
        if (deviceLocationsFromContext && deviceLocationsFromContext.length > 0) {
            // Transform FAKE_API_DATA into the format expected by Dashboard, DeviceStatus, and Readings
            // Make sure the 'id' here matches the actual 'id' from FAKE_API_DATA ('ps01-dev', etc.)
            // so that setSelectedDeviceId works correctly with the original IDs.
            const transformedDevices = deviceLocationsFromContext.map(device => ({
                id: device.id, // <--- CHANGE IS HERE: Use device.id (e.g., 'ps01-dev')
                label: device.label, // Keep label if needed for display
                location: device.location,
                status: device.status,
                readings: [ // This array needs to be constructed from the 'readings' object
                    { id: 1, title: 'pH Level', value: device.readings.ph, min: 0, max: 14, unit: '', color: '#FFA500' },
                    { id: 2, title: 'Turbidity', value: device.readings.turbidity, min: 0, max: 10, unit: ' NTU', color: '#4CAF50' },
                    { id: 3, title: 'Temperature', value: device.readings.temp, min: 0, max: 50, unit: '°C', color: '#2196F3' },
                    { id: 4, title: 'TDS', value: device.readings.tds, min: 0, max: 1000, unit: ' ppm', color: '#E91E63' },
                ]
            }));
            setDevices(transformedDevices);

            // Set the first device as selected if none is selected yet,
            // or if the previously selected device is no longer in the list
            if (selectedDeviceId === null || !transformedDevices.some(d => d.id === selectedDeviceId)) {
                if (transformedDevices.length > 0) {
                    setSelectedDeviceId(transformedDevices[0].id); // Set the original 'id'
                } else {
                    setSelectedDeviceId(null); // No devices available
                }
            }
        } else {
            setDevices([]); // Clear devices if no data is provided
            setSelectedDeviceId(null);
        }
    }, [deviceLocationsFromContext, selectedDeviceId]); // Re-run when context data changes or selectedDeviceId changes

    // Ensure selectedDevice is found using the correct 'id'
    const selectedDevice = devices.find((device) => device.id === selectedDeviceId);

    return (
        <div className='component-wrapper-dashboard'>
            <Readings 
                selectedDevice={selectedDevice} 
                // You pass `device` here, which is the `transformedDevices` array.
                // Depending on `Readings` component, it might expect `selectedDevice.readings`
                // rather than the whole `devices` array for its `readings` prop.
                // Please double-check how your `Readings` component uses this `device` prop.
                device={selectedDevice} // Often, Readings component only needs the selected device itself
                deviceStatus={selectedDevice ? selectedDevice.status : null}
            />
            <DeviceStatus
                devicesData={devices}
                selectedDeviceId={selectedDeviceId}
                setSelectedDeviceId={setSelectedDeviceId}
            />
        </div>
    );
}

export default Dashboard;