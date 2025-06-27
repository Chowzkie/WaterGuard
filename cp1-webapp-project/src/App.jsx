import React, { useState, useEffect, useReducer, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Login from './Components/Login';
import Dashboard from './Components/Dashboard/Dashboard';
import Header from './Components/Navigation-Header/Header';
import Navigation from './Components/Navigation-Header/Navigation';
import Overview from "./Components/Overview/Overview";
import Alerts from './Components/Alerts/Alerts';
import AlertsContext from './utils/AlertsContext';
import ProtectedRoute from './Components/Auth/ProtectedRoute';
import { evaluateSensorReading } from './utils/SensorLogic';

// --- MOCK DATA (No Changes) ---
const FAKE_API_DATA = [ { id: 'ps01-dev', label: 'PS01-DEV', position: [15.6033, 120.6010], location: 'Brgy. Abagon, Gerona, Tarlac', status: 'Online' }, { id: 'ps02-dev', label: 'PS02-DEV', position: [15.6115, 120.5935], location: 'Brgy. Apsayan, Gerona, Tarlac', status: 'Online' }, { id: 'ps03-dev', label: 'PS03-DEV', position: [15.6250, 120.6050], location: 'Brgy. Buenlag, Gerona, Tarlac', status: 'Offline' } ];
const FAKE_STATIONS_DATA = [ { id: 1, label: 'Pumping Station 1', location: 'Brgy. Bagong Bayan, Gerona, Tarlac', operation: 'On-going' } ];
const MOCK_SENSOR_READINGS = [ { deviceId: "ps01-dev", timestamp: "2025-06-23T16:10:10Z", pH: 8.5, }, { deviceId: "ps01-dev", timestamp: "2025-06-23T16:01:15Z", pH: 8.6, }, { deviceId: "ps01-dev", timestamp: "2025-06-23T16:10:10Z", pH: 8.9  }, { deviceId: "ps01-dev", timestamp: "2025-06-23T16:10:10Z", pH: 9.1  }, { deviceId: "ps01-dev", timestamp: "2025-06-23T16:15:10Z", pH: 8.9  }, { deviceId: "ps01-dev", timestamp: "2025-06-23T16:10:10Z", pH: 8.8  }, { deviceId: "ps01-dev", timestamp: "2025-06-23T16:16:10Z", pH: 8.5  }, ];

// --- UPDATED --- Add alertsHistory to our initial state
const initialState = {
  activeAlerts: [],
  recentAlerts: [],
  alertsHistory: [], // The permanent storage
};

function alertsReducer(state, action) {
  switch (action.type) {
    case 'PROCESS_READING': {
      // ... (no changes inside this case, but I'll fix the date format for reliability)
      const { reading, alertIdCounter } = action.payload;
      const potentialAlerts = evaluateSensorReading(reading);
      let nextActiveAlerts = [...state.activeAlerts];
      const alertsToArchive = [];
      potentialAlerts.forEach(newAlertData => {
        const existingAlertIndex = nextActiveAlerts.findIndex(a => a.originator === newAlertData.originator && a.parameter === newAlertData.parameter);
        const existingAlert = existingAlertIndex !== -1 ? nextActiveAlerts[existingAlertIndex] : null;
        const isNewStatusNormal = newAlertData.severity === 'Normal';
        if (existingAlert && !existingAlert.isBackToNormal) {
          if (isNewStatusNormal) {
            const finalStatus = existingAlert.acknowledged ? 'Acknowledged' : 'Resolved';
            alertsToArchive.push({ ...existingAlert, status: finalStatus });
            alertIdCounter.current++;
            const backToNormalAlert = { id: alertIdCounter.current, type: `${newAlertData.parameter} is back to normal`, isBackToNormal: true, dateTime: new Date(reading.timestamp).toISOString(), originator: newAlertData.originator, parameter: newAlertData.parameter, severity: 'Normal', status: 'Active' };
            nextActiveAlerts.splice(existingAlertIndex, 1, backToNormalAlert);
            action.timers.start(backToNormalAlert.id);
          } else if (existingAlert.severity !== newAlertData.severity) {
            alertsToArchive.push({ ...existingAlert, status: 'Escalated' });
            alertIdCounter.current++;
            const newAlert = { ...newAlertData, id: alertIdCounter.current, acknowledged: false, dateTime: new Date(reading.timestamp).toISOString() };
            nextActiveAlerts.splice(existingAlertIndex, 1, newAlert);
          }
        } else if (!existingAlert && !isNewStatusNormal) {
          alertIdCounter.current++;
          const newAlert = { ...newAlertData, id: alertIdCounter.current, acknowledged: false, dateTime: new Date(reading.timestamp).toISOString() };
          nextActiveAlerts.push(newAlert);
        }
      });
      if (alertsToArchive.length > 0 || nextActiveAlerts.length !== state.activeAlerts.length) {
        return { ...state, activeAlerts: nextActiveAlerts, recentAlerts: [...alertsToArchive, ...state.recentAlerts] };
      }
      return state;
    }
    case 'ACKNOWLEDGE_ALERT': {
      const { alertId, status } = action.payload;
      const alertToAck = state.activeAlerts.find(a => a.id === alertId);
      if (!alertToAck) return state;
      if (alertToAck.isBackToNormal) {
        action.timers.clear(alertId);
        return { ...state, activeAlerts: state.activeAlerts.filter(a => a.id !== alertId), recentAlerts: [{ ...alertToAck, status }, ...state.recentAlerts] };
      }
      const nextActiveAlerts = state.activeAlerts.map(alert => alert.id === alertId ? { ...alert, acknowledged: true } : alert);
      return { ...state, activeAlerts: nextActiveAlerts };
    }
    // --- NEW --- Add a new case to handle archiving old alerts
    case 'ARCHIVE_RECENT_ALERTS': {
        const { currentTime, archiveInterval } = action.payload;
        if (!state.recentAlerts || state.recentAlerts.length === 0) {
            return state; // Nothing to do
        }

        const alertsToKeep = [];
        const alertsToMove = [];

        state.recentAlerts.forEach(alert => {
            const alertTime = new Date(alert.dateTime).getTime();
            if ((currentTime - alertTime) > archiveInterval) {
                alertsToMove.push(alert); // This alert is old, move it
            } else {
                alertsToKeep.push(alert); // This alert is still recent
            }
        });

        if (alertsToMove.length === 0) {
            return state; // No changes needed
        }

        // Return the new state with alerts moved
        return {
            ...state,
            recentAlerts: alertsToKeep,
            alertsHistory: [...state.alertsHistory, ...alertsToMove],
        };
    }
    default:
      return state;
  }
}

function App() {
  // Use to Authenticate the user when logging in
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const [alertsState, dispatch] = useReducer(alertsReducer, initialState);
  // --- UPDATED --- Destructure alertsHistory from our state
  const { activeAlerts, recentAlerts, alertsHistory } = alertsState;
  
  // --- NEW --- State for the configurable archive interval.
  // Default is 24 hours in milliseconds. Change this for testing!
  // For example, set to 60000 (1 minute) to see alerts move quickly.
  const [archiveInterval, setArchiveInterval] = useState(24 * 60 * 60 * 1000);

  // ... (All other existing state and handlers remain the same)
  const [deviceLocations, setDeviceLocations] = useState([]);
  const [pumpingStations, setPumpingStations] = useState([]);
  const [selectedMapDeviceId, setSelectedMapDeviceId] = useState(null);
  const [refocusTrigger, setRefocusTrigger] = useState(0);
  const [activeFilterDevice, setActiveFilterDevice] = useState('All Devices');
  const [recentFilterDevice, setRecentFilterDevice] = useState('All Devices');
  const alertIdCounter = useRef(0);
  const backToNormalTimers = useRef(new Map());
  const [latestReading, setLatestReading] = useState(null);
  const clearTimer = (alertId) => { if (backToNormalTimers.current.has(alertId)) { clearTimeout(backToNormalTimers.current.get(alertId)); backToNormalTimers.current.delete(alertId); } };
  const startTimer = (alertId) => { const timerId = setTimeout(() => { dispatch({ type: 'ACKNOWLEDGE_ALERT', payload: { alertId, status: 'Cleared' }, timers: { clear: clearTimer } }); }, 10000); backToNormalTimers.current.set(alertId, timerId); };
  
  // --- Sensor simulation timer (No changes) ---
  useEffect(() => {
    setDeviceLocations(FAKE_API_DATA);
    setPumpingStations(FAKE_STATIONS_DATA);
    let readingIndex = 0;
    const intervalId = setInterval(() => { if (readingIndex < MOCK_SENSOR_READINGS.length) { setLatestReading(MOCK_SENSOR_READINGS[readingIndex]); readingIndex++; } else { clearInterval(intervalId); } }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (latestReading) { dispatch({ type: 'PROCESS_READING', payload: { reading: latestReading, alertIdCounter }, timers: { start: startTimer } }); }
  }, [latestReading]);

  // --- NEW --- Timer to periodically check and archive old alerts
  useEffect(() => {
    // Run this check every minute
    const archiveTimer = setInterval(() => {
        console.log("Checking for old alerts to archive...");
        dispatch({
            type: 'ARCHIVE_RECENT_ALERTS',
            payload: {
                currentTime: Date.now(),
                archiveInterval: archiveInterval,
            }
        });
    }, 60000); // 60,000 milliseconds = 1 minute

    return () => clearInterval(archiveTimer); // Cleanup on component unmount
  }, [archiveInterval]); // Rerun if the interval setting changes

  const handleAcknowledgeAlert = (alertId) => { dispatch({ type: 'ACKNOWLEDGE_ALERT', payload: { alertId, status: 'Acknowledged' }, timers: { clear: clearTimer } }); };
  const handleActiveFilterChange = (e) => setActiveFilterDevice(e.target.value);
  const handleRecentFilterChange = (e) => setRecentFilterDevice(e.target.value);
  const handleSelectDevice = (deviceId) => { setSelectedMapDeviceId(deviceId); setRefocusTrigger(prev => prev + 1); };
  const handleAddDevice = (newDevice) => { setDeviceLocations(prev => [...prev, newDevice]); setSelectedMapDeviceId(newDevice.id); };
  const handleDeleteDevice = (deviceId) => { setDeviceLocations(prev => prev.filter(d => d.id !== deviceId)); setSelectedMapDeviceId(null); };
  const handleSaveStations = (updatedStations) => { setPumpingStations(updatedStations); };

  // --- UPDATED --- Add alertsHistory to the context
  const contextValue = {
    activeAlerts,
    recentAlerts,
    alertsHistory, // <-- Add here
    devices: deviceLocations,
    pumpingStations,
    activeFilterDevice,
    handleActiveFilterChange,
    recentFilterDevice,
    handleRecentFilterChange,
    onAcknowledgeAlert: handleAcknowledgeAlert,
    onSelectMapDevice: handleSelectDevice,
    onAddDevice: handleAddDevice,
    onDeleteDevice: handleDeleteDevice,
    onSaveStations: handleSaveStations,
    selectedMapDeviceId,
    refocusTrigger
  };

  return (
    <AlertsContext.Provider value={contextValue}>
      {isAuthenticated && <Header onLogout={handleLogout} />}
      {isAuthenticated && <Navigation />}
        <main>
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            
            <Route
              path="/overview"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <Overview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </main>
    </AlertsContext.Provider>
  );
}

export default App;