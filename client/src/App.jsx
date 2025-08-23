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
import SpecificDevice from './Components/Devices/SpecificDevice/SpecificDevice';
import Logs from './Components/WebLogs/Logs';
import AccountSettings from './Components/AccountSettings/AccountSettings';
import { userLogs as mockUserLogs, mockSystemLogs } from './utils/LogsMockUp';
import { 
    PARAMETER_TO_COMPONENT_MAP, 
    FIELD_NAME_MAP, 
    FIELD_UNIT_MAP, 
    USER_FIELD_MAP 
} from './utils/logMaps';

// =================================================================================
// CONFIGURATION
// =================================================================================
// Set to 'true' to use the current browser time for new alerts (for simulation).
// Set to 'false' to use the timestamp from the sensor data (for real-world application).
const IS_SIMULATION_MODE = true;

// =================================================================================
// SIMULATED CURRENT USER
// =================================================================================
const CURRENT_USER = {
    username: 'j.doe',
    fullname: 'John Doe',
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
// ALERTS REDUCER
// =================================================================================
function alertsReducer(state, action) {
    switch (action.type) {
        // MODIFIED: This case now receives already evaluated alerts from the server.
        case 'PROCESS_READING':
            {
                // Renamed payload property for clarity: now 'evaluatedAlerts' from server
                const { evaluatedAlerts, alertIdCounter } = action.payload;

                // 'evaluatedAlerts' are the 'potentialAlerts' returned by the server.
                const potentialAlerts = evaluatedAlerts;

                // Create a mutable copy of the current active alerts to work with.
                let nextActiveAlerts = [...state.activeAlerts];
                // An array to hold any alerts that need to be moved out of the active list.
                const alertsToArchive = [];

                // Iterate over each potential alert generated from the sensor reading (received from server).
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
                                    dateTime: IS_SIMULATION_MODE ? new Date().toISOString() : new Date(newAlertData.dateTime).toISOString(), // Use newAlertData.dateTime
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
                                    dateTime: IS_SIMULATION_MODE ? new Date().toISOString() : new Date(newAlertData.dateTime).toISOString() // Use newAlertData.dateTime
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
                            dateTime: IS_SIMULATION_MODE ? new Date().toISOString() : new Date(newAlertData.dateTime).toISOString() // Use newAlertData.dateTime
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
        case 'ACKNOWLEDGE_ALERT':
            {
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
                        acknowledged: true, // Set the acknowledged flag to true.
                        acknowledgedBy: acknowledgedByInfo // Stamp the user and time information.
                    } : alert
                );

                // Return the new state with the updated active alerts list. The alert remains
                // in the active list until it is resolved or cleared by another action.
                return { ...state, activeAlerts: nextActiveAlerts };
            }

            // This case is triggered ONLY by the timer set for "back to normal" alerts.
            // It automatically moves the notification from the active list to the recent list.
        case 'AUTO_CLEAR_NORMAL_ALERT':
            {
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
        case 'ARCHIVE_RECENT_ALERTS':
            {
                const { currentTime, archiveInterval } = action.payload;
                // If there are no recent alerts to check, do nothing.
                if (!state.recentAlerts || state.recentAlerts.length === 0) return state;

                const alertsToKeep = []; // To hold alerts that are not old enough to be archived.
                const alertsToMove = []; // To hold alerts that are old and ready for permanent history.

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
        case 'DELETE_HISTORY_ALERTS':
            {
                const { idsToDelete } = action.payload; // A Set of alert IDs to be deleted.
                const remainingAlerts = []; // Alerts that will remain in history.
                const deletedAlerts = []; // A temporary copy of the alerts being deleted for the undo feature.

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
        case 'RESTORE_HISTORY_ALERTS':
            {
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

                const unit = FIELD_UNIT_MAP[field] || FIELD_UNIT_MAP[category] || '';
                let formattedOldValue = String(oldValue);
                let formattedNewValue = String(newValue);

                if (unit) {
                    if (unit === '°C') {
                        formattedOldValue = `${oldValue}${unit}`;
                        formattedNewValue = `${newValue}${unit}`;
                    } else {
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
    const showNavigation = !noNavPaths.includes(location.pathname);

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [headerDeviceLabel, setHeaderDeviceLabel] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setLoggedInUser(user);
                setIsAuthenticated(true);
                console.log("App.jsx - useEffect: loggedInUser restored from localStorage:", user);
            } catch (e) {
                console.error("Failed to parse loggedInUser from localStorage", e);
                localStorage.removeItem('loggedInUser');
            }
        }else{
            console.log("App.jsx - useEffect: No loggedInUser found in localStorage.");
        }
    }, []);

    const handleLogin = (user) => { // Expect full user object from Login component
        setIsAuthenticated(true);
        setLoggedInUser(user);
        localStorage.setItem('loggedInUser', JSON.stringify(user)); // Store user data
        console.log("App.jsx - handleLogin: User logged in, loggedInUser set to:", user);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setLoggedInUser(null);
        localStorage.removeItem('loggedInUser'); // Clear user data
        console.log("App.jsx - handleLogout: User logged out.");
    };

    // --- State Management ---
    const [alertsState, dispatch] = useReducer(alertsReducer, initialState);
    const { activeAlerts, recentAlerts, alertsHistory } = alertsState;
    const [archiveInterval, setArchiveInterval] = useState(60000);

    const [deviceLocations, setDeviceLocations] = useState([]);
    const [pumpingStations, setPumpingStations] = useState([]);
    const [mockSensorReadings, setMockSensorReadings] = useState([]);

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

    const [userLogs, setUserLogs] = useState(mockUserLogs);
    const [recentlyDeletedUserLogs, setRecentlyDeletedUserLogs] = useState([]);

    const [systemLogs, setSystemLogs] = useState(mockSystemLogs); 
    const [recentlyDeletedSystemLogs, setRecentlyDeletedSystemLogs] = useState([]);

    // --- FIX: Ref to hold previous device state to prevent inaccurate logging ---
    const previousDevicesRef = useRef([]);

     // --- NEW: STATE MANAGEMENT FOR NOTIFICATIONS ---
    // This state holds all notifications that will be displayed in the dropdown.
    const [notifications, setNotifications] = useState([]);
    // A counter to ensure each notification has a unique ID.
    const notificationIdCounter = useRef(0);
    // A derived state that calculates the number of unread notifications for the badge.
    const unreadNotificationsCount = notifications.filter(n => !n.read).length;

     // --- NEW: Function to play notification sound ---
    // This function is wrapped in useCallback to prevent it from being recreated on every render.
    const playNotificationSound = useCallback(() => {
        // Ensure the audio file is in the /public folder of your project.
        const audio = new Audio('/Notification.mp3');
        const playPromise = audio.play();
        // The play() method returns a promise. We handle potential errors,
        // which often occur if the user hasn't interacted with the page yet.
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Could not play notification sound automatically. User interaction may be required.", error);
            });
        }
    }, []); // Empty dependency array means this function is created only once.


    // --- NEW: Centralized function to add a new notification ---
    // This function handles the creation of a new notification object and adds it to the state.
    const addNotification = useCallback((notificationData) => {
        notificationIdCounter.current += 1; // Increment the unique ID counter.
        const newNotification = {
            id: notificationIdCounter.current,
            timestamp: new Date(), // Set the current time for the notification.
            read: false, // All new notifications are initially unread.
            ...notificationData, // Merge the specific data (e.g., { type: 'DeviceOffline', message: '...' })
        };
        // Use the functional form of setState to ensure we have the latest state.
        // Add the new notification to the beginning of the array.
        setNotifications(prev => [newNotification, ...prev]);
    }, []); 

    // --- Utility function for creating System Logs ---
    const logSystemEvent = useCallback((logData) => {
        const newLog = {
            id: Date.now() + Math.random(),
            dateTime: new Date().toISOString(),
            ...logData,
        };
        setSystemLogs(prevLogs => [newLog, ...prevLogs]);
        console.log("System event logged:", newLog);
    }, []);


    // --- Backend-ready function to add a new user log entry ---
    // --- MODIFIED: The function now accepts an optional 'details' object ---
    const logUserAction = (actionText, type, details = null) => {
        const newLog = {
            id: Date.now() + Math.random(), // Use a more unique ID
            dateTime: new Date().toISOString(),
            username: CURRENT_USER.username,
            fullname: CURRENT_USER.fullname,
            action: actionText,
            type: type,
            details: details, // Attach the details object to the log
        };
        setUserLogs(prevLogs => [newLog, ...prevLogs]);
    };

    // --- This useEffect now calls the new sound function ---
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

    // --- ADDED --- A handler to allow child components to signal animation completion
    const handleAnimationComplete = () => {
        setNewlyAddedId(null);
    };

    // --- Timer Management ---
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

    // --- This useEffect fetches all initial data required for the application ---
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
                setMockSensorReadings(sensorReadingsRes.data);
                // --- FIX: Prime the ref with the initial device state ---
                previousDevicesRef.current = devicesRes.data;
            } catch (error) {
                console.error("Error fetching initial data:", error);
            }
        };
        fetchInitialData();
    }, []);

   // --- FIX: This useEffect is now dedicated ONLY to polling for device status ---
    // --- UPDATED: This useEffect now also creates notifications for device status changes ---
    useEffect(() => {
        const pollDeviceStatus = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/devices`);
                const latestDevices = response.data;
                const previousDevices = previousDevicesRef.current;

                // Compare the newly fetched data with the previous data stored in the ref
                latestDevices.forEach(latestDevice => {
                    const oldDevice = previousDevices.find(d => d.id === latestDevice.id);
                    // Log ONLY if the device was found and the status is different
                    if (oldDevice && oldDevice.status !== latestDevice.status) {
                        logSystemEvent({
                            deviceId: latestDevice.id,
                            component: 'device', // The component is the device itself
                            event: `Device is now ${latestDevice.status}`,
                            details: `Status changed from ${oldDevice.status} to ${latestDevice.status}.`,
                            status: latestDevice.status === 'Online' ? 'Success' : 'Error',
                        });

                        // --- NEW: Generate Notification based on status change ---
                        if (latestDevice.status === 'Offline') {
                            addNotification({
                                type: 'DeviceOffline',
                                message: `Device '${latestDevice.label}' is now Offline`,
                            });
                        } else {
                            addNotification({
                                type: 'DeviceOnline',
                                message: `Device '${latestDevice.label}' is now Online`,
                            });
                        }
                    }
                });

                // Update the main state and the ref for the next poll
                setDeviceLocations(latestDevices);
                previousDevicesRef.current = latestDevices;

            } catch (error) {
                console.error("Error polling for device statuses:", error);
            }
        };

        const pollInterval = setInterval(pollDeviceStatus, 10000);
        return () => clearInterval(pollInterval);
    }, [logSystemEvent, addNotification]); // This effect now depends on addNotification.

    // --- This useEffect runs the sensor reading simulation loop ---
    // --- UPDATED: This useEffect now also creates notifications for critical events ---
    useEffect(() => {
    if (mockSensorReadings.length === 0) return;

    let readingIndex = 0;
    const intervalId = setInterval(async () => {
        if (readingIndex < mockSensorReadings.length) {
            const currentReading = mockSensorReadings[readingIndex++];
            setLatestReading(currentReading);

            try {
                const response = await axios.post(`${API_BASE_URL}/sensor-readings/evaluate`, currentReading);
                const { evaluatedAlerts } = response.data;

                // FIX: Get the most recent device data inside the interval
                const currentDeviceLocations = deviceLocations;

                // FIX: Define the helper function here, using the captured data
                const getDeviceLabel = (deviceId) => {
                    const device = currentDeviceLocations.find(d => d.id === deviceId);
                    return device ? device.label : deviceId;
                };

                evaluatedAlerts.forEach(alert => {
                    if (alert.severity === 'Critical') {
                        logSystemEvent({
                            deviceId: alert.originator,
                            component: alert.parameter.toLowerCase(),
                            event: 'Critical reading detected',
                            details: `Reading: ${alert.value}`,
                            status: 'Warning',
                        });
                        addNotification({
                            type: 'CriticalAlert',
                            message: `Critical ${alert.parameter} reading on device '${getDeviceLabel(alert.originator)}'`,
                        });
                    }
                    if (alert.note && alert.note.includes('Valve shut off')) {
                        const componentName = PARAMETER_TO_COMPONENT_MAP[alert.parameter] || alert.parameter;
                        logSystemEvent({
                            deviceId: alert.originator,
                            component: 'valve',
                            event: 'Valve closed automatically',
                            details: `Triggered by critical ${componentName} reading.`,
                            status: 'Info',
                        });
                        addNotification({
                            type: 'ValveShutOff',
                            message: `Valve automatically closed on device '${getDeviceLabel(alert.originator)}'`,
                        });
                    }
                });

                dispatch({
                    type: 'PROCESS_READING',
                    payload: { evaluatedAlerts, alertIdCounter },
                    timers: { start: startTimer }
                });
            } catch (error) {
                console.error("Error evaluating sensor reading on backend:", error);
            }
        } else {
            clearInterval(intervalId);
        }
    }, 10000);

    return () => {
        clearInterval(intervalId);
        backToNormalTimers.current.forEach(timerId => clearTimeout(timerId));
    };
    // The dependency array is now correct and will not cause resets.
}, [mockSensorReadings, logSystemEvent, addNotification]);

    // Timer to periodically check and archive old alerts
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

    // --- Event Handlers ---
    const handleAcknowledgeAlert = (alertId) => {
        const alertToAck = alertsState.activeAlerts.find(a => a.id === alertId);
        if (alertToAck) {
            logUserAction(`Acknowledged alert: '${alertToAck.type}' for device '${alertToAck.originator}'.`, 'Acknowledgement');
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
        const alertsToDelete = alertsState.alertsHistory.filter(alert => idsToDelete.has(alert.id));
        if (alertsToDelete.length === 0) return;
        const groupedByDevice = alertsToDelete.reduce((acc, alert) => {
            const deviceId = alert.originator || 'unknown';
            if (!acc[deviceId]) { acc[deviceId] = []; }
            acc[deviceId].push(alert);
            return acc;
        }, {});
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
            logUserAction(logMessage, 'Deletion');
        });
        dispatch({
            type: 'DELETE_HISTORY_ALERTS',
            payload: { idsToDelete },
        });
    };

    // Handler to restore deleted alerts from Alert History as well as audit trail
    const handleRestoreHistoryAlerts = () => {
        const alertsToRestore = alertsState.recentlyDeletedHistory;
        if (alertsToRestore.length === 0) return;
        const groupedByDevice = alertsToRestore.reduce((acc, alert) => {
            const deviceId = alert.originator || 'unknown';
            if (!acc[deviceId]) { acc[deviceId] = []; }
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
            logUserAction(logMessage, 'Deletion');
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
            setDeviceLocations(p => p.filter(d => d.id !== deviceId));
            setSelectedMapDeviceId(null);
            console.log("Simulated deleting device:", deviceId);
        } catch (error) {
            console.error("Error deleting device:", error);
        }
    };

    // --- MODIFIED: handleSaveStations now sends data to the backend ---
    // --- MODIFIED: This function now logs detailed changes ---
    const handleSaveStations = async (updatedStations) => {
        try {
            const previousStations = pumpingStations; 

            updatedStations.forEach(newStation => {
                const oldStation = previousStations.find(s => s.id === newStation.id);
                
                if (oldStation && oldStation.operation !== 'Maintenance' && newStation.operation === 'Maintenance' && newStation.maintenanceInfo) {
                    const { cause, date, startTime, endTime } = newStation.maintenanceInfo;
                    const formatTime = (time) => new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                    const logMessage = `Set station '${newStation.label}' to Maintenance. Cause: ${cause}. Scheduled: ${date} from ${formatTime(startTime)} to ${formatTime(endTime)}.`;
                    
                    logUserAction(logMessage, 'Maintenance', newStation.maintenanceInfo);
                }
            });

            setPumpingStations(updatedStations);
            console.log("Simulated saving stations:", updatedStations);
        } catch (error) {
            console.error("Error saving stations:", error);
        }
    };

    // --- MODIFIED: handleSaveConfiguration sends a PUT request and logs changes ---
    const handleSaveConfiguration = useCallback(async (deviceId, newConfigs) => {
        const deviceToUpdate = deviceLocations.find(d => d.id === deviceId);
        if (!deviceToUpdate) {
            console.error("Device not found for logging configuration changes.");
        } else {
            const changesToLog = generateChangeLogs(deviceToUpdate.configurations, newConfigs);
            changesToLog.forEach(change => {
                logUserAction(`Device '${deviceToUpdate.label}': ${change}`, 'Configuration');
            });
        }
        console.log(`Attempting to save for ${deviceId}:`, newConfigs);
        try {
            const response = await axios.put(`${API_BASE_URL}/devices/${deviceId}/configurations`, newConfigs);
            console.log(response.data.message, response.data.updatedDevice);
            setDeviceLocations(prevDevices =>
                prevDevices.map(device =>
                    device.id === deviceId ?
                    { ...device, configurations: response.data.updatedDevice.configurations } :
                    device
                )
            );
            return Promise.resolve();
        } catch (error) {
            console.error("Error saving configuration:", error);
            return Promise.reject(error);
        }
    }, [deviceLocations]);

    // --- NEW --- This useEffect automatically creates a unique list of assignees for the filter
    useEffect(() => {
        if (alertsHistory && alertsHistory.length > 0) {
            const uniqueAssignees = [...new Set(
                alertsHistory
                .map(alert => alert.acknowledgedBy ?.name)
                .filter(Boolean)
            )];
            setAssigneeList(uniqueAssignees);
        }
    }, [alertsHistory]);

    // --- NEW: Handlers for deleting and restoring user logs ---
    const handleDeleteUserLogs = (idsToDelete) => {
        const logsToMove = userLogs.filter(log => idsToDelete.has(log.id));
        const logsToKeep = userLogs.filter(log => !idsToDelete.has(log.id));
        setRecentlyDeletedUserLogs(logsToMove);
        setUserLogs(logsToKeep);
    };

    const handleRestoreUserLogs = () => {
        setUserLogs(prevLogs => [...recentlyDeletedUserLogs, ...prevLogs]);
        setRecentlyDeletedUserLogs([]);
    };

    /**
     * --- NEW: Handles the deletion of system logs ---
     */
    const handleDeleteSystemLogs = (idsToDelete) => {
        const logsToMove = systemLogs.filter(log => idsToDelete.has(log.id));
        const logsToKeep = systemLogs.filter(log => !idsToDelete.has(log.id));
        setRecentlyDeletedSystemLogs(logsToMove); // Store for undo
        setSystemLogs(logsToKeep); // Update the main state
    };

    /**
     * --- NEW: Handles the restoration of system logs ---
     */
    const handleRestoreSystemLogs = () => {
        // Merges the recently deleted logs back into the main array
        setSystemLogs(prevLogs => [...recentlyDeletedSystemLogs, ...prevLogs]);
        setRecentlyDeletedSystemLogs([]); // Clear the undo buffer
    };

    // --- NEW: Handlers for managing notification read status ---
    const handleMarkNotificationAsRead = (notificationId) => {
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
    };

    const handleMarkAllNotificationsAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    // --- MODIFIED: handleValveToggle now also creates a system log ---
    const handleValveToggle = (deviceId, newState) => {
        const device = deviceLocations.find(d => d.id === deviceId);
        if (device) {
            const stateText = newState ? 'Opened' : 'Closed';
            logUserAction(`${stateText} water valve for device '${device.label}'.`, 'Valve');
            logSystemEvent({
                deviceId: device.id,
                component: 'valve',
                event: `Valve ${stateText} manually`,
                details: `Action by: ${CURRENT_USER.username}`,
                status: 'Success',
            });
        }
    };

    /**
     * Logs changes made to the user's profile information AND UPDATES THE BACKEND.
     */
    const handleProfileUpdate = async (changes) => { // Make it async
        if (!loggedInUser) return { success: false, message: "No user is logged in." };

        if (changes.phone) {
            try {
                // --- API CALL ---
                const response = await axios.put(`${API_BASE_URL}/users/${loggedInUser.username}/profile`, {
                    contact: changes.phone.new
                });

                // --- LOGGING ---
                logUserAction(`Changed phone number from ${changes.phone.old} to ${changes.phone.new}.`, 'Account');
                
                // --- RETURN SUCCESS ---
                return { success: true, message: response.data.message || "Profile updated successfully!" };

            } catch (error) {
                console.error("API Error updating phone:", error.response?.data?.message || error.message);
                // --- RETURN FAILURE ---
                return { success: false, message: error.response?.data?.message || "An API error occurred." };
            }
        }

        if (changes.profilePic) {
            // You can add backend logic for profile picture upload here in the future
            logUserAction(`Updated profile picture.`, 'Account');
            return { success: true, message: "Profile picture updated successfully!" };
        }

        // Default return if no changes are handled
        return { success: false, message: "No profile changes were specified." };
    };

    /**
     * Logs when a user changes their password AND UPDATES THE BACKEND.
     */
    const handlePasswordChange = async (currentPassword, newPassword) => { // Make it async and accept passwords
        if (!loggedInUser) return { success: false, message: "No user is logged in." };
        
        try {
            // --- API CALL ---
            const response = await axios.put(`${API_BASE_URL}/users/${loggedInUser.username}/password`, {
                currentPassword,
                newPassword
            });

            // --- LOGGING ---
            logUserAction(`Changed password.`, 'Account');

            // --- RETURN SUCCESS ---
            return { success: true, message: response.data.message || "Password changed successfully!" };
        } catch (error) {
            console.error("API Error changing password:", error.response?.data?.message || error.message);
            // --- RETURN FAILURE ---
            return { success: false, message: error.response?.data?.message || "Failed to change password." };
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
        onDeleteSystemLogs: handleDeleteSystemLogs,
        onRestoreSystemLogs: handleRestoreSystemLogs,
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
        // --- Provide systemLogs to the context ---
        systemLogs,
        loggedInUser,
    };

    return (
        <AlertsContext.Provider value={contextValue}>
            {isAuthenticated && showHeader && 
                <Header 
                    onLogout={handleLogout}
                    deviceLabelForHeader={headerDeviceLabel}
                    username={loggedInUser?.username}
                    // --- Pass notification state and handlers to Header ---
                    notifications={notifications}
                    unreadCount={unreadNotificationsCount}
                    onMarkNotificationAsRead={handleMarkNotificationAsRead}
                    onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
                />
            }
            {isAuthenticated && showNavigation && <Navigation />}
            <main>
                <Routes>
                    <Route path="/login" element={<Login onLogin={handleLogin} />} />
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
                        element={
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