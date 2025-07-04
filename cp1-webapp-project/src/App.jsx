import React, { useState, useEffect, useReducer, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Login from './Components/Login';
import Dashboard from './Components/Dashboard/Dashboard';
import Header from './Components/Navigation-Header/Header';
import Navigation from './Components/Navigation-Header/Navigation';
import Overview from "./Components/Overview/Overview";
import Devices from './Components/Devices/Devices'
import Alerts from './Components/Alerts/Alerts';
import AlertsContext from './utils/AlertsContext';
import ProtectedRoute from './Components/Auth/ProtectedRoute';
import { evaluateSensorReading } from './utils/SensorLogic';

// =================================================================================
// CONFIGURATION
// =================================================================================
// Set to 'true' to use the current browser time for new alerts (for simulation).
// Set to 'false' to use the timestamp from the sensor data (for real-world application).
const IS_SIMULATION_MODE = true;

// =================================================================================
// MOCK DATA AND INITIAL STATE
// =================================================================================
const FAKE_API_DATA = [
    { id: 'ps01-dev', label: 'PS01-DEV', position: [15.6033, 120.6010], location: 'Brgy. Abagon, Gerona, Tarlac', status: 'Online' },
    { id: 'ps02-dev', label: 'PS02-DEV', position: [15.6115, 120.5935], location: 'Brgy. Apsayan, Gerona, Tarlac', status: 'Online' },
    { id: 'ps03-dev', label: 'PS03-DEV', position: [15.6250, 120.6050], location: 'Brgy. Buenlag, Gerona, Tarlac', status: 'Offline' }
];

const FAKE_STATIONS_DATA = [
    { id: 1, label: 'Pumping Station 1', location: 'Brgy. Bagong Bayan, Gerona, Tarlac', operation: 'On-going' }
];

const MOCK_SENSOR_READINGS = [
  // --- SCENARIO 1: Establish a normal baseline ---
  { deviceId: "ps01-dev", timestamp: "2025-07-03T10:00:00Z", pH: 7.6, turbidity: 4.1 },
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:01:00Z", temp: 28.5, tds: 450 },

  // --- SCENARIO 2: Test the full TDS lifecycle ---
  // A TDS warning is triggered
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:05:00Z", tds: 850 }, // Warning (>500)
  // TDS escalates to critical
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:06:00Z", tds: 1250 },// Critical (>1000)
  // TDS returns to normal
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:07:00Z", tds: 480 }, // Normal (<=500)

  // --- SCENARIO 3: Test the High Temperature alerts ---
  // Temperature enters the high warning range
  { deviceId: "ps01-dev", timestamp: "2025-07-03T10:10:00Z", temp: 34.5 }, // Warning: High (31-35)
  // Temperature becomes critical
  { deviceId: "ps01-dev", timestamp: "2025-07-03T10:11:00Z", temp: 36.2 }, // Critical: High (>35)
  
  // --- SCENARIO 4: Test the Low Temperature alerts ---
  // Temperature enters the low warning range
  { deviceId: "ps01-dev", timestamp: "2025-07-03T10:15:00Z", temp: 8.5 },  // Warning: Low (5-9)
  // Temperature becomes critical
  { deviceId: "ps01-dev", timestamp: "2025-07-03T10:16:00Z", temp: 4.1 },   // Critical: Low (<5)
  // Temperature returns to normal
  { deviceId: "ps01-dev", timestamp: "2025-07-03T10:17:00Z", temp: 25.0 }, // Normal (10-30)

  // --- SCENARIO 5: Test the full pH lifecycle (High and Low) ---
  //Normal starting point
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:19:00Z", pH: 6.5 },  // Normal (6.5-8.5)
  // A high pH warning is triggered
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:20:00Z", pH: 8.8 },  // Warning: High (8.6-9.0)
  // pH escalates to critical high
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:21:00Z", pH: 9.3 },  // Critical: High (>9.0)
  // pH returns to normal from high
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:22:00Z", pH: 8.1 },  // Normal (6.5-8.5)
  // A low pH warning is triggered
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:25:00Z", pH: 6.3 },  // Warning: Low (6.0-6.4)
  // pH escalates to critical low
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:26:00Z", pH: 5.8 },  // Critical: Low (<6.0)
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:22:00Z", pH: 6.6 },  // Normal (6.5-8.5)

  // --- SCENARIO 6: Test the full Turbidity lifecycle ---
  // A device that was offline sends a critical turbidity reading
  { deviceId: "ps03-dev", timestamp: "2025-07-03T10:30:00Z", turbidity: 15.5 },// Critical (>10)
  // Turbidity improves but is still at a warning level
  { deviceId: "ps03-dev", timestamp: "2025-07-03T10:31:00Z", turbidity: 9.8 }, // Warning (>5)
  // Turbidity finally returns to normal
  { deviceId: "ps03-dev", timestamp: "2025-07-03T10:32:00Z", turbidity: 4.8 }, // Normal (<=5)
];

// --- UPDATED --- Add alertsHistory and recentlyDeletedHistory to our initial state
const initialState = {
    activeAlerts: [],
    recentAlerts: [],
    alertsHistory: [], // The permanent storage
    recentlyDeletedHistory: [], // CHANGE: Added state to hold history alerts for the undo action
};

// =================================================================================
// ALERTS REDUCER
// =================================================================================
function alertsReducer(state, action) {
    switch (action.type) {
    case 'PROCESS_READING': {
        const { reading, alertIdCounter } = action.payload;
        const potentialAlerts = evaluateSensorReading(reading);
        let nextActiveAlerts = [...state.activeAlerts];
        const alertsToArchive = [];

        potentialAlerts.forEach(newAlertData => {
        const existingAlertIndex = nextActiveAlerts.findIndex(a => a.originator === newAlertData.originator && a.parameter === newAlertData.parameter);
        const existingAlert = existingAlertIndex !== -1 ? nextActiveAlerts[existingAlertIndex] : null;
        const isNewStatusNormal = newAlertData.severity === 'Normal';

        if (existingAlert) {
            // An alert for this device/parameter already exists. Decide what to do.
            if (isNewStatusNormal) {
            // The new status is 'Normal'.
            if (!existingAlert.isBackToNormal) {
                // If the existing alert was a real problem (not already a 'Normal' message), resolve it.
                alertsToArchive.push({ ...existingAlert, status: 'Resolved' });
                alertIdCounter.current++;
                const backToNormalAlert = {
                id: alertIdCounter.current,
                type: `${newAlertData.parameter} is back to normal`,
                isBackToNormal: true,
                dateTime: IS_SIMULATION_MODE ? new Date().toISOString() : new Date(reading.timestamp).toISOString(),
                originator: newAlertData.originator,
                parameter: newAlertData.parameter,
                severity: 'Normal',
                status: 'Active',
                acknowledged: false
                };
                nextActiveAlerts.splice(existingAlertIndex, 1, backToNormalAlert);
                action.timers.start(backToNormalAlert.id);
            }
            } else {
            // The new status is a problem (Warning or Critical).
            if (existingAlert.severity !== newAlertData.severity) {
                alertsToArchive.push({ ...existingAlert, status: 'Escalated' });
                alertIdCounter.current++;
                const newAlert = {
                ...newAlertData,
                id: alertIdCounter.current,
                acknowledged: false,
                dateTime: IS_SIMULATION_MODE ? new Date().toISOString() : new Date(reading.timestamp).toISOString()
                };
                nextActiveAlerts.splice(existingAlertIndex, 1, newAlert);
            }
            }
        } else if (!isNewStatusNormal) {
            // No alert exists, and the new status is a problem. Create a new alert.
            alertIdCounter.current++;
            const newAlert = {
            ...newAlertData,
            id: alertIdCounter.current,
            acknowledged: false,
            dateTime: IS_SIMULATION_MODE ? new Date().toISOString() : new Date(reading.timestamp).toISOString()
            };
            nextActiveAlerts.push(newAlert);
        }
        });

        if (alertsToArchive.length > 0 || nextActiveAlerts.length !== state.activeAlerts.length) {
        return { ...state, activeAlerts: nextActiveAlerts, recentAlerts: [...alertsToArchive, ...state.recentAlerts] };
        }
        return state;
    }

    case 'ACKNOWLEDGE_ALERT': {
        const { alertId } = action.payload;
        const alertToAck = state.activeAlerts.find(a => a.id === alertId);
        if (!alertToAck) return state;

        if (alertToAck.isBackToNormal) {
        action.timers.clear(alertId);
        return {
            ...state,
            activeAlerts: state.activeAlerts.filter(a => a.id !== alertId),
            recentAlerts: [{ ...alertToAck, status: 'Cleared', acknowledged: true }, ...state.recentAlerts]
        };
        }

        const nextActiveAlerts = state.activeAlerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
        );
        return { ...state, activeAlerts: nextActiveAlerts };
    }

    case 'AUTO_CLEAR_NORMAL_ALERT': {
        const { alertId } = action.payload;
        const alertToClear = state.activeAlerts.find(a => a.id === alertId);

        if (!alertToClear || !alertToClear.isBackToNormal) {
        return state;
        }

        return {
        ...state,
        activeAlerts: state.activeAlerts.filter(a => a.id !== alertId),
        recentAlerts: [{ ...alertToClear, status: 'Cleared' }, ...state.recentAlerts]
        };
    }

    case 'ARCHIVE_RECENT_ALERTS': {
        const { currentTime, archiveInterval } = action.payload;
        if (!state.recentAlerts || state.recentAlerts.length === 0) return state;

        const alertsToKeep = [];
        const alertsToMove = [];
        state.recentAlerts.forEach(alert => {
        const alertTime = new Date(alert.dateTime).getTime();
        if ((currentTime - alertTime) > archiveInterval) {
            alertsToMove.push(alert);
        } else {
            alertsToKeep.push(alert);
        }
        });

        if (alertsToMove.length === 0) return state;

        return {
        ...state,
        recentAlerts: alertsToKeep,
        alertsHistory: [...state.alertsHistory, ...alertsToMove],
        };
    }

    case 'DELETE_HISTORY_ALERTS': {
        const { idsToDelete } = action.payload;
        const remainingAlerts = [];
        const deletedAlerts = [];

        state.alertsHistory.forEach(alert => {
        if (idsToDelete.has(alert.id)) {
            deletedAlerts.push(alert);
        } else {
            remainingAlerts.push(alert);
        }
        });

        if (deletedAlerts.length === 0) return state;

        return {
        ...state,
        alertsHistory: remainingAlerts,
        recentlyDeletedHistory: deletedAlerts,
        };
    }

    case 'RESTORE_HISTORY_ALERTS': {
        if (state.recentlyDeletedHistory.length === 0) return state;

        return {
        ...state,
        alertsHistory: [...state.alertsHistory, ...state.recentlyDeletedHistory],
        recentlyDeletedHistory: [],
        };
    }

    default:
        return state;
    }
    }

    //Notification sound function
    function playNotificationSound() {
    const audio = new Audio('/Notification.mp3'); 
    
    // The play() method returns a promise. We need to handle potential errors.
    const playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise.catch(error => {
            // This error often happens if the user hasn't interacted with the page yet.
            console.warn("Could not play notification sound automatically. User interaction may be required.", error);
        });
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

  // --- State Management ---
    // Holds all alert data and the function to change it.
    const [alertsState, dispatch] = useReducer(alertsReducer, initialState);
    const { activeAlerts, recentAlerts, alertsHistory } = alertsState;

    // --- NEW --- State for the configurable archive interval.
    // Default is 24 hours in milliseconds. Change this for testing!
    // For example, set to 60000 (1 minute) to see alerts move quickly.
    const [archiveInterval, setArchiveInterval] = useState(60000); // Set to 60 seconds for testing

    // State for non-alert components like the map and pumping stations.
    const [deviceLocations, setDeviceLocations] = useState([]);
    const [pumpingStations, setPumpingStations] = useState([]);
    const [selectedMapDeviceId, setSelectedMapDeviceId] = useState(null);
    const [refocusTrigger, setRefocusTrigger] = useState(0);

    // State for the device filters in Active and Recent alerts.
    const [activeFilterDevice, setActiveFilterDevice] = useState('All Devices');
    const [recentFilterDevice, setRecentFilterDevice] = useState('All Devices');

    // Refs to hold values that don't need to trigger re-renders.
    const alertIdCounter = useRef(0);
    const [latestReading, setLatestReading] = useState(null);

    // --- FIX --- Re-introducing the timer management
    const backToNormalTimers = useRef(new Map());

    // --- MODIFIED: Animation state management is updated for stability ---
    const [newlyAddedId, setNewlyAddedId] = useState(null);
    const maxSeenId = useRef(0); // Use a ref to prevent re-render cycles


     // --- This useEffect now calls the new sound function ---
    useEffect(() => {
        if (!activeAlerts || activeAlerts.length === 0) return;
        const currentMaxId = Math.max(0, ...activeAlerts.map(a => a.id));

        if (currentMaxId > maxSeenId.current) {
            const newAlert = activeAlerts.find(a => a.id === currentMaxId);
            
            // Only play the sound for "real" alerts, not for "back to normal" messages
            if (newAlert && !newAlert.isBackToNormal) {
                playNotificationSound();
            }
            
            setNewlyAddedId(currentMaxId);
            maxSeenId.current = currentMaxId;
        }
    }, [activeAlerts]);

    // --- ADDED --- A handler to allow child components to signal animation completion
    const handleAnimationComplete = () => {
        setNewlyAddedId(null);
    };


    // --- Timer Management ---
    // These functions start and stop the 10-second timer for "Back to Normal" alerts.

    const startTimer = (alertId) => {
        const timerId = setTimeout(() => {
            // --- FIX --- The timer now dispatches the new, non-acknowledging action
            dispatch({ type: 'AUTO_CLEAR_NORMAL_ALERT', payload: { alertId } });
        }, 10000); // 10-second timer for "back to normal" alerts
        backToNormalTimers.current.set(alertId, timerId);
    };

    const clearTimer = (alertId) => {
        if (backToNormalTimers.current.has(alertId)) {
            clearTimeout(backToNormalTimers.current.get(alertId));
            backToNormalTimers.current.delete(alertId);
        }
    };

    // --- useEffect Hooks for Simulation and Timers ---

    // This hook runs ONCE to initialize the app and start the main simulation timer.
    useEffect(() => {
        setDeviceLocations(FAKE_API_DATA);
        setPumpingStations(FAKE_STATIONS_DATA);
        let readingIndex = 0;
        const intervalId = setInterval(() => {
            if (readingIndex < MOCK_SENSOR_READINGS.length) {
                setLatestReading(MOCK_SENSOR_READINGS[readingIndex++]);
            } else {
                clearInterval(intervalId);
            }
        }, 10000); // New sensor reading every 5 seconds

        return () => {
            clearInterval(intervalId);
            // --- FIX --- Ensure all timers are cleared on unmount
            backToNormalTimers.current.forEach(timerId => clearTimeout(timerId));
        };
    }, []);

    // This hook runs whenever a new sensor reading is available, dispatching it to the reducer.
    useEffect(() => {
        if (latestReading) {
            // --- FIX --- Pass the timer functions to the reducer
            dispatch({
                type: 'PROCESS_READING',
                payload: { reading: latestReading, alertIdCounter },
                timers: { start: startTimer }
            });
        }
    }, [latestReading]);

    // --- NEW --- Timer to periodically check and archive old alerts
    useEffect(() => {
        // Run this check every minute
        const archiveTimer = setInterval(() => {
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

    // --- Event Handlers ---
    // These functions are passed down to child components to allow them to trigger state changes.
    const handleAcknowledgeAlert = (alertId) => {
        // --- FIX --- Pass the timer functions to the reducer
        dispatch({
            type: 'ACKNOWLEDGE_ALERT',
            payload: { alertId },
            timers: { clear: clearTimer }
        });
    };

    // CHANGE: Added handler to delete history alerts
    const handleDeleteHistoryAlerts = (idsToDelete) => {
        dispatch({
            type: 'DELETE_HISTORY_ALERTS',
            payload: { idsToDelete },
        });
    };

    // CHANGE: Added handler to restore history alerts
    const handleRestoreHistoryAlerts = () => {
        dispatch({ type: 'RESTORE_HISTORY_ALERTS' });
    };

    const handleActiveFilterChange = (e) => setActiveFilterDevice(e.target.value);
    const handleRecentFilterChange = (e) => setRecentFilterDevice(e.target.value);
    const handleSelectDevice = (deviceId) => {
        setSelectedMapDeviceId(deviceId);
        setRefocusTrigger(p => p + 1);
    };
    const handleAddDevice = (newDevice) => {
        setDeviceLocations(p => [...p, newDevice]);
        setSelectedMapDeviceId(newDevice.id);
    };
    const handleDeleteDevice = (deviceId) => {
        setDeviceLocations(p => p.filter(d => d.id !== deviceId));
        setSelectedMapDeviceId(null);
    };
    const handleSaveStations = (updatedStations) => {
        setPumpingStations(updatedStations);
    };

    // --- Context Value ---
    // This object bundles all the necessary state and functions to be provided to the app.
    const contextValue = {
        activeAlerts,
        recentAlerts,
        alertsHistory,
        devices: deviceLocations,
        pumpingStations,
        activeFilterDevice,
        handleActiveFilterChange,
        recentFilterDevice,
        handleRecentFilterChange,
        onAcknowledgeAlert: handleAcknowledgeAlert,
        // CHANGE: Added delete and restore functions to context
        onDeleteHistoryAlerts: handleDeleteHistoryAlerts,
        onRestoreHistoryAlerts: handleRestoreHistoryAlerts,
        onSelectMapDevice: handleSelectDevice,
        onAddDevice: handleAddDevice,
        onDeleteDevice: handleDeleteDevice,
        onSaveStations: handleSaveStations,
        selectedMapDeviceId,
        refocusTrigger,
        newlyAddedId,
        onAnimationComplete: handleAnimationComplete
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
              <Route
              path="/alerts"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <Alerts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/devices"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <Devices />
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