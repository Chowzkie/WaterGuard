import React, { useState, useEffect } from 'react';
import PumpingStatus from './PumpingStatus';
import InteractiveMap from './InteractiveMap';
import styles from '../../Styles/Overview.module.css'

// This is a placeholder for your actual API data
const FAKE_API_DATA = [
  { "id": "ps01-dev", "label": "PS01-DEV", "position": [15.6033, 120.6010], "location": "Brgy. Abagon, Gerona, Tarlac", "status": "Online" },
  { "id": "ps02-dev", "label": "PS02-DEV", "position": [15.6115, 120.5935], "location": "Brgy. Apsayan, Gerona, Tarlac", "status": "Online" },
  { "id": "ps03-dev", "label": "PS03-DEV", "position": [15.6250, 120.6050], "location": "Brgy. Buenlag, Gerona, Tarlac", "status": "Offline" }
];
// --- ADD THIS placeholder data for pumping stations ---
const FAKE_STATIONS_DATA = [
    { id: 1, label: 'Pumping Station 1', location: 'Brgy. Bagong Bayan, Gerona, Tarlac', operation: 'On-going' },
    { id: 2, label: 'Pumping Station 2', location: 'Brgy. Matayumtayum, Gerona, Tarlac', operation: 'On-going' },
    { id: 3, label: 'Pumping Station 3', location: 'Brgy. Pinasling, Gerona, Tarlac', operation: 'Offline' },
];

function Overview() {
  // --- Your existing state for the map (UNCHANGED) ---
  const [deviceLocations, setDeviceLocations] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [refocusTrigger, setRefocusTrigger] = useState(0);

  // --- ADD THIS new state for the pumping stations ---
  const [pumpingStations, setPumpingStations] = useState([]);

  useEffect(() => {
    setTimeout(() => {
      setDeviceLocations(FAKE_API_DATA);
      // --- ADD THIS to load pumping station data ---
      setPumpingStations(FAKE_STATIONS_DATA); 
    }, 500);
  }, []);

  // --- Your existing handlers for the map (UNCHANGED) ---
  const handleSelectDevice = (deviceId) => {
    setSelectedDeviceId(deviceId);
    setRefocusTrigger(currentValue => currentValue + 1); 
  };
  const handleAddDevice = (newDevice) => {
    setDeviceLocations(currentDevices => [...currentDevices, newDevice]);
    setSelectedDeviceId(newDevice.id);
  };
  const handleDeleteDevice = (deviceIdToDelete) => {
    setDeviceLocations(currentDevices => 
      currentDevices.filter(device => device.id !== deviceIdToDelete)
    );
    setSelectedDeviceId(null);
  };

  // --- ADD THIS new handler for saving pumping station changes ---
  const handleSaveStations = (updatedStations) => {
    // In a real app, you would make your API call here to save the changes.
    console.log("Saving updated stations to the backend:", updatedStations);
    setPumpingStations(updatedStations);
  };

  return (
    <div className={styles['component-wrapper-overview']}>
      {/* This component and its props are UNCHANGED */}
      <InteractiveMap 
        devices={deviceLocations}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={handleSelectDevice}
        onAddDevice={handleAddDevice}
        onDeleteDevice={handleDeleteDevice}
        refocusTrigger={refocusTrigger}
      />
      
      {/* --- ADD PROPS to the PumpingStatus component --- */}
      <PumpingStatus 
        stations={pumpingStations} 
        onSave={handleSaveStations} 
      />
    </div>
  );
};

export default Overview;