// App.jsx
import React, { useState, useEffect, useReducer, useRef } from 'react';
// UPDATED: Import useLocation. The Router component is expected to be in a higher-level file like main.jsx or index.js
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';

import Login from './Components/Login';
import Dashboard from './Components/Dashboard/Dashboard';
import Header from './Components/Navigation-Header/Header';
import Navigation from './Components/Navigation-Header/Navigation';
import Overview from "./Components/Overview/Overview";
import Devices from './Components/Devices/Devices'
import Alerts from './Components/Alerts/Alerts';
import Configuration from './Components/Configuration/Configurations'
import AlertsContext from './utils/AlertsContext';
import ProtectedRoute from './Components/Auth/ProtectedRoute';
import { evaluateSensorReading } from './utils/SensorLogic';
import SpecificDevice from './Components/Devices/SpecificDevice/SpecificDevice';
import Logs from './Components/WebLogs/Logs';
// NEW: Import the AccountSettings component
import AccountSettings from './Components/AccountSettings/AccountSettings';

// =================================================================================
// CONFIGURATION
// =================================================================================
const IS_SIMULATION_MODE = true;

// =================================================================================
// NEW: SIMULATED CURRENT USER
// =================================================================================
const CURRENT_USER = {
    name: 'John Doe',
    role: 'System Operator'
};

// =================================================================================
// MOCK DATA AND INITIAL STATE
// =================================================================================

const FAKE_API_DATA = [
    {
        id: 'ps01-dev',
        label: 'PS01-DEV',
        position: [15.6033, 120.6010],
        location: 'Brgy. Abagon, Gerona, Tarlac',
        status: 'Online',
        configurations: {
            ph: { warnLow: 6.4, critLow: 6.0, warnHigh: 8.6, critHigh: 9.0, normalLow: 6.5, normalHigh: 8.5 },
            turbidity: { warn: 5, crit: 10, normalLow: 0, normalHigh: 5 },
            tds: { warn: 500, crit: 1000, normalLow: 0, normalHigh: 500 },
            temp: { warnLow: 5, critLow: 0, warnHigh: 31, critHigh: 35, normalLow: 10, normalHigh: 30 },
            valveShutOff: { phLow: 5.9, phHigh: 9.1, turbidityCrit: 13, tdsCrit: 1200 },
            alertLoggingIntervals: { activeToRecent: 30, recentToHistory: 5 },
            testingIntervals: { drain: 3, delay: 1, fill: 3 }
        },
        // ADDED MOCK HISTORY AND READINGS for SpecificDevice
        history: {
            time: ["10:00", "10:15", "10:30", "10:45", "11:00"],
            readings: {
                pH: [7.5, 7.6, 7.4, 7.7, 7.5],
                turbidity: [3.0, 3.2, 3.1, 3.0, 3.3],
                tds: [250, 255, 248, 252, 260],
                temp: [25.0, 25.1, 24.9, 25.2, 25.0]
            }
        },
        alerts: [
            { type: "pH Warning", status: "Active", time: "10:40", value: 8, unit: 'pH'},
            { type: "Temperature High", status: "Critical", time: "10:55", value: 40, unit: '°C'},
            { type: "TDS Critical", status: "Critical", time: "11:05", value: 750, unit: 'ppm'},
        ],
        readings: { // Current readings for SpecificReadings component
            ph: 7.5,
            turbidity: 3.1,
            tds: 250,
            temp: 25.0
        }
    },
    {
        id: 'ps02-dev',
        label: 'PS02-DEV',
        position: [15.6115, 120.5935],
        location: 'Brgy. Apsayan, Gerona, Tarlac',
        status: 'Online',
        configurations: {
            ph: { warnLow: 6.5, critLow: 6.1, warnHigh: 8.5, critHigh: 8.9, normalLow: 6.5, normalHigh: 8.5 },
            turbidity: { warn: 6, crit: 12, normalLow: 0, normalHigh: 5 },
            tds: { warn: 600, crit: 1100, normalLow: 0, normalHigh: 500 },
            temp: { warnLow: 6, critLow: 1, warnHigh: 32, critHigh: 36, normalLow: 10, normalHigh: 30 },
            valveShutOff: { phLow: 6.0, phHigh: 9.0, turbidityCrit: 15, tdsCrit: 1300 },
            alertLoggingIntervals: { activeToRecent: 40, recentToHistory: 5 },
            testingIntervals: { drain: 4, delay: 2, fill: 4 }
        },
        history: {
            time: ["10:00", "10:15", "10:30", "10:45", "11:00"],
            readings: {
                pH: [7.0, 7.1, 7.2, 7.0, 7.1],
                turbidity: [4.0, 4.1, 4.0, 4.2, 4.0],
                tds: [300, 305, 302, 308, 300],
                temp: [26.0, 26.1, 26.0, 26.2, 26.0]
            }
        },
        alerts: [
            { type: "TDS Critical", status: "Resolved", time: "10:20" , value: 900, unit: 'ppm'}
        ],
        readings: {
            ph: 7.1,
            turbidity: 4.1,
            tds: 305,
            temp: 26.1
        }
    },
    {
        id: 'ps03-dev',
        label: 'PS03-DEV',
        position: [15.6250, 120.6050],
        location: 'Brgy. Buenlag, Gerona, Tarlac',
        status: 'Offline',
        configurations: {
            ph: { warnLow: 6.3, critLow: 5.9, warnHigh: 8.7, critHigh: 9.1, normalLow: 6.5, normalHigh: 8.5 },
            turbidity: { warn: 4, crit: 8, normalLow: 0, normalHigh: 5 },
            tds: { warn: 450, crit: 950, normalLow: 0, normalHigh: 500 },
            temp: { warnLow: 4, critLow: -1, warnHigh: 30, critHigh: 34, normalLow: 10, normalHigh: 30 },
            valveShutOff: { phLow: 5.8, phHigh: 9.2, turbidityCrit: 10, tdsCrit: 1150 },
            alertLoggingIntervals: { activeToRecent: 50, recentToHistory: 5 },
            testingIntervals: { drain: 2, delay: 1, fill: 2 }
        },
        history: {
            time: ["10:00", "10:15", "10:30", "10:45", "11:00"],
            readings: {
                pH: [6.8, 6.7, 6.9, 6.8, 6.7],
                turbidity: [5.0, 5.1, 5.0, 5.2, 5.0],
                tds: [350, 355, 352, 358, 350],
                temp: [24.0, 24.1, 24.0, 24.2, 24.0]
            }
        },
        alerts: [
            { type: "Device Offline", status: "Active", time: "10:00", value: 0, unit:'' }
        ],
        readings: {
            ph: 6.7,
            turbidity: 5.1,
            tds: 355,
            temp: 24.1
        }
    },
];

const FAKE_STATIONS_DATA = [
    { id: 1, label: 'Pumping Station 1', location: 'Brgy. Bagong Bayan, Gerona, Tarlac', operation: 'On-going' }
];

const MOCK_SENSOR_READINGS = [
  // ... (your existing MOCK_SENSOR_READINGS - ensure deviceIds match FAKE_API_DATA)
  { deviceId: "ps01-dev", timestamp: "2025-07-03T10:00:00Z", pH: 7.6, turbidity: 4.1 },
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:01:00Z", temp: 28.5, tds: 450 },

  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:05:00Z", tds: 850 },
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:06:00Z", tds: 1250 },
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:07:00Z", tds: 480 },

  { deviceId: "ps01-dev", timestamp: "2025-07-03T10:10:00Z", temp: 34.5 },
  { deviceId: "ps01-dev", timestamp: "2025-07-03T10:11:00Z", temp: 36.2 },

  { deviceId: "ps01-dev", timestamp: "2025-07-03T10:15:00Z", temp: 8.5 },
  { deviceId: "ps01-dev", timestamp: "2025-07-03T10:16:00Z", temp: 4.1 },
  { deviceId: "ps01-dev", timestamp: "2025-07-03T10:17:00Z", temp: 25.0 },

  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:19:00Z", pH: 6.5 },
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:20:00Z", pH: 8.8 },
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:21:00Z", pH: 9.3 },
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:22:00Z", pH: 8.1 },
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:25:00Z", pH: 6.3 },
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:26:00Z", pH: 5.8 },
  { deviceId: "ps02-dev", timestamp: "2025-07-03T10:22:00Z", pH: 6.6 },

  { deviceId: "ps03-dev", timestamp: "2025-07-03T10:30:00Z", turbidity: 15.5 },
  { deviceId: "ps03-dev", timestamp: "2025-07-03T10:31:00Z", turbidity: 9.8 },
  { deviceId: "ps03-dev", timestamp: "2025-07-03T10:32:00Z", turbidity: 4.8 },
];

const initialState = {
    activeAlerts: [],
    recentAlerts: [],
    alertsHistory: [],
    recentlyDeletedHistory: [],
};

function alertsReducer(state, action) {
    switch (action.type) {
    case 'PROCESS_READING': {
        const { reading, alertIdCounter } = action.payload;
        const potentialAlerts = evaluateSensorReading(reading);
        let nextActiveAlerts = [...state.activeAlerts];
        const alertsToArchive = [];

        potentialAlerts.forEach(newAlertData => {
            const existingAlertIndex = nextActiveAlerts.findIndex(a =>
                a.originator === newAlertData.originator &&
                a.parameter === newAlertData.parameter
            );
            const existingAlert = existingAlertIndex !== -1 ? nextActiveAlerts[existingAlertIndex] : null;

            const isNewStatusNormal = newAlertData.severity === 'Normal';

            if (existingAlert) {
                if (isNewStatusNormal) {
                    if (!existingAlert.isBackToNormal) {
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
        const { alertId, user, timestamp } = action.payload;
        const alertToAck = state.activeAlerts.find(a => a.id === alertId);
        if (!alertToAck) return state;

        const acknowledgedByInfo = {
            name: user.name,
            timestamp: timestamp
        };

        if (alertToAck.isBackToNormal) {
            action.timers.clear(alertId);
            return {
                ...state,
                activeAlerts: state.activeAlerts.filter(a => a.id !== alertId),
                recentAlerts: [{
                    ...alertToAck,
                    status: 'Cleared',
                    acknowledged: true,
                    acknowledgedBy: acknowledgedByInfo
                }, ...state.recentAlerts]
            };
        }

        const nextActiveAlerts = state.activeAlerts.map(alert =>
            alert.id === alertId ? {
                ...alert,
                acknowledged: true,
                acknowledgedBy: acknowledgedByInfo
            } : alert
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

function playNotificationSound() {
    const audio = new Audio('/Notification.mp3');
    const playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.warn("Could not play notification sound automatically. User interaction may be required.", error);
        });
    }
}

// UPDATED: The App component now uses the useLocation hook to conditionally render navigation.
// It is no longer split into App and AppLayout.
function App() {
    // NEW: useLocation hook to get the current URL path.
    const location = useLocation();
    
    // NEW: An array of paths where the Header and Navigation should NOT be displayed.
    const noNavPaths = ['/login', '/account-settings'];
    
    // UPDATED: We now have two separate checks for the header and the sidebar navigation.
    const noHeaderPaths = ['/login']; // Only hide header on the login page.
    const noSidebarPaths = ['/login', '/account-settings']; // Hide sidebar on login AND account settings.

    const showHeader = !noHeaderPaths.includes(location.pathname);
    const showSidebar = !noSidebarPaths.includes(location.pathname);

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    // NEW STATE: To hold the device label for the header
    const [headerDeviceLabel, setHeaderDeviceLabel] = useState(null);

    const handleLogin = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
    };

    const [alertsState, dispatch] = useReducer(alertsReducer, initialState);
    const { activeAlerts, recentAlerts, alertsHistory } = alertsState;

    const [archiveInterval, setArchiveInterval] = useState(60000);
    const [deviceLocations, setDeviceLocations] = useState(FAKE_API_DATA);
    const [pumpingStations, setPumpingStations] = useState(FAKE_STATIONS_DATA);
    const [selectedMapDeviceId, setSelectedMapDeviceId] = useState(null);
    const [refocusTrigger, setRefocusTrigger] = useState(0);

    const [activeFilterDevice, setActiveFilterDevice] = useState('All Devices');
    const [recentFilterDevice, setRecentFilterDevice] = useState('All Devices');

    const alertIdCounter = useRef(0);
    const [latestReading, setLatestReading] = useState(null);

    const backToNormalTimers = useRef(new Map());

    const [newlyAddedId, setNewlyAddedId] = useState(null);
    const maxSeenId = useRef(0);

    useEffect(() => {
        if (!activeAlerts || activeAlerts.length === 0) return;
        const currentMaxId = Math.max(0, ...activeAlerts.map(a => a.id));

        if (currentMaxId > maxSeenId.current) {
            const newAlert = activeAlerts.find(a => a.id === currentMaxId);

            if (newAlert && !newAlert.isBackToNormal) {
                playNotificationSound();
            }

            setNewlyAddedId(currentMaxId);
            maxSeenId.current = currentMaxId;
        }
    }, [activeAlerts]);

    const handleAnimationComplete = () => {
        setNewlyAddedId(null);
    };

    const startTimer = (alertId) => {
        const timerId = setTimeout(() => {
            dispatch({ type: 'AUTO_CLEAR_NORMAL_ALERT', payload: { alertId } });
        }, 10000);
        backToNormalTimers.current.set(alertId, timerId);
    };

    const clearTimer = (alertId) => {
        if (backToNormalTimers.current.has(alertId)) {
            clearTimeout(backToNormalTimers.current.get(alertId));
            backToNormalTimers.current.delete(alertId);
        }
    };

    useEffect(() => {
        setPumpingStations(FAKE_STATIONS_DATA);
        let readingIndex = 0;
        const intervalId = setInterval(() => {
            if (readingIndex < MOCK_SENSOR_READINGS.length) {
                setLatestReading(MOCK_SENSOR_READINGS[readingIndex++]);
            } else {
                clearInterval(intervalId);
            }
        }, 10000);

        return () => {
            clearInterval(intervalId);
            backToNormalTimers.current.forEach(timerId => clearTimeout(timerId));
        };
    }, []);

    useEffect(() => {
        if (latestReading) {
            setDeviceLocations(prevDevices =>
                prevDevices.map(device =>
                    device.id === latestReading.deviceId
                        ? { ...device, readings: { ...device.readings, ...latestReading } }
                        : device
                )
            );

            dispatch({
                type: 'PROCESS_READING',
                payload: { reading: latestReading, alertIdCounter },
                timers: { start: startTimer }
            });
        }
    }, [latestReading]);

    useEffect(() => {
        const archiveTimer = setInterval(() => {
            dispatch({
                type: 'ARCHIVE_RECENT_ALERTS',
                payload: {
                    currentTime: Date.now(),
                    archiveInterval: archiveInterval,
                }
            });
        }, 60000);

        return () => clearInterval(archiveTimer);
    }, [archiveInterval]);

    const handleAcknowledgeAlert = (alertId) => {
        dispatch({
            type: 'ACKNOWLEDGE_ALERT',
            payload: {
                alertId,
                user: CURRENT_USER,
                timestamp: new Date().toISOString()
            },
            timers: { clear: clearTimer }
        });
    };

    const handleDeleteHistoryAlerts = (idsToDelete) => {
        dispatch({
            type: 'DELETE_HISTORY_ALERTS',
            payload: { idsToDelete },
        });
    };

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

    const handleSaveConfiguration = (deviceId, newConfigs) => {
        console.log(`Simulating save for ${deviceId}:`, newConfigs);
        return new Promise((resolve) => {
            setTimeout(() => {
                setDeviceLocations(prevDevices =>
                    prevDevices.map(device =>
                        device.id === deviceId
                            ? { ...device, configurations: newConfigs }
                            : device
                    )
                );
                resolve();
            }, 1000);
        });
    };

    // --- Context Value ---
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
        onDeleteHistoryAlerts: handleDeleteHistoryAlerts,
        onRestoreHistoryAlerts: handleRestoreHistoryAlerts,
        onSelectMapDevice: handleSelectDevice,
        onAddDevice: handleAddDevice,
        onDeleteDevice: handleDeleteDevice,
        onSaveStations: handleSaveStations,
        selectedMapDeviceId,
        refocusTrigger,
        newlyAddedId,
        onAnimationComplete: handleAnimationComplete,
        onSaveConfiguration: handleSaveConfiguration,
    };

    return (
        <AlertsContext.Provider value={contextValue}>
            {/* UPDATED: Conditionally render Header and Navigation based on the new booleans */}
            {isAuthenticated && showHeader && <Header onLogout={handleLogout} deviceLabelForHeader={headerDeviceLabel} />}
            {isAuthenticated && showSidebar && <Navigation />}
            <main>
                <Routes>
                    <Route path="/login" element={<Login onLogin={handleLogin} />} />

                    {/* NEW: Add the route for the AccountSettings page */}
                    <Route
                        path="/account-settings"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <AccountSettings />
                            </ProtectedRoute>
                        }
                    />

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
                    <Route path="/configurations"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <Configuration />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/devices/:deviceId"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                {/* Pass the setHeaderDeviceLabel function to SpecificDevice */}
                                <SpecificDevice onSetHeaderDeviceLabel={setHeaderDeviceLabel} />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/logs"
                        element = {
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <Logs />
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
