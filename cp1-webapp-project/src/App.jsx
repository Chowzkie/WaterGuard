// App.jsx
import React, { useState, useEffect, useReducer, useRef } from 'react';
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
import AccountSettings from './Components/AccountSettings/AccountSettings';

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

// =================================================================================
// MOCK DATA AND INITIAL STATE
// =================================================================================

// --- MODIFIED: Added 'configurations' object to each device ---
const FAKE_API_DATA = [
    {
        id: 'ps01-dev',
        label: 'PS01-DEV',
        position: [15.6033, 120.6010],
        location: 'Brgy. Abagon, Gerona, Tarlac',
        status: 'Online',
        configurations: {
            ph: { warnLow: 6.4, critLow: 6.0, warnHigh: 8.6, critHigh: 9.0, normalLow: 6.5, normalHigh: 8.5 }, // ADDED normalLow/High
            turbidity: { warn: 5, crit: 10, normalLow: 0, normalHigh: 5 }, // ADDED normalLow/High
            tds: { warn: 500, crit: 1000, normalLow: 0, normalHigh: 500 }, // ADDED normalLow/High
            temp: { warnLow: 5, critLow: 0, warnHigh: 31, critHigh: 35, normalLow: 10, normalHigh: 30 }, // ADDED normalLow/High
            valveShutOff: { phLow: 5.9, phHigh: 9.1, turbidityCrit: 13, tdsCrit: 1200 },
            alertLoggingIntervals: { activeToRecent: 30, recentToHistory: 5 },
            testingIntervals: { drain: 3, delay: 1, fill: 3 }
        },

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
            { type: "pH Warning", status: "Active", time: "10:40", value: 8, unit: 'pH' },
            { type: "Temperature High", status: "Critical", time: "10:55", value: 40, unit: '°C' },
            { type: "TDS Critical", status: "Critical", time: "11:05", value: 750, unit: 'ppm' },
        ],
        readings: {
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
            alertLoggingIntervals: { activeToRecent: 40, recentToHistory: 5 }, // NEW
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
            { type: "TDS Critical", status: "Resolved", time: "10:20", value: 900, unit: 'ppm' }
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
            alertLoggingIntervals: { activeToRecent: 50, recentToHistory: 5 }, // NEW
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
            { type: "Device Offline", status: "Active", time: "10:00", value: 0, unit: '' }
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
    { deviceId: "ps01-dev", timestamp: "2025-07-03T10:15:00Z", temp: 8.5 }, // Warning: Low (5-9)
    // Temperature becomes critical
    { deviceId: "ps01-dev", timestamp: "2025-07-03T10:16:00Z", temp: 4.1 },  // Critical: Low (<5)
    // Temperature returns to normal
    { deviceId: "ps01-dev", timestamp: "2025-07-03T10:17:00Z", temp: 25.0 }, // Normal (10-30)

    // --- SCENARIO 5: Test the full pH lifecycle (High and Low) ---
    //Normal starting point
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:19:00Z", pH: 6.5 }, // Normal (6.5-8.5)
    // A high pH warning is triggered
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:20:00Z", pH: 8.8 }, // Warning: High (8.6-9.0)
    // pH escalates to critical high
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:21:00Z", pH: 9.3 }, // Critical: High (>9.0)
    // pH returns to normal from high
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:22:00Z", pH: 8.1 }, // Normal (6.5-8.5)
    // A low pH warning is triggered
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:25:00Z", pH: 6.3 }, // Warning: Low (6.0-6.4)
    // pH escalates to critical low
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:26:00Z", pH: 5.8 }, // Critical: Low (<6.0)
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:22:00Z", pH: 6.6 }, // Normal (6.5-8.5)

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
                name: user.name,
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

// =================================================================================
// APP COMPONENT
// =================================================================================
function App() {
    // NEW: useLocation hook to get the current URL path.
    const location = useLocation();

    // UPDATED: We now have two separate checks for the header and the sidebar navigation.
    const noHeaderPaths = ['/login']; // Only hide header on the login page.
    const noNavPaths = ['/login', '/account-settings', '/logs']; // Hide sidebar on login AND account settings.

    const showHeader = !noHeaderPaths.includes(location.pathname);
    const showSidebar = !noNavPaths.includes(location.pathname);

    // Use to Authenticate the user when logging in
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    // NEW STATE: To hold the device label for the header
    const [headerDeviceLabel, setHeaderDeviceLabel] = useState(null);

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
    const [deviceLocations, setDeviceLocations] = useState(FAKE_API_DATA);
    const [pumpingStations, setPumpingStations] = useState(FAKE_STATIONS_DATA);
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

    // --- useEffect Hooks for Simulation and Timers ---
    // This hook runs ONCE to initialize the app and start the main simulation timer.
    useEffect(() => {
        setPumpingStations(FAKE_STATIONS_DATA);
        let readingIndex = 0;
        const intervalId = setInterval(() => {
            if (readingIndex < MOCK_SENSOR_READINGS.length) {
                setLatestReading(MOCK_SENSOR_READINGS[readingIndex++]);
            } else {
                clearInterval(intervalId);
            }
        }, 10000); // New sensor reading every 10 seconds

        return () => {
            clearInterval(intervalId);
            // --- FIX --- Ensure all timers are cleared on unmount
            backToNormalTimers.current.forEach(timerId => clearTimeout(timerId));
        };
    }, []);

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

    // --- MODIFIED: Event handler now passes user and timestamp info ---
    const handleAcknowledgeAlert = (alertId) => {
        // --- FIX --- Pass the timer functions to the reducer
        dispatch({
            type: 'ACKNOWLEDGE_ALERT',
            payload: {
                alertId,
                user: CURRENT_USER, // Pass the simulated user
                timestamp: new Date().toISOString() // Pass the current time
            },
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

    // --- NEW: Handler to simulate saving device configurations ---
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

    // --- Context Value ---
    // This object bundles all the necessary state and functions to be provided to the app.
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
        onDeleteHistoryAlerts: handleDeleteHistoryAlerts, // CHANGE: Added delete and restore functions to context
        onRestoreHistoryAlerts: handleRestoreHistoryAlerts,
        onSelectMapDevice: handleSelectDevice,
        onAddDevice: handleAddDevice,
        onDeleteDevice: handleDeleteDevice,
        onSaveStations: handleSaveStations,
        selectedMapDeviceId,
        refocusTrigger,
        newlyAddedId,
        onAnimationComplete: handleAnimationComplete,
        onSaveConfiguration: handleSaveConfiguration, // NEW
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