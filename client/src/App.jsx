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
import { userLogs as mockUserLogs } from './utils/LogsMockUp';

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
    username: 'John Doe',
    fullname: 'John Doe',
    role: 'System Operator'
};

// =================================================================================
// --- NEW LOGGING LOGIC ---
// =================================================================================
/**
 * A helper map to convert technical field names into human-readable labels for logs.
 */
const FIELD_NAME_MAP = {
    ph: "pH Level",
    turbidity: "Turbidity",
    tds: "TDS",
    temp: "Temperature",
    valveShutOff: "Valve Shut-off",
    alertLoggingIntervals: "Alert Logging Intervals",
    testingIntervals: "Testing Intervals",
    warnLow: "Warning Low",
    critLow: "Critical Low",
    warnHigh: "Warning High",
    critHigh: "Critical High",
    normalLow: "Back to Normal (Low)",
    normalHigh: "Back to Normal (High)",
    warn: "Warning Threshold",
    crit: "Critical Threshold",
    phLow: "pH Critical Low",
    phHigh: "pH Critical High",
    turbidityCrit: "Turbidity Critical Threshold",
    tdsCrit: "TDS Critical Threshold",
    activeToRecent: "Active to Recent",
    recentToHistory: "Recent to History",
    drain: "Draining Time",
    delay: "Delay before Filling",
    fill: "Filling Duration",
    autoReopenGlobal: "Auto Re-open Valve on Normal?"
};

// --- NEW: A map to associate fields and categories with their units ---
const FIELD_UNIT_MAP = {
    // Category-wide units
    ph: 'pH',
    turbidity: 'NTU',
    tds: 'mg/L',
    temp: '°C',
    // Field-specific units
    activeToRecent: 'seconds',
    recentToHistory: 'minutes',
    drain: 'minutes',
    delay: 'minutes',
    fill: 'minutes',
};

// --- NEW: Helper map for more readable user admin log messages ---
const USER_FIELD_MAP = {
    firstName: 'First Name',
    middleName: 'Middle Name',
    lastName: 'Last Name',
    username: 'Username',
    phone: 'Phone Number',
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
// ALERTS REDUCER
// =================================================================================
function alertsReducer(state, action) {
    switch (action.type) {
        // This case is the core of the alert generation logic. It processes each new sensor
        // reading and decides whether to create, update, or resolve an alert.
        case 'PROCESS_READING': {
            const { reading, alertIdCounter } = action.payload;
            // The evaluateSensorReading function returns potential alerts based on the reading.
            const potentialAlerts = evaluateSensorReading(reading);
            // Create a mutable copy of the current active alerts to work with.
            let nextActiveAlerts = [...state.activeAlerts];
            // An array to hold any alerts that need to be moved out of the active list.
            const alertsToArchive = [];

            // Iterate over each potential alert generated from the sensor reading.
            potentialAlerts.forEach(newAlertData => {
                // Check if an alert for the same device and parameter already exists.
                // This is crucial for preventing duplicate alerts.
                const existingAlertIndex = nextActiveAlerts.findIndex(a =>
                    a.originator === newAlertData.originator &&
                    a.parameter === newAlertData.parameter
                );
                const existingAlert = existingAlertIndex !== -1 ? nextActiveAlerts[existingAlertIndex] : null;

                // Determine if the new sensor reading indicates a 'Normal' state.
                const isNewStatusNormal = newAlertData.severity === 'Normal';

                if (existingAlert) {
                    // --- An alert for this parameter already exists. ---

                    if (isNewStatusNormal) {
                        // The parameter has returned to a normal state.
                        // We only act if the existing alert was a real problem, not already a "back to normal" message.
                        if (!existingAlert.isBackToNormal) {
                            // 1. Archive the original problem alert with a 'Resolved' status.
                            alertsToArchive.push({ ...existingAlert, status: 'Resolved' });

                            // 2. Create a new "back to normal" notification to inform the user.
                            alertIdCounter.current++;
                            const backToNormalAlert = {
                                id: alertIdCounter.current,
                                type: `${newAlertData.parameter} is back to normal`,
                                isBackToNormal: true, // Special flag for this type of notification.
                                dateTime: IS_SIMULATION_MODE ? new Date().toISOString() : new Date(reading.timestamp).toISOString(),
                                originator: newAlertData.originator,
                                parameter: newAlertData.parameter,
                                severity: 'Normal',
                                status: 'Active',
                                acknowledged: false
                            };

                            // 3. Replace the old problem alert with the new "back to normal" notification in the active list.
                            nextActiveAlerts.splice(existingAlertIndex, 1, backToNormalAlert);
                            
                            // 4. Start the auto-clear timer for this notification.
                            action.timers.start(backToNormalAlert.id);
                        }
                    } else {
                        // The new reading indicates a continued or new problem (Warning or Critical).
                        // We only update if the severity level has changed (e.g., from Warning to Critical).
                        if (existingAlert.severity !== newAlertData.severity) {
                            // 1. Archive the previous alert with an 'Escalated' status.
                            // This applies even if the previous alert was a "back to normal" message.
                            alertsToArchive.push({ ...existingAlert, status: 'Escalated' });
                            
                            // 2. Create the new, more severe alert.
                            alertIdCounter.current++;
                            const newAlert = {
                                ...newAlertData,
                                id: alertIdCounter.current,
                                acknowledged: false,
                                dateTime: IS_SIMULATION_MODE ? new Date().toISOString() : new Date(reading.timestamp).toISOString()
                            };

                            // 3. Replace the old alert with the new one in the active list.
                            nextActiveAlerts.splice(existingAlertIndex, 1, newAlert);
                        }
                    }
                } else if (!isNewStatusNormal) {
                    // --- No alert exists for this parameter, and the new reading is a problem. ---
                    // This is the simplest case: create a brand new alert.
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

            // If any changes were made, update the state.
            if (alertsToArchive.length > 0 || nextActiveAlerts.length !== state.activeAlerts.length) {
                return { ...state, activeAlerts: nextActiveAlerts, recentAlerts: [...alertsToArchive, ...state.recentAlerts] };
            }
            // If no changes occurred, return the original state to avoid unnecessary re-renders.
            return state;
        }

        // This case handles a user manually acknowledging any active alert.
        case 'ACKNOWLEDGE_ALERT': {
            const { alertId, user, timestamp } = action.payload;
            const alertToAck = state.activeAlerts.find(a => a.id === alertId);

            // If the alert doesn't exist (e.g., was cleared by the system first), do nothing.
            if (!alertToAck) return state;

            // Prepare the acknowledgment information object.
            const acknowledgedByInfo = {
                name: user.username,
                timestamp: timestamp
            };

            // This logic now applies to ALL active alerts, including "back to normal" messages.
            // It maps over the active alerts, finds the one with the matching ID, and updates it.
            const nextActiveAlerts = state.activeAlerts.map(alert =>
                alert.id === alertId ? {
                    ...alert,
                    acknowledged: true,          // Set the acknowledged flag to true.
                    acknowledgedBy: acknowledgedByInfo // Stamp the user and time information.
                } : alert
            );

            // Return the new state with the updated active alerts list. The alert remains
            // in the active list until it is resolved or cleared by another action.
            return { ...state, activeAlerts: nextActiveAlerts };
        }

        // This case is triggered ONLY by the timer set for "back to normal" alerts.
        // It automatically moves the notification from the active list to the recent list.
        case 'AUTO_CLEAR_NORMAL_ALERT': {
            const { alertId } = action.payload;
            const alertToClear = state.activeAlerts.find(a => a.id === alertId);

            // If the alert is not found or is not a "back to normal" alert, do nothing.
            // This is a safeguard against race conditions.
            if (!alertToClear || !alertToClear.isBackToNormal) {
                return state;
            }

            // Move the alert from the active list to the recent list.
            return {
                ...state,
                // Filter the alert out of the active list.
                activeAlerts: state.activeAlerts.filter(a => a.id !== alertId),
                // Add the alert to the beginning of the recent list with a final 'Cleared' status.
                // Its acknowledged status (true or false) is preserved from its time in the active list.
                recentAlerts: [{ ...alertToClear, status: 'Cleared' }, ...state.recentAlerts]
            };
        }

        // This case handles the periodic archiving of old alerts. It runs on a timer (e.g., every minute).
        case 'ARCHIVE_RECENT_ALERTS': {
            const { currentTime, archiveInterval } = action.payload;
            // If there are no recent alerts to check, do nothing.
            if (!state.recentAlerts || state.recentAlerts.length === 0) return state;

            const alertsToKeep = [];    // To hold alerts that are not old enough to be archived.
            const alertsToMove = [];    // To hold alerts that are old and ready for permanent history.

            // Sort through the recent alerts based on their timestamp.
            state.recentAlerts.forEach(alert => {
                const alertTime = new Date(alert.dateTime).getTime();
                // If the time elapsed since the alert was created is greater than the interval, move it.
                if ((currentTime - alertTime) > archiveInterval) {
                    alertsToMove.push(alert);
                } else {
                    alertsToKeep.push(alert);
                }
            });

            // If no alerts were old enough to be moved, return the original state.
            if (alertsToMove.length === 0) return state;

            // Return the new state with the updated lists.
            return {
                ...state,
                recentAlerts: alertsToKeep, // The new, shorter list of recent alerts.
                alertsHistory: [...state.alertsHistory, ...alertsToMove], // Add the moved alerts to the permanent history.
            };
        }

        // This case handles the permanent deletion of alerts from the history log.
        case 'DELETE_HISTORY_ALERTS': {
            const { idsToDelete } = action.payload; // A Set of alert IDs to be deleted.
            const remainingAlerts = []; // Alerts that will remain in history.
            const deletedAlerts = [];   // A temporary copy of the alerts being deleted for the undo feature.

            // Partition the history alerts into two groups: remaining and deleted.
            state.alertsHistory.forEach(alert => {
                if (idsToDelete.has(alert.id)) {
                    deletedAlerts.push(alert);
                } else {
                    remainingAlerts.push(alert);
                }
            });

            // If for some reason no alerts matched the IDs, do nothing.
            if (deletedAlerts.length === 0) return state;

            // Update the state with the new history and store the deleted items.
            return {
                ...state,
                alertsHistory: remainingAlerts,
                recentlyDeletedHistory: deletedAlerts, // This enables the "undo" functionality.
            };
        }

        // This case handles the "undo" action after a deletion.
        case 'RESTORE_HISTORY_ALERTS': {
            // If there's nothing in the temporary undo buffer, do nothing.
            if (state.recentlyDeletedHistory.length === 0) return state;

            // Return the state with the recently deleted alerts merged back into the main history.
            return {
                ...state,
                alertsHistory: [...state.alertsHistory, ...state.recentlyDeletedHistory],
                recentlyDeletedHistory: [], // Clear the undo buffer.
            };
        }

        // The default case for any unhandled actions. It returns the current state unchanged.
        default:
            return state;
    }
}

//Notification sound function
function playNotificationSound() {
    // Make sure your audio file (e.g., 'notification.mp3') is in the 'public' folder.
    const audio = new Audio('/Notification.mp3'); // The path starts with '/'
    // The play() method returns a promise. We need to handle potential errors.
    const playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise.catch(error => {
            // This error often happens if the user hasn't interacted with the page yet.
            console.warn("Could not play notification sound automatically. User interaction may be required.", error);
        });
    }
}

/**
 * Generates a list of human-readable log messages by comparing old and new configuration objects.
 * @param {object} oldConfigs - The configuration object before changes.
 * @param {object} newConfigs - The configuration object after changes.
 * @returns {string[]} An array of log message strings.
 */
const generateChangeLogs = (oldConfigs, newConfigs) => {
    const changes = [];

    for (const category in newConfigs) {
        if (!oldConfigs[category]) continue;

        for (const field in newConfigs[category]) {
            const oldValue = oldConfigs[category][field];
            const newValue = newConfigs[category][field];

            if (oldValue !== newValue) {
                const categoryName = FIELD_NAME_MAP[category] || category;
                const fieldName = FIELD_NAME_MAP[field] || field;

                // --- NEW: Formatting logic to include units ---
                const unit = FIELD_UNIT_MAP[field] || FIELD_UNIT_MAP[category] || '';
                let formattedOldValue = String(oldValue);
                let formattedNewValue = String(newValue);

                if (unit) {
                    // Special case for '°C' to have no space
                    if (unit === '°C') {
                        formattedOldValue = `${oldValue}${unit}`;
                        formattedNewValue = `${newValue}${unit}`;
                    } else {
                        // Add a space for all other units
                        formattedOldValue = `${oldValue} ${unit}`;
                        formattedNewValue = `${newValue} ${unit}`;
                    }
                }
                
                changes.push(
                    `Changed ${categoryName} parameter: '${fieldName}' from ${formattedOldValue} to ${formattedNewValue}`
                );
            }
        }
    }
    return changes;
};

// =================================================================================
// APP COMPONENT
// =================================================================================
function App() {
    const location = useLocation();

    const noHeaderPaths = ['/login'];
    const noNavPaths = ['/login', '/account-settings', '/logs'];

    const showHeader = !noHeaderPaths.includes(location.pathname);
    const showNavigation = !noNavPaths.includes(location.pathname) && !location.pathname.startsWith('/admin');

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
    // Holds all alert data and the function to change it.
    const [alertsState, dispatch] = useReducer(alertsReducer, initialState);
    const { activeAlerts, recentAlerts, alertsHistory } = alertsState;

    // --- NEW --- State for the configurable archive interval.
    // Default is 24 hours in milliseconds. Change this for testing!
    // For example, set to 60000 (1 minute) to see alerts move quickly.
    const [archiveInterval, setArchiveInterval] = useState(60000); // Set to 60 seconds for testing

    // Initialize with empty arrays; data will be fetched
    const [deviceLocations, setDeviceLocations] = useState([]);
    const [pumpingStations, setPumpingStations] = useState([]);
    const [mockSensorReadings, setMockSensorReadings] = useState([]); // State for fetched sensor readings

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

    // For fitering assignee filtering rules in Alert History component
    const [assigneeList, setAssigneeList] = useState([]);

    // --- MODIFIED: The userLogs state is now initialized from the mock file ---
    const [userLogs, setUserLogs] = useState(mockUserLogs);

     // --- NEW: State to hold deleted user logs for the Undo action ---
    const [recentlyDeletedUserLogs, setRecentlyDeletedUserLogs] = useState([]);

     // --- NEW: Backend-ready function to add a new log entry ---
    /**
     * Creates a new log entry and adds it to the userLogs state.
     * In a real application, this function would also make an API call to a backend service.
     * @param {string} actionText - The descriptive text of the action performed.
     */
    const logUserAction = (actionText) => {
        const newLog = {
            id: Date.now(), // Use timestamp for a simple unique ID
            dateTime: new Date().toISOString(),
            username: CURRENT_USER.username,
            fullname: CURRENT_USER.fullname,
            action: actionText,
        };

        // --- SIMULATION LOGIC ---
        // Add the new log to the beginning of the array
        setUserLogs(prevLogs => [newLog, ...prevLogs]);
        console.log("User action logged:", newLog);

        // --- BACKEND-READY HOOK ---
        /*
            async function postLogToBackend(logData) {
                try {
                    const response = await fetch('/api/logs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(logData)
                    });
                    if (!response.ok) {
                        throw new Error('Failed to post log to backend');
                    }
                } catch (error) {
                    console.error("Error saving log to backend:", error);
                }
            }
            postLogToBackend(newLog);
        */
    };

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
        }, 30000); // 30-second timer for "back to normal" alerts
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

    // This hook runs whenever a new sensor reading is available, dispatching it to the reducer.
    useEffect(() => {
        if (latestReading) {
            // Update the specific device's readings
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
    
    // Timer to periodically check and archive old alerts
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
    }, [archiveInterval]); // Rerun if the interval setting changes\

    // --- Event Handlers ---
    // These functions are passed down to child components to allow them to trigger state changes.

    const handleAcknowledgeAlert = (alertId) => {

        // Find the specific alert being acknowledged from the activeAlerts list
        const alertToAck = alertsState.activeAlerts.find(a => a.id === alertId);

        // If the alert is found, create a log entry
        if (alertToAck) {
            logUserAction(`Acknowledged alert: '${alertToAck.type}' for device '${alertToAck.originator}'.`);
        }

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

     // Handler for audit trail and deleting alerts in Alert History
       const handleDeleteHistoryAlerts = (idsToDelete) => {
        // First, get the full objects of the alerts that are about to be deleted
        const alertsToDelete = alertsState.alertsHistory.filter(alert => idsToDelete.has(alert.id));
        if (alertsToDelete.length === 0) return;

        // Group the alerts by their device of origin (the 'originator' property)
        const groupedByDevice = alertsToDelete.reduce((acc, alert) => {
            const deviceId = alert.originator || 'unknown'; // Handle alerts that might not have an origin
            if (!acc[deviceId]) {
                acc[deviceId] = [];
            }
            acc[deviceId].push(alert);
            return acc;
        }, {});

        // Now, create a separate log entry for each group (each device)
        Object.keys(groupedByDevice).forEach(deviceId => {
            const count = groupedByDevice[deviceId].length;
            const pluralS = count > 1 ? 's' : '';
            let logMessage;

            if (deviceId === 'unknown') {
                logMessage = `Deleted ${count} alert record${pluralS} from history with an unknown origin.`;
            } else {
                const device = deviceLocations.find(d => d.id === deviceId);
                const deviceLabel = device ? device.label : deviceId;
                logMessage = `Deleted ${count} alert record${pluralS} from history for device '${deviceLabel}'.`;
            }
            logUserAction(logMessage);
        });

        // Finally, dispatch the action to update the state
        dispatch({
            type: 'DELETE_HISTORY_ALERTS',
            payload: { idsToDelete },
        });
    };

    // Handler to restore deleted alerts from Alert History as well as audit trail
    const handleRestoreHistoryAlerts = () => {
        const alertsToRestore = alertsState.recentlyDeletedHistory;
        if (alertsToRestore.length === 0) return;

        // Apply the same grouping logic for restoration
        const groupedByDevice = alertsToRestore.reduce((acc, alert) => {
            const deviceId = alert.originator || 'unknown';
            if (!acc[deviceId]) {
                acc[deviceId] = [];
            }
            acc[deviceId].push(alert);
            return acc;
        }, {});

        Object.keys(groupedByDevice).forEach(deviceId => {
            const count = groupedByDevice[deviceId].length;
            const pluralS = count > 1 ? 's' : '';
            let logMessage;

            if (deviceId === 'unknown') {
                logMessage = `Restored ${count} alert record${pluralS} to history with an unknown origin.`;
            } else {
                const device = deviceLocations.find(d => d.id === deviceId);
                const deviceLabel = device ? device.label : deviceId;
                logMessage = `Restored ${count} alert record${pluralS} to history for device '${deviceLabel}'.`;
            }
            logUserAction(logMessage);
        });
        
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

    // --- MODIFIED: handleSaveConfiguration sends a PUT request and logs changes ---
    const handleSaveConfiguration = useCallback(async (deviceId, newConfigs) => {
        // --- START: Added logging logic ---
        const deviceToUpdate = deviceLocations.find(d => d.id === deviceId);

        if (!deviceToUpdate) {
            console.error("Device not found for logging configuration changes.");
            // We can still attempt the API call, but logging is skipped.
        } else {
            // Generate and log changes based on the current state vs. the new configs
            const oldConfigs = deviceToUpdate.configurations;
            const changesToLog = generateChangeLogs(oldConfigs, newConfigs); // Assuming this function exists
            changesToLog.forEach(change => {
                // Assuming logUserAction function exists
                logUserAction(`Device '${deviceToUpdate.label}': ${change}`);
            });
        }

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
        // --- MODIFIED: Added 'deviceLocations' to dependency array ---
    }, [deviceLocations]); // Dependencies updated to prevent stale state

   // --- NEW --- This useEffect automatically creates a unique list of assignees for the filter
    useEffect(() => {
        if (alertsHistory && alertsHistory.length > 0) {
            // Use a Set to get only unique names from alerts that have been acknowledged
            const uniqueAssignees = [...new Set(
                alertsHistory
                    .map(alert => alert.acknowledgedBy?.name) // Safely access the name property
                    .filter(Boolean) // Remove any undefined or null entries
            )];
            setAssigneeList(uniqueAssignees);
        }
    }, [alertsHistory]); // This effect runs whenever the alertsHistory changes

        // --- NEW: Handlers for deleting and restoring user logs ---
        const handleDeleteUserLogs = (idsToDelete) => {
            const logsToMove = userLogs.filter(log => idsToDelete.has(log.id));
            const logsToKeep = userLogs.filter(log => !idsToDelete.has(log.id));
            
            setRecentlyDeletedUserLogs(logsToMove); // Save for undo
            setUserLogs(logsToKeep); // Update the main log list
        };

        const handleRestoreUserLogs = () => {
            // Add the recently deleted logs back to the main list
            setUserLogs(prevLogs => [...recentlyDeletedUserLogs, ...prevLogs]);
            // Clear the undo buffer
            setRecentlyDeletedUserLogs([]);
        };

        // --- NEW: Handler for logging valve state changes ---
        const handleValveToggle = (deviceId, newState) => {
            const device = deviceLocations.find(d => d.id === deviceId);
            if (device) {
                const stateText = newState ? 'Opened' : 'Closed';
                logUserAction(`${stateText} water valve for device '${device.label}'.`);
            }
        };

        /**
         * Logs changes made to the user's profile information.
         * @param {object} changes - An object containing the old and new values.
         */
        const handleProfileUpdate = (changes) => {
            if (changes.phone) {
                logUserAction(`Changed phone number from ${changes.phone.old} to ${changes.phone.new}.`);
            }
            if (changes.profilePic) {
                logUserAction(`Updated profile picture.`);
            }
        };

        /**
         * Logs when a user changes their password.
         */
        const handlePasswordChange = () => {
            logUserAction(`Changed password.`);
        };

    /**
     * --- NEW: Logs the creation of a new user account ---
     * @param {object} newUser - The user object that was created.
     */
    const onAdminCreateUser = (newUser) => {
        // This function receives the newly created user object to include their username in the log.
        logUserAction(`Admin '${CURRENT_USER.username}' created new user account: '${newUser.username}'.`);
    };

    /**
     * --- NEW: Logs the deletion of a user account ---
     * @param {object} deletedUser - The user object that was deleted.
     */
    const onAdminDeleteUser = (deletedUser) => {
        // This function receives the user object just before deletion to log their username.
        logUserAction(`Admin '${CURRENT_USER.username}' deleted user account: '${deletedUser.username}'.`);
    };

    /**
     * --- REFINED: Compares old and new user data and logs detailed changes ---
     * This function performs a detailed comparison to generate a log for each modified field,
     * now with more specific logic for device changes.
     * @param {object} oldUser - The user object before changes.
     * @param {object} newUser - The user object after changes.
     */

    const onAdminUpdateUser = (oldUser, newUser) => {
        const adminUsername = CURRENT_USER.username;
        const targetUsername = oldUser.username;
        const allDevices = deviceLocations; // Use the existing state to find device labels.

        // 1. Compare simple text fields (firstName, lastName, etc.)
        Object.keys(USER_FIELD_MAP).forEach(field => {
            if (oldUser[field] !== newUser[field]) {
                logUserAction(`Admin '${adminUsername}' modified user account '${targetUsername}': Changed ${USER_FIELD_MAP[field]} from '${oldUser[field]}' to '${newUser[field]}'.`);
            }
        });

        // 2. Check for a password change. This now works correctly because UserForm.jsx
        //    sends an empty password string unless it has been explicitly changed.
        if (newUser.password && newUser.password.length > 0) {
            logUserAction(`Admin '${adminUsername}' modified user account '${targetUsername}': Changed password.`);
        }

        // 3. Compare the 'roles' array to find additions and removals.
        const oldRoles = new Set(oldUser.roles);
        const newRoles = new Set(newUser.roles);
        newUser.roles.forEach(role => {
            if (!oldRoles.has(role)) {
                logUserAction(`Admin '${adminUsername}' modified user account '${targetUsername}': Added role '${role}'.`);
            }
        });
        oldUser.roles.forEach(role => {
            if (!newRoles.has(role)) {
                logUserAction(`Admin '${adminUsername}' modified user account '${targetUsername}': Removed role '${role}'.`);
            }
        });

        // 4. --- REFINED: New device comparison logic ---
        const getDeviceLabel = (deviceId) => allDevices.find(d => d.id === deviceId)?.label || deviceId;
        const oldDeviceIds = new Set(oldUser.devices);
        const newDeviceIds = new Set(newUser.devices);

        const addedDevices = newUser.devices.filter(id => !oldDeviceIds.has(id));
        const removedDevices = oldUser.devices.filter(id => !newDeviceIds.has(id));

        // Case 1: A single device was replaced with another.
        if (addedDevices.length === 1 && removedDevices.length === 1) {
            logUserAction(`Admin '${adminUsername}' modified user account '${targetUsername}': Replaced device '${getDeviceLabel(removedDevices[0])}' with '${getDeviceLabel(addedDevices[0])}'.`);
        } else {
            // Case 2: Handle all other additions and removals separately.
            addedDevices.forEach(deviceId => {
                logUserAction(`Admin '${adminUsername}' modified user account '${targetUsername}': Added device '${getDeviceLabel(deviceId)}'.`);
            });
            removedDevices.forEach(deviceId => {
                logUserAction(`Admin '${adminUsername}' modified user account '${targetUsername}': Removed device '${getDeviceLabel(deviceId)}'.`);
            });
        }
    };

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
        onDeleteUserLogs: handleDeleteUserLogs,
        onRestoreUserLogs: handleRestoreUserLogs,
        onSelectMapDevice: handleSelectDevice,
        onAddDevice: handleAddDevice,
        onDeleteDevice: handleDeleteDevice,
        onSaveStations: handleSaveStations,
        selectedMapDeviceId,
        refocusTrigger,
        newlyAddedId,
        onAnimationComplete: handleAnimationComplete,
        onSaveConfiguration: handleSaveConfiguration,
        userLogs, 
        onValveToggle: handleValveToggle,
        onProfileUpdate: handleProfileUpdate,
        onPasswordChange: handlePasswordChange,
        onAdminCreateUser,
        onAdminUpdateUser,
        onAdminDeleteUser, 
    };

    return (
        <AlertsContext.Provider value={contextValue}>
            {isAuthenticated && showHeader && <Header onLogout={handleLogout} deviceLabelForHeader={headerDeviceLabel} username={loggedInUsername}/>}
            {isAuthenticated && showNavigation && <Navigation />}
            <main>
                <Routes>
                    <Route path="/login" element={<Login onLogin={handleLogin} />} />
                    <Route path="admin/*" element={
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
                    <Route path="/configurations/*"
                        element={
                            <ProtectedRoute isAuthenticated={isAuthenticated}>
                                <Configuration onSetHeaderDeviceLabel={setHeaderDeviceLabel} />
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