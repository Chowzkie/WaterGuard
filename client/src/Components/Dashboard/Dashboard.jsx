import React, { useState, useEffect, useContext } from 'react';
import { io } from "socket.io-client";
import DeviceStatus from './DeviceStatus';
import Readings from './Readings';
import '../../Styles/Dashboard.css';
import AlertsContext from '../../utils/AlertsContext';

const socket = io(process.env.VITE_SOCKET_URL); // Adjust URL if deployed

function Dashboard() {
  const { devices: devicesFromContext } = useContext(AlertsContext);
  const [transformedDevices, setTransformedDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  useEffect(() => {
    if (devicesFromContext?.length > 0) {
      const newTransformed = devicesFromContext.map(device => ({
        id: device._id,
        label: device.label,
        location: device.location,
        status: device.currentState?.status || 'Offline',
        thresholds: device.configurations?.thresholds,
        readings: [
          { id: 1, title: 'pH Level', paramKey: 'PH', value: device.latestReading?.PH || 0, min: 0, max: 14, unit: '' },
          { id: 2, title: 'Turbidity', paramKey: 'TURBIDITY', value: device.latestReading?.TURBIDITY || 0, min: 0, max: 10, unit: ' NTU' },
          { id: 3, title: 'Temperature', paramKey: 'TEMP', value: device.latestReading?.TEMP || 0, min: 0, max: 50, unit: '°C' },
          { id: 4, title: 'TDS', paramKey: 'TDS', value: device.latestReading?.TDS || 0, min: 0, max: 1000, unit: ' ppm' },
        ]
      }));

      setTransformedDevices(newTransformed);
      if (!selectedDeviceId && newTransformed.length > 0) {
        setSelectedDeviceId(newTransformed[0].id);
      }
    }
  }, [devicesFromContext, selectedDeviceId]);

  // --- LISTEN FOR SOCKET UPDATES ---
  useEffect(() => {
    socket.on("newReading", (updatedDevice) => {
      setTransformedDevices(prevDevices =>
        prevDevices.map(dev =>
          dev.id === updatedDevice.deviceId
            ? {
                ...dev,
                readings: [
                  { id: 1, title: 'pH Level', paramKey: 'PH', value: updatedDevice.latestReading.PH, min: 0, max: 14, unit: '' },
                  { id: 2, title: 'Turbidity', paramKey: 'TURBIDITY', value: updatedDevice.latestReading.TURBIDITY, min: 0, max: 10, unit: ' NTU' },
                  { id: 3, title: 'Temperature', paramKey: 'TEMP', value: updatedDevice.latestReading.TEMP, min: 0, max: 50, unit: '°C' },
                  { id: 4, title: 'TDS', paramKey: 'TDS', value: updatedDevice.latestReading.TDS, min: 0, max: 1000, unit: ' ppm' },
                ]
              }
            : dev
        )
      );
    });

    return () => {
      socket.off("newReading");
    };
  }, []);

  const selectedDevice = transformedDevices.find(d => d.id === selectedDeviceId);

  return (
    <div className='component-wrapper-dashboard'>
      <Readings 
        selectedDevice={selectedDevice} 
        deviceStatus={selectedDevice?.status} 
        thresholds={selectedDevice?.thresholds}
      />
      <DeviceStatus devicesData={transformedDevices} selectedDeviceId={selectedDeviceId} setSelectedDeviceId={setSelectedDeviceId} />
    </div>
  );
}

export default Dashboard;