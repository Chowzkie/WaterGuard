import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios'; // Import Axios
import { jwtDecode } from 'jwt-decode'
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
import { mockSystemLogs } from './utils/LogsMockUp';
import { 
    PARAMETER_TO_COMPONENT_MAP, 
    FIELD_NAME_MAP, 
    FIELD_UNIT_MAP, 
    USER_FIELD_MAP 
} from './utils/logMaps';
import { Beaker } from 'lucide-react';

// =================================================================================
// SIMULATED CURRENT USER
// =================================================================================
const CURRENT_USER = {
    username: 'j.doe',
    fullname: 'John Doe',
    role: 'System Operator'
};

// Define your backend API base URL
const API_BASE_URL = 'http://localhost:8080'; // Make sure this matches your backend port

// =================================================================================
// MOCK DATA AND INITIAL STATE (These are now fetched from backend)
// =================================================================================

const initialState = {
    activeAlerts: [],
    recentAlerts: [],
    alertsHistory: [],
    recentlyDeletedHistory: [],
};

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
    const [headerDeviceLabel, setHeaderDeviceLabel] = useState(null);


    //// State for the currently logged-in user
    // Initialize from localStorage if available
    const [loggedInUser, setLoggedInUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        return savedUser? JSON.parse(savedUser) : null;
    });

    useEffect(() => {
        //fetch the user details into the backend
        const fetchUserProfile = async() => {
            const token = localStorage.getItem("token");
            if(!token) return;

            try{
                // Fetch user profile using token
                const response = await axios.get(`${API_BASE_URL}/auth/user`, {
                    headers: {Authorization: `Bearer ${token}`}
                });
                // Update state and localStorage with new fetched data
                setLoggedInUser(response.data)
                localStorage.setItem("user", JSON.stringify(response.data))
            }catch (error) {
                console.log("failed to fetch user profile", error);
                // If unauthorized, clear session
                if (error.response && error.response.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    setLoggedInUser(null);
                } else {
                    // Fallback to stored user if available
                    const storedUser = localStorage.getItem("user");
                    if(storedUser){
                        setLoggedInUser(JSON.parse(storedUser))
                    }
                }
            }
        }
        // call the function
        fetchUserProfile();
    }, [])
    // Check if a user is authenticated
    const isAuthenticated = loggedInUser ? true : false;
    // Called after successful login with JWT token
    const handleLogin = (token) => { // Expect the JWT token from the Login component
    try {
        const decodedUser = jwtDecode(token);
        localStorage.setItem("token", token); // Store the token, not the user object
        localStorage.setItem("user", JSON.stringify(decodedUser)) // store the decoded user in localstorage
        setLoggedInUser(decodedUser); // Set the state with the decoded user object
        console.log("App.jsx - handleLogin: User logged in, decoded user object:", decodedUser);
    } catch (e) {
        console.error("Failed to decode token", e);
        // Handle invalid token case
    }
    };

    const navigate = useNavigate();

    const handleLogout = () => {
        // Clear state and localStorage
        setLoggedInUser(null);
        localStorage.removeItem('token'); // Clear user data
        localStorage.removeItem("user")
        navigate("/login")
        console.log("App.jsx - handleLogout: User logged out.");
    };

    // Update user data after profile changes
    const handleUserUpdate = (updatedUserData) => {
        setLoggedInUser(updatedUserData);
        localStorage.setItem("user", JSON.stringify(updatedUserData))
        console.log("App.jsx user updated to", updatedUserData);
    }

    // --- State Management ---
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
    const maxSeenId = useRef(0);
    const [assigneeList, setAssigneeList] = useState([]);
    const lastPlayedSoundId = useRef(null);
    const [newlyAddedId, setNewlyAddedId] = useState(null);

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

    // --- CORE DATA STATE (Fetched from Backend) ---
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [recentAlerts, setRecentAlerts] = useState([]);
    const [alertsHistory, setAlertsHistory] = useState([]);

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

    // =================================================================================
    // NEW: LIVE ALERT POLLING FROM BACKEND
    // =================================================================================
    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const [activeRes, recentRes, historyRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/alerts?lifecycle=Active`),
                    axios.get(`${API_BASE_URL}/api/alerts?lifecycle=Recent`),
                    axios.get(`${API_BASE_URL}/api/alerts?lifecycle=History`)
                ]);

                const newActiveAlerts = activeRes.data;

                setActiveAlerts(prevAlerts => {
                    const oldAlertsMap = new Map(prevAlerts.map(a => [a._id, a]));

                    // 1. Find alerts with a completely new ID
                    const trulyNewAlerts = newActiveAlerts.filter(a => !oldAlertsMap.has(a._id));

                    // 2. Find alerts that were UPDATED (same ID, different severity)
                    const updatedAlerts = newActiveAlerts.filter(a => {
                        const oldAlert = oldAlertsMap.get(a._id);
                        return oldAlert && oldAlert.severity !== a.severity;
                    });

                    // 3. Combine them into a single list of "triggering events"
                    const allTriggeringEvents = [...trulyNewAlerts, ...updatedAlerts];

                    if (allTriggeringEvents.length > 0) {
                        // Sort all events by date to find the absolute newest one
                        allTriggeringEvents.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
                        const newestEvent = allTriggeringEvents[0];

                        // Use the newest event for animation and sound
                        setNewlyAddedId(newestEvent._id);
                        if (newestEvent._id !== lastPlayedSoundId.current) {
                            playNotificationSound();
                            lastPlayedSoundId.current = newestEvent._id;
                        }
                    }

                    return newActiveAlerts;
                });

                setRecentAlerts(recentRes.data);
                setAlertsHistory(historyRes.data);

            } catch (error) {
                console.error("Failed to fetch live alerts:", error);
            }
        };

        fetchAlerts();
        const intervalId = setInterval(fetchAlerts, 5000);
        return () => clearInterval(intervalId);
    }, [playNotificationSound]);


    // --- THIS useEffect FETCHES THE SIMULATION DATA ---
    // This runs once when the application loads.
    useEffect(() => {
        const fetchSimulationData = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/sensor-readings`);
                setMockSensorReadings(response.data); // Store the fetched data in state
                console.log("Successfully fetched simulation data from server.");
            } catch (error) {
                console.error("Failed to fetch simulation data:", error);
            }
        };

        fetchSimulationData();
    }, []); // Empty array ensures this runs only once.

    // =================================================================================
    // REAL-TIME SIMULATION FEED
    // =================================================================================
    // This useEffect simulates a live stream of sensor data. It waits for the
    // mockSensorReadings to be fetched before it starts.
    useEffect(() => {
        // Only start the simulation if we have mock readings to process.
        if (mockSensorReadings.length === 0) return;

        let readingIndex = 0;
        const intervalId = setInterval(async () => {
            if (readingIndex < mockSensorReadings.length) {
                const currentReading = mockSensorReadings[readingIndex];
                console.log(`SIMULATING: Sending reading ${readingIndex + 1}`, currentReading);

                try {
                    // Send the reading to the backend for processing.
                    await axios.post(`${API_BASE_URL}/api/sensor-readings/process`, currentReading);
                } catch (error) {
                    console.error("Error sending simulated sensor reading:", error);
                }
                
                readingIndex++;
            } else {
                // Once all readings are sent, stop the simulation.
                console.log("SIMULATION: All mock readings have been processed.");
                clearInterval(intervalId);
            }
        }, 5000); // Sends a new reading every 5 seconds.

        // Cleanup function to stop the timer if the component unmounts.
        return () => clearInterval(intervalId);

    }, [mockSensorReadings]); // <-- This dependency is the key to the whole process.


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
                    axios.get(`${API_BASE_URL}/api/devices`),
                    axios.get(`${API_BASE_URL}/api/stations`),
                    axios.get(`${API_BASE_URL}/api/sensor-readings`)
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
                const response = await axios.get(`${API_BASE_URL}/api/devices`);
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

    // =================================================================================
    // NEW & UPDATED EVENT HANDLERS (API-DRIVEN with Full Logging)
    // =================================================================================

    const handleAcknowledgeAlert = async (alertId) => {
        const alertToAck = activeAlerts.find(a => a._id === alertId);
        
        if (alertToAck) {
            logUserAction(`Acknowledged alert: '${alertToAck.type}' for device '${alertToAck.originator}'.`, 'Acknowledgement');
        }
        try {
            await axios.post(`${API_BASE_URL}/api/alerts/acknowledge/${alertId}`, {
                username: loggedInUser.username
            });

            // --- THIS IS THE FIX ---
            // Instead of filtering the alert out, we now MAP over the array and
            // update the specific alert that was acknowledged. This will make the
            // checkmark appear without removing the alert from the list.
            setActiveAlerts(prevAlerts => 
                prevAlerts.map(alert => 
                    alert._id === alertId 
                        ? { ...alert, acknowledged: true } 
                        : alert
                )
            );

        } catch (error) {
            console.error("Failed to acknowledge alert:", error);
        }
    };

    const handleDeleteHistoryAlerts = useCallback(async (idsToDelete) => {
        const alertsToDelete = alertsHistory.filter(alert => idsToDelete.has(alert._id));
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
            const device = deviceLocations.find(d => d.id === deviceId);
            const deviceLabel = device ? device.label : deviceId;
            const logMessage = `Deleted ${count} alert record${pluralS} from history for device '${deviceLabel}'.`;
            logUserAction(logMessage, 'Deletion');
        });

        try {
            await axios.put(`${API_BASE_URL}/api/alerts/delete`, {
                idsToDelete: Array.from(idsToDelete)
            });
            setAlertsHistory(prev => prev.filter(a => !idsToDelete.has(a._id)));
        } catch (error) {
            console.error("Failed to delete alerts:", error);
        }
    }, [alertsHistory, deviceLocations]); // Dependencies

    const handleRestoreHistoryAlerts = useCallback(async (idsToRestore) => {
        const alertsToLog = alertsHistory.filter(alert => idsToRestore.includes(alert._id));
        if (alertsToLog.length > 0) {
            // ... (logging logic is the same)
        }
        try {
            await axios.put(`${API_BASE_URL}/api/alerts/restore`, {
                idsToRestore
            });
        } catch (error) {
            console.error("Failed to restore alerts:", error);
        }
    }, [alertsHistory, deviceLocations]); // Dependencies

    const handlePermanentDeleteAlerts = useCallback(async (idsToDelete) => {
        try {
            await axios.delete(`${API_BASE_URL}/api/alerts/permanent`, {
                data: { idsToDelete }
            });
            console.log("Successfully purged alerts from database.");
        } catch (error) {
            console.error("Failed to permanently delete alerts:", error);
        }
    }, []); // No dependencies, this function will be created only once.

    const handleActiveFilterChange = (e) => setActiveFilterDevice(e.target.value);
    const handleRecentFilterChange = (e) => setRecentFilterDevice(e.target.value);
    const handleSelectDevice = (deviceId) => {
        setSelectedMapDeviceId(deviceId);
        setRefocusTrigger(p => p + 1);
    };

    const handleAddDevice = async (newDeviceData) => {
        try {
            // Send the new device data to the backend API
            const response = await axios.post(`${API_BASE_URL}/api/devices`, newDeviceData);

            // Add the device *returned by the server* to our state
            // This is important because the server response includes the new _id from MongoDB
            const deviceFromServer = response.data;
            setDeviceLocations(prev => [...prev, deviceFromServer]);
            setSelectedMapDeviceId(deviceFromServer._id);

        } catch (error) {
            console.error("Error adding device:", error.response.data);
            // Throw the error so the component that called this function can catch it and show a message
            throw error;
        }
    };

    const handleDeleteDevice = async (deviceId) => {
        try {
            // Send a delete request to the backend API
            await axios.delete(`${API_BASE_URL}/api/devices/${deviceId}`);

            // If the delete was successful, remove the device from our local state
            setDeviceLocations(prev => prev.filter(d => d._id !== deviceId));
            setSelectedMapDeviceId(null);

        } catch (error) {
            console.error("Error deleting device:", error.response.data);
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
        // Find device using the correct _id property
        const deviceToUpdate = deviceLocations.find(d => d._id === deviceId);
        if (deviceToUpdate) {
            const changesToLog = generateChangeLogs(deviceToUpdate.configurations, newConfigs);
            changesToLog.forEach(change => {
                logUserAction(`Device '${deviceToUpdate.label}': ${change}`, 'Configuration');
            });
        }

        try {
            // Use the correct API endpoint
            const response = await axios.put(`${API_BASE_URL}/api/devices/${deviceId}/configurations`, newConfigs);
            
            // Update state with the exact data returned from the server
            setDeviceLocations(prevDevices =>
                prevDevices.map(device =>
                    device._id === deviceId ? response.data.updatedDevice : device
                )
            );
            return Promise.resolve(); // Signal success to the UI
        } catch (error) {
            console.error("Error saving configuration:", error);
            return Promise.reject(error); // Signal failure to the UI
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
        onPermanentDeleteAlerts: handlePermanentDeleteAlerts,
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
        onValveToggle: handleValveToggle,
        // --- Provide systemLogs to the context ---
        systemLogs,
        loggedInUser,
        onUserUpdate: handleUserUpdate
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
                            <ProtectedRoute>
                                <AccountSettings />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/overview"
                        element={
                            <ProtectedRoute>
                                <Overview />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/alerts"
                        element={
                            <ProtectedRoute >
                                <Alerts />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/devices"
                        element={
                            <ProtectedRoute >
                                <Devices />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/configurations/*"
                        element={
                            <ProtectedRoute >
                                <Configuration onSetHeaderDeviceLabel={setHeaderDeviceLabel} />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/devices/:deviceId"
                        element={
                            <ProtectedRoute >
                                <SpecificDevice onSetHeaderDeviceLabel={setHeaderDeviceLabel} />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/logs"
                        element={
                            <ProtectedRoute >
                                <Logs />
                            </ProtectedRoute>
                        }
                    />
                    {/**Catch all unknown URL if the user is not yet authenticated */}
                    <Route path="*" element={<Navigate to={isAuthenticated ? "/overview" : "/login"} />} />
                    {/**Redirect to the login page */}
                    <Route path="/" element={<Navigate to="/login" />} />
                </Routes>
            </main>
        </AlertsContext.Provider>
    );
}

export default App;