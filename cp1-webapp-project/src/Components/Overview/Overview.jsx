import React, { useState, useEffect } from 'react';
import PumpingStatus from './PumpingStatus';
import InteractiveMap from './InteractiveMap';
import ActiveAlerts from './ActiveAlerts';
import RecentAlerts from './RecentAlerts';
import styles from '../../Styles/Overview.module.css';

// Mock Device Data
const FAKE_API_DATA = [
  { id: 'ps01-dev', label: 'PS01-DEV', position: [15.6033, 120.6010], location: 'Brgy. Abagon, Gerona, Tarlac', status: 'Online' },
  { id: 'ps02-dev', label: 'PS02-DEV', position: [15.6115, 120.5935], location: 'Brgy. Apsayan, Gerona, Tarlac', status: 'Online' },
  { id: 'ps03-dev', label: 'PS03-DEV', position: [15.6250, 120.6050], location: 'Brgy. Buenlag, Gerona, Tarlac', status: 'Offline' }
];

// Mock Pumping Stations
const FAKE_STATIONS_DATA = [
  { id: 1, label: 'Pumping Station 1', location: 'Brgy. Bagong Bayan, Gerona, Tarlac', operation: 'On-going' },
  { id: 2, label: 'Pumping Station 2', location: 'Brgy. Matayumtayum, Gerona, Tarlac', operation: 'On-going' },
  { id: 3, label: 'Pumping Station 3', location: 'Brgy. Pinasling, Gerona, Tarlac', operation: 'Offline' }
];

// Mock Alerts
const FAKE_ALERTS_DATA = [
  {
    id: 1,
    dateTime: '06-06-25 4:00:00',
    originator: 'ps01-dev',
    type: 'High Temperature (30°C)',
    severity: 'Warning',
    status: 'Active'
  },
  {
    id: 2,
    dateTime: '06-06-25 10:00:00',
    originator: 'ps02-dev',
    type: 'High pH (8.4)',
    severity: 'Critical',
    status: 'Active',
    note: 'Value shut off'
  },
  {
    id: 3,
    dateTime: '06-06-25 21:00:00',
    originator: 'ps01-dev',
    type: 'High Turbidity (8.1 NTU)',
    severity: 'Warning',
    status: 'Active'
  },
  {
    id: 4,
    dateTime: '06-06-25 21:00:00',
    originator: 'ps01-dev',
    type: 'High Turbidity (8.1 NTU)',
    severity: 'Normal',
    status: 'Active'
  },
    {
    id: 5,
    dateTime: '06-06-25 21:00:00',
    originator: 'ps01-dev',
    type: 'High Turbidity (8.1 NTU)',
    severity: 'Normal',
    status: 'Active'
  },
  {
    id: 6,
    dateTime: '06-06-25 21:00:00',
    originator: 'ps01-dev',
    type: 'High Turbidity (8.1 NTU)',
    severity: 'Normal',
    status: 'Active'
  },
];

function Overview() {
  const [deviceLocations, setDeviceLocations] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [refocusTrigger, setRefocusTrigger] = useState(0);

  const [pumpingStations, setPumpingStations] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [activeFilterDevice, setActiveFilterDevice] = useState('All Devices');
  const [recentFilterDevice, setRecentFilterDevice] = useState('All Devices');

  useEffect(() => {
    setTimeout(() => {
      setDeviceLocations(FAKE_API_DATA);
      setPumpingStations(FAKE_STATIONS_DATA);
      setActiveAlerts(FAKE_ALERTS_DATA);
    }, 500);
  }, []);

  // Device filtering
  const handleActiveFilterChange = (e) => {
    setActiveFilterDevice(e.target.value);
  };

  const handleRecentFilterChange = (e) => {
    setRecentFilterDevice(e.target.value);
  };

  // Acknowledge logic
  const handleAcknowledgeAlert = (alertId) => {
    const acknowledged = activeAlerts.find(alert => alert.id === alertId);
    if (!acknowledged) return;

    setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));
    setRecentAlerts(prev => [
      ...prev,
      { ...acknowledged, status: 'Acknowledged' }
    ]);
  };

  // Map interactions
  const handleSelectDevice = (deviceId) => {
    setSelectedDeviceId(deviceId);
    setRefocusTrigger(prev => prev + 1);
  };

  const handleAddDevice = (newDevice) => {
    setDeviceLocations(prev => [...prev, newDevice]);
    setSelectedDeviceId(newDevice.id);
  };

  const handleDeleteDevice = (deviceIdToDelete) => {
    setDeviceLocations(prev => prev.filter(d => d.id !== deviceIdToDelete));
    setSelectedDeviceId(null);
  };

  // Pumping station updates
  const handleSaveStations = (updatedStations) => {
    console.log("Saving updated stations:", updatedStations);
    setPumpingStations(updatedStations);
  };

  return (
    <div className={styles['component-wrapper-overview']}>
      <InteractiveMap
        devices={deviceLocations}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={handleSelectDevice}
        onAddDevice={handleAddDevice}
        onDeleteDevice={handleDeleteDevice}
        refocusTrigger={refocusTrigger}
      />

      <ActiveAlerts
        activeAlerts={activeAlerts}
        devices={deviceLocations}
        selectedDevice={activeFilterDevice}
        onDeviceFilterChange={handleActiveFilterChange}
        onAcknowledgeAlert={handleAcknowledgeAlert}
      />

      <PumpingStatus
        stations={pumpingStations}
        onSave={handleSaveStations}
      />

      <RecentAlerts
        recentAlerts={recentAlerts}
        devices={deviceLocations}
        selectedDevice={recentFilterDevice}
        onDeviceFilterChange={handleRecentFilterChange}
      />
    </div>
  );
}

export default Overview;
