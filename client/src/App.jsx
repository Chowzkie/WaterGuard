import React, { useState, useEffect, useReducer, useRef, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios'; // Import Axios
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
import AccountSettings from './Components/AccountSettings/AccountSettings';
import AdminPanel from './Components/Admin/AdminPanel';

// =================================================================================
// CONFIGURATION
// =================================================================================
// Set to 'true' to use the current browser time for new alerts (for simulation).
// Set to 'false' to use the timestamp from the sensor data (for real-world application).
const IS_SIMULATION_MODE = true;

// =================================================================================
// NEW: SIMULATED CURRENT USER
// =================================================================================
const CURRENT_USER = {
    name: 'John Doe',
    role: 'System Operator'
};

// Define your backend API base URL
const API_BASE_URL = 'http://localhost:8080/api'; // Make sure this matches your backend port

// =================================================================================
// MOCK DATA AND INITIAL STATE (These are now fetched from backend)
// =================================================================================

const initialState = {
    activeAlerts: [],
    recentAlerts: [],
    alertsHistory: [],
    recentlyDeletedHistory: [],
};

// =================================================================================
// ALERTS REDUCER (No changes here, it uses the data that will be fetched)
// =================================================================================
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

// =================================================================================
// APP COMPONENT
// =================================================================================
function App() {
    const location = useLocation();

    const noHeaderPaths = ['/login'];
    const noNavPaths = ['/login', '/account-settings', '/logs'];

    const showHeader = !noHeaderPaths.includes(location.pathname);
    const showSidebar = !noNavPaths.includes(location.pathname);

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loggedInUsername, setLoggedInUsername] = useState(null);
    const [headerDeviceLabel, setHeaderDeviceLabel] = useState(null);

    const handleLogin = (username) => {
        setIsAuthenticated(true);
        setLoggedInUsername(username); // Store the username
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setLoggedInUsername(null)
    };

    // --- State Management ---
    const [alertsState, dispatch] = useReducer(alertsReducer, initialState);
    const { activeAlerts, recentAlerts, alertsHistory } = alertsState;

    const [archiveInterval, setArchiveInterval] = useState(60000);

    // Initialize with empty arrays; data will be fetched
    const [deviceLocations, setDeviceLocations] = useState([]);
    const [pumpingStations, setPumpingStations] = useState([]);
    const [mockSensorReadings, setMockSensorReadings] = useState([]); // State for fetched sensor readings

    const [selectedMapDeviceId, setSelectedMapDeviceId] = useState(null);
    const [refocusTrigger, setRefocusTrigger] = useState(0);

    const [activeFilterDevice, setActiveFilterDevice] = useState('All Devices');
    const [recentFilterDevice, setRecentFilterDevice] = useState('All Devices');

    const alertIdCounter = useRef(0);
    const [latestReading, setLatestReading] = useState(null);

    const backToNormalTimers = useRef(new Map());

    const [newlyAddedId, setNewlyAddedId] = useState(null);
    const maxSeenId = useRef(0);

    const [assigneeList, setAssigneeList] = useState([]);

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
        }, 30000);
        backToNormalTimers.current.set(alertId, timerId);
    };

    const clearTimer = (alertId) => {
        if (backToNormalTimers.current.has(alertId)) {
            clearTimeout(backToNormalTimers.current.get(alertId));
            backToNormalTimers.current.delete(alertId);
        }
    };

    // --- NEW: useEffect for fetching initial data from backend ---
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [devicesRes, stationsRes, sensorReadingsRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/devices`),
                    axios.get(`${API_BASE_URL}/stations`),
                    axios.get(`${API_BASE_URL}/sensor-readings`)
                ]);

                setDeviceLocations(devicesRes.data);
                setPumpingStations(stationsRes.data);
                setMockSensorReadings(sensorReadingsRes.data); // Store fetched mock sensor readings
            } catch (error) {
                console.error("Error fetching initial data:", error);
                // Optionally set some default empty states or show an error message
            }
        };

        fetchInitialData();
    }, []); // Empty dependency array means this runs only once on component mount

    // This hook runs whenever a new sensor reading is available (now from fetched data).
    // It's modified to use the `mockSensorReadings` state.
    useEffect(() => {
        if (mockSensorReadings.length === 0) return; // Wait until mock readings are fetched

        let readingIndex = 0;
        const intervalId = setInterval(() => {
            if (readingIndex < mockSensorReadings.length) {
                setLatestReading(mockSensorReadings[readingIndex++]);
            } else {
                clearInterval(intervalId);
            }
        }, 10000); // New sensor reading every 10 seconds

        return () => {
            clearInterval(intervalId);
            backToNormalTimers.current.forEach(timerId => clearTimeout(timerId));
        };
    }, [mockSensorReadings]); // Depend on mockSensorReadings to start simulation after fetching


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

    // --- MODIFIED: handleAddDevice now sends data to the backend ---
    const handleAddDevice = async (newDevice) => {
        try {
            // In a real application, you'd send a POST request to add a new device
            // For this mock, we're just simulating it client-side.
            // If your backend had a /api/devices POST endpoint, it would look like this:
            // const response = await axios.post(`${API_BASE_URL}/devices`, newDevice);
            // setDeviceLocations(p => [...p, response.data]); // Use data returned from backend
            
            // For now, simulate client-side update as your backend doesn't have a POST route for this
            setDeviceLocations(p => [...p, newDevice]);
            setSelectedMapDeviceId(newDevice.id);
            console.log("Simulated adding new device:", newDevice);

        } catch (error) {
            console.error("Error adding device:", error);
        }
    };

    // --- MODIFIED: handleDeleteDevice now sends a DELETE request to the backend ---
    const handleDeleteDevice = async (deviceId) => {
        try {
            // In a real application, you'd send a DELETE request
            // const response = await axios.delete(`${API_BASE_URL}/devices/${deviceId}`);
            // console.log(response.data.message); // Log success message from backend

            // For now, simulate client-side update as your backend doesn't have a DELETE route for this
            setDeviceLocations(p => p.filter(d => d.id !== deviceId));
            setSelectedMapDeviceId(null);
            console.log("Simulated deleting device:", deviceId);

        } catch (error) {
            console.error("Error deleting device:", error);
        }
    };

    // --- MODIFIED: handleSaveStations now sends data to the backend ---
    const handleSaveStations = async (updatedStations) => {
        try {
            // In a real application, you'd send a PUT/POST request to update stations
            // For this mock, we're just simulating it client-side.
            // If your backend had a /api/stations PUT endpoint, it would look like this:
            // const response = await axios.put(`${API_BASE_URL}/stations`, updatedStations);
            // setPumpingStations(response.data); // Update with data returned from backend

            // For now, simulate client-side update
            setPumpingStations(updatedStations);
            console.log("Simulated saving stations:", updatedStations);

        } catch (error) {
            console.error("Error saving stations:", error);
        }
    };

    // --- MODIFIED: handleSaveConfiguration now sends a PUT request to the backend ---
    const handleSaveConfiguration = useCallback(async (deviceId, newConfigs) => {
        console.log(`Attempting to save for ${deviceId}:`, newConfigs);
        try {
            const response = await axios.put(`${API_BASE_URL}/devices/${deviceId}/configurations`, newConfigs);
            console.log(response.data.message, response.data.updatedDevice);

            // Update local state with the data confirmed by the backend
            setDeviceLocations(prevDevices =>
                prevDevices.map(device =>
                    device.id === deviceId
                        ? { ...device, configurations: response.data.updatedDevice.configurations }
                        : device
                )
            );
            return Promise.resolve(); // Indicate success
        } catch (error) {
            console.error("Error saving configuration:", error);
            // Optionally, handle error state in the UI
            return Promise.reject(error); // Indicate failure
        }
    }, []); // Dependencies for useCallback. If API_BASE_URL or setDeviceLocations can change, add them.

    useEffect(() => {
        if (alertsHistory && alertsHistory.length > 0) {
            const uniqueAssignees = [...new Set(
                alertsHistory
                    .map(alert => alert.acknowledgedBy?.name)
                    .filter(Boolean)
            )];
            setAssigneeList(uniqueAssignees);
        }
    }, [alertsHistory]);

    const contextValue = {
        activeAlerts,
        recentAlerts,
        alertsHistory,
        assigneeList,
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
            {isAuthenticated && showHeader && <Header onLogout={handleLogout} deviceLabelForHeader={headerDeviceLabel} username={loggedInUsername}/>}
            {isAuthenticated && showSidebar && <Navigation />}
            <main>
                <Routes>
                    <Route path="/login" element={<Login onLogin={handleLogin} />} />
                    <Route path="admin-panel" element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <AdminPanel />
                            </ProtectedRoute>
                        }
                    />
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