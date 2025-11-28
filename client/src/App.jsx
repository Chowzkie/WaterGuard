import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import socket from "./socket";
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
import ForgotPassword from './Components/ForgotPassword';

import routeTitleMap from './utils/routeTitleMap';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// =================================================================================
// APP COMPONENT
// =================================================================================
function App() {
    const location = useLocation();

    const noHeaderPaths = ['/login', '/forgot-password'];
    const noNavPaths = ['/login', '/account-settings', '/logs', '/forgot-password'];

    const showHeader = !noHeaderPaths.includes(location.pathname);
    const showNavigation = !noNavPaths.includes(location.pathname);
    const [headerDeviceLabel, setHeaderDeviceLabel] = useState(null);

    const navigate = useNavigate();

    /**
     * Effect hook to reset the header device label when navigating to main paths.
     * Ensures that specific device labels don't persist on general overview pages.
     */
    useEffect(() => {
        // List of paths where the header should reset to default (no device label)
        const mainPaths = [
            '/overview', 
            '/dashboard', 
            '/alerts', 
            '/devices', 
            '/logs', 
            '/account-settings'
        ];

        // If the current path is one of the main paths, clear the specific device label
        if (mainPaths.includes(location.pathname)) {
            setHeaderDeviceLabel(null);
        }
    }, [location.pathname]);


    /**
     * Effect hook to manage socket event listeners.
     * Listens for 'deviceUpdate' events to update the local devices state in real-time.
     */
    useEffect(() => {
        //socket.on("connect", () => console.log("✅ Socket connected:", socket.id));
        //socket.on("disconnect", () => console.log("❌ Socket disconnected"));

        socket.on("deviceUpdate", (updatedDevice) => {
            setDevices(prev => {
            const idx = prev.findIndex(d => d._id === updatedDevice._id);
            if (idx === -1) return [...prev, updatedDevice];
            const copy = [...prev];
            copy[idx] = updatedDevice;
            return copy;
            });
        });
        
        socket.on("newReading", (payload) => {
        });

        return () => {
            socket.off("deviceUpdate");
            socket.off("newReading");
        };
    }, []);

    /**
     * Effect hook to dynamically update the document title based on the current route.
     * Handles specific titles for device details and configuration pages.
     */
    // Use to dynamically change the document title when logging out
    useEffect(() => {
        let currentTitle = "WaterGuard";

        if (headerDeviceLabel) {
            if (location.pathname.startsWith("/devices/")) {
            currentTitle = `Device | ${headerDeviceLabel}`;
            } else if (location.pathname.startsWith("/configurations/")) {
            currentTitle = `Configuration | ${headerDeviceLabel}`;
            } else {
            currentTitle = routeTitleMap[location.pathname];
            }
        } else {
            currentTitle = routeTitleMap[location.pathname] || "WaterGuard";
        }

        document.title = `WaterGuard | ${currentTitle}`;
    }, [location.pathname, headerDeviceLabel]);

    // State for the currently logged-in user
    // Initialize from localStorage if available
    const [loggedInUser, setLoggedInUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        return savedUser? JSON.parse(savedUser) : null;
    });

    const userID = loggedInUser?._id //A helper to set the loggedin user

    /**
     * Effect hook to fetch the user profile from the backend using the stored token.
     * Verifies authentication and updates user state or clears session on failure.
     */
    useEffect(() => {
        //fetch the user details into the backend
        const fetchUserProfile = async() => {
            const token = localStorage.getItem("token");
            if(!token) return;

            try{
                // Fetch user profile using token
                const response = await axios.get(`${API_BASE_URL}/api/auth/user`, {
                    headers: {Authorization: `Bearer ${token}`}
                });
                // Update state and localStorage with new fetched data
                setLoggedInUser(response.data)
                localStorage.setItem("user", JSON.stringify(response.data))
            }catch (error) {
                //console.log("failed to fetch user profile", error);
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
    
    /**
     * Handler for user login.
     * Stores the JWT token and user data in local storage and updates state.
     * @param {string} token - The JWT authentication token.
     * @param {object} user - The user data object.
     */
    // Called after successful login with JWT token
    const handleLogin = (token, user) => { // Expect the JWT token from the Login component
    try {
        localStorage.setItem("token", token); // Store the token, not the user object
        localStorage.setItem("user", JSON.stringify(user)) // store the decoded user in localstorage
        setLoggedInUser(user); 
        //console.log("App.jsx - user logged in:", user);
    } catch (e) {
        console.error("Failed to get user", e);
        // Handle invalid token case
    }
    };

    /**
     * Handler for user logout.
     * Calls the logout API, clears local storage and application state, and navigates to login.
     */
    const handleLogout = async() => {
        try{
            await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, {
                headers: {Authorization: `Bearer ${localStorage.getItem("token")}`}
            })
        }catch(error){
            console.error("Logout Error", error)
        }finally{
            // Clear all user/session-related data
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setLoggedInUser(null);
            setNotifications([]);
            setActiveAlerts([]);
            setRecentAlerts([]);
            setAlertsHistory([]);
            setDevices([]);
            setPumpingStations([]);
            navigate('/login');
        }
    };

    /**
     * Handler to update user data in state and local storage after profile changes.
     * @param {object} updatedUserData - The updated user data object.
     */
    // Update user data after profile changes
    const handleUserUpdate = (updatedUserData) => {
        setLoggedInUser(updatedUserData);
        localStorage.setItem("user", JSON.stringify(updatedUserData))
    }

    // --- State Management ---

    const [devices, setDevices] = useState([]);
    const [pumpingStations, setPumpingStations] = useState([]);

    const [selectedMapDeviceId, setSelectedMapDeviceId] = useState(null);
    const [refocusTrigger, setRefocusTrigger] = useState(0);

    const [activeFilterDevice, setActiveFilterDevice] = useState('All Devices');
    const [recentFilterDevice, setRecentFilterDevice] = useState('All Devices');

    const lastPlayedSoundId = useRef(null);
    const [newlyAddedId, setNewlyAddedId] = useState(null);

    // --- Ref to hold previous device state to prevent inaccurate logging ---
    const previousDevicesRef = useRef([]);

    // --- STATE MANAGEMENT FOR NOTIFICATIONS ---
    const [notifications, setNotifications] = useState([]); // Now holds logs from DB
    const [unreadCount, setUnreadCount] = useState(0); // For the badge
    const processedLogIds = useRef(new Set()); // To track seen logs and prevent duplicates

    // --- CORE DATA STATE (Fetched from Backend) ---
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [recentAlerts, setRecentAlerts] = useState([]);
    const [alertsHistory, setAlertsHistory] = useState([]);

    // =================================================================================
    // --- SEPARATE SOUND FUNCTIONS ---
    // =================================================================================

    /**
     * Plays the audio sound specifically for active alerts.
     * Includes error handling if playback fails (e.g., browser restrictions).
     */
    // Sound for the ACTIVE ALERTS UI
    const playAlertSound = useCallback(() => {
        const audio = new Audio('/Notification.mp3');
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Could not play alert sound automatically.", error);
            });
        }
    }, []);

    /**
     * Plays the audio sound for general system notifications.
     */
    // Sound for the NOTIFICATION COMPONENT (dropdown)
    const playNotificationSound = useCallback(() => {
        const audio = new Audio('/Notification-2.mp3'); // Your new sound file
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Could not play notification component sound automatically.", error);
            });
        }
    }, []);

    // =================================================================================
    // LIVE ALERT POLLING (Sound only)
    // =================================================================================
    
    /**
     * Effect hook to poll for active, recent, and history alerts.
     * Detects new or updated active alerts to trigger sound notifications and highlight new items.
     */
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
                    const trulyNewAlerts = newActiveAlerts.filter(a => !oldAlertsMap.has(a._id));
                    const updatedAlerts = newActiveAlerts.filter(a => {
                        const oldAlert = oldAlertsMap.get(a._id);
                        return oldAlert && oldAlert.severity !== a.severity;
                    });
                    const allTriggeringEvents = [...trulyNewAlerts, ...updatedAlerts];

                    if (allTriggeringEvents.length > 0) {
                        allTriggeringEvents.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
                        const newestEvent = allTriggeringEvents[0];
                        setNewlyAddedId(newestEvent._id);
                        
                        if (newestEvent._id !== lastPlayedSoundId.current) {
                            // --- Plays sound for ALERTS only ---
                            if (isAuthenticated) {
                                playAlertSound(); 
                            }
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
    }, [playAlertSound, isAuthenticated]); // --- Dependency updated
    
    // --- Utility function for creating System Logs (from original file) ---
    
    /**
     * Helper function to log system events to the console.
     * @param {object} logData - The data associated with the system event.
     */
    const logSystemEvent = useCallback((logData) => {
        const newLog = {
            id: Date.now() + Math.random(),
            dateTime: new Date().toISOString(),
            ...logData,
        };
        // setSystemLogs(prevLogs => [newLog, ...prevLogs]); // This state does not exist
        console.log("System event logged:", newLog);
    }, []);

    // =================================================================================
    // --- NOTIFICATION POLLING FROM DATABASE ---
    // =================================================================================
    
    /**
     * Effect hook to poll for system logs and map them to user notifications.
     * Fetches unread logs, updates the unread count badge, and plays notification sounds.
     */
    useEffect(() => {
        // This function maps a system log from the DB to a notification object
        const mapLogToNotification = (log) => {
            const device = devices.find(d => d._id === log.deviceId);
            const deviceLabel = device ? device.label : 'System';

            let notifType = 'Info';
            const detailsLower = log.details ? log.details.toLowerCase() : '';
            
            if (detailsLower.includes('offline') || detailsLower.includes('heartbeat missed')) {
                notifType = 'DeviceOffline';
            } else if (detailsLower.includes('online')) {
                notifType = 'DeviceOnline';
            } else if (log.component === 'alert' || detailsLower.includes('critical')) {
                notifType = 'CriticalAlert';
            } else if (log.component === 'valve') {
                notifType = 'ValveShutOff';
            }
            
            return {
                ...log, // Includes _id, createdAt, read, etc. from the DB
                message: `${deviceLabel}: ${log.details}`, // Add the mapped message
                type: notifType, // Add the mapped type
            };
        };

        const fetchNotifications = async () => {
            if (devices.length === 0) return; // Wait for devices to load

            try {
                // Fetch all logs from the last 24 hours
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const response = await axios.get(`${API_BASE_URL}/api/logs/systemlogs?since=${twentyFourHoursAgo}`);
                
                const dbLogs = response.data;
                let hasNewUnreadLogs = false;
                let currentUnreadCount = 0;

                const newNotifications = dbLogs.map(log => {
                    // Count unread logs
                    if (!log.read) {
                        currentUnreadCount++;
                    }
                    
                    // Check if this is a new unread log
                    if (!log.read && !processedLogIds.current.has(log._id)) {
                        hasNewUnreadLogs = true;
                    }
                    
                    // Add all fetched logs to the processed set
                    processedLogIds.current.add(log._id);
                    
                    // Map the log to the notification structure
                    return mapLogToNotification(log);
                });

                // Set the state
                setNotifications(newNotifications);
                setUnreadCount(currentUnreadCount);

                // Play sound *once* if new unread logs were found
                if (hasNewUnreadLogs && isAuthenticated) {
                    playNotificationSound();
                }

            } catch (error) {
                console.error("Error fetching notifications:", error);
            }
        };
        
        fetchNotifications(); // Initial fetch
        const intervalId = setInterval(fetchNotifications, 7000); // Poll every 7 seconds
        return () => clearInterval(intervalId);

    }, [devices, playNotificationSound, isAuthenticated]); // Re-run if devices load


    /**
     * Resets the newly added ID state after animation completion.
     * Used for highlighting new alerts in the UI.
     */
    //  handler to allow child components to signal animation completion
    const handleAnimationComplete = () => {
        setNewlyAddedId(null);
    };
    

    /**
     * Effect hook to fetch initial device and station data on component mount.
     */
    // ---  fetches all initial data required for the application ---
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [devicesRes, stationsRes, sensorReadingsRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/devices`),
                    axios.get(`${API_BASE_URL}/api/stations`)
                ]);
                setDevices(devicesRes.data);
                setPumpingStations(stationsRes.data);
                // --- Prime the ref with the initial device state ---
                previousDevicesRef.current = devicesRes.data;
            } catch (error) {
                console.error("Error fetching initial data:", error);
            }
        };
        fetchInitialData();
    }, []);

    /**
     * Effect hook to periodically poll for device status changes and log system events.
     * Compares current device status with previous state to detect changes.
     */
   // --- This useEffect ONLY logs events. It no longer adds notifications. ---
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

                        // The polling hook will pick up the new log from the DB
                    }
                });

                // Update the main state and the ref for the next poll
                setDevices(latestDevices);
                previousDevicesRef.current = latestDevices;

            } catch (error) {
                console.error("Error polling for device statuses:", error);
            }
        };

        const pollInterval = setInterval(pollDeviceStatus, 10000);
        return () => clearInterval(pollInterval);
    }, [logSystemEvent]); // ---  Dependency updated

    // =================================================================================
    //  UPDATED EVENT HANDLERS (API-DRIVEN with Full Logging)
    // =================================================================================

    /**
     * Handles the acknowledgement of an alert.
     * Calls the backend API and updates the local state to reflect the change.
     * @param {string} alertId - The ID of the alert to acknowledge.
     */
    const handleAcknowledgeAlert = async (alertId) => {
        try {
            await axios.post(`${API_BASE_URL}/api/alerts/acknowledge/${alertId}`, {
                userID
            });

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

    /**
     * Handles the deletion of historical alerts.
     * Calls the backend API to perform soft deletion and updates local state.
     * @param {Set} idsToDelete - A set of alert IDs to be deleted.
     */
    const handleDeleteHistoryAlerts = useCallback(async (idsToDelete) => {
        const alertsToDelete = alertsHistory.filter(alert => idsToDelete.has(alert._id));
        if (alertsToDelete.length === 0) return;

        try {
            await axios.put(`${API_BASE_URL}/api/alerts/delete`, {
                idsToDelete: Array.from(idsToDelete),
                userID
            });
            setAlertsHistory(prev => prev.filter(a => !idsToDelete.has(a._id)));
        } catch (error) {
            console.error("Failed to delete alerts:", error);
        }
    }, [alertsHistory, devices]); // Dependencies

    /**
     * Handles the restoration of soft-deleted alerts.
     * Calls the backend API and updates local state with restored alerts.
     * @param {Array} alertsToRestore - An array of alert objects to restore.
     */
    const handleRestoreHistoryAlerts = useCallback(async (alertsToRestore) => {
        // Guard clause in case it's empty or undefined
        if (!alertsToRestore || alertsToRestore.length === 0) return;

        // Extract IDs for the API call
        const idsToRestore = alertsToRestore.map(a => a._id);

        try {
            // 1. Update the Database
            await axios.put(`${API_BASE_URL}/api/alerts/restore`, {
                idsToRestore,
                userID
            });

            // 2. Update the UI immediately 
            setAlertsHistory(prev => {
                // Create a Set of existing IDs to prevent duplicates
                const existingIds = new Set(prev.map(a => a._id));
                
                // Only add alerts that aren't already in the list
                const newAlerts = alertsToRestore.filter(a => !existingIds.has(a._id));
                
                // Return new combined array sorted by date 
                const updatedList = [...prev, ...newAlerts];
                return updatedList.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
            });

        } catch (error) {
            console.error("Failed to restore alerts:", error);
        }
    }, [userID]);

    /**
     * Handler for changing the filter for active alerts.
     * @param {Event} e - The change event object.
     */
    const handleActiveFilterChange = (e) => setActiveFilterDevice(e.target.value);
    
    /**
     * Handler for changing the filter for recent alerts.
     * @param {Event} e - The change event object.
     */
    const handleRecentFilterChange = (e) => setRecentFilterDevice(e.target.value);
    
    /**
     * Handler to select a device on the map and trigger a refocus action.
     * @param {string} deviceId - The ID of the device to select.
     */
    const handleSelectDevice = (deviceId) => {
        setSelectedMapDeviceId(deviceId);
        setRefocusTrigger(p => p + 1);
    };

    /**
     * Handles adding a new device.
     * Posts new device data to the backend and updates local state on success.
     * @param {object} newDeviceData - The data for the new device.
     */
    const handleAddDevice = async (newDeviceData) => {
        try {
            // Send the new device data to the backend API
            const response = await axios.post(`${API_BASE_URL}/api/devices`, {...newDeviceData, userID});

            // Add the device *returned by the server* to our state
            // This is important because the server response includes the new _id from MongoDB
            const deviceFromServer = response.data;
            setDevices(prev => [...prev, deviceFromServer]);
            setSelectedMapDeviceId(deviceFromServer._id);

        } catch (error) {
            console.error("Error adding device:", error.response.data);
            // Throw the error so the component that called this function can catch it and show a message
            throw error;
        }
    };

    /**
     * Handles deleting a device.
     * Sends a delete request to the backend and removes the device from local state.
     * @param {string} deviceId - The ID of the device to delete.
     */
    const handleDeleteDevice = async (deviceId) => {
        try {
            // Send a delete request to the backend API
            await axios.delete(`${API_BASE_URL}/api/devices/${deviceId}`, {
                data: {userID}
            });

            // If the delete was successful, remove the device from our local state
            setDevices(prev => prev.filter(d => d._id !== deviceId));
            setSelectedMapDeviceId(null);

        } catch (error) {
            console.error("Error deleting device:", error.response.data);
        }
    };
    
    /**
     * Handles batch updating pumping stations.
     * Sends the full list of stations to the backend for synchronization.
     * @param {Array} updatedStations - The updated list of pumping stations.
     */
    const handleSaveStations = async (updatedStations) => {
        try {
            // Send the required payload structure with userID for logging
            const response = await axios.post(`${API_BASE_URL}/api/stations/batch-update`, {
                stationsFromClient: updatedStations,
                userID: userID 
            });

            // Update the frontend state with the final, authoritative list from the server
            setPumpingStations(response.data);
            console.log("Successfully saved stations to the database.");

        } catch (error) {
            console.error("Error saving stations:", error);
        }
    };

    /**
     * Handles saving device configuration changes.
     * Sends a PUT request to the backend and updates local state.
     * @param {string} deviceId - The ID of the device being configured.
     * @param {object} newConfigs - The new configuration settings.
     * @returns {Promise} - A promise that resolves on success or rejects on failure.
     */
    // --- handleSaveConfiguration sends a PUT request and logs changes ---
    const handleSaveConfiguration = useCallback(async (deviceId, newConfigs) => {

        try {
            // Use the correct API endpoint
            const response = await axios.put(`${API_BASE_URL}/api/devices/${deviceId}/configurations`, {newConfigs, userID});
            
            // Update state with the exact data returned from the server
            setDevices(prevDevices =>
                prevDevices.map(device =>
                    device._id === deviceId ? response.data.updatedDevice : device
                )
            );
            return Promise.resolve(); // Signal success to the UI
        } catch (error) {
            console.error("Error saving configuration:", error);
            return Promise.reject(error); // Signal failure to the UI
        }
    }, [devices]);


    // =================================================================================
    // --- Handlers for managing notification read status ---
    // =================================================================================
    
    /**
     * Marks a single notification as read.
     * Performs an optimistic UI update and sends a request to the backend.
     * @param {string} notificationId - The ID of the notification to mark as read.
     */
    const handleMarkNotificationAsRead = useCallback(async (notificationId) => {
        // Optimistic UI update: Mark as read immediately
        setNotifications(prev =>
            prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
        );
        // Also update the unread count immediately
        setUnreadCount(prev => prev - 1);

        // Send request to backend
        try {
            await axios.put(`${API_BASE_URL}/api/logs/systemlogs/read/${notificationId}`);
            // No need to refetch, UI is already updated
        } catch (error) {
            console.error("Failed to mark as read:", error);
            // If API fails, roll back the UI change (optional)
            setNotifications(prev =>
                prev.map(n => n._id === notificationId ? { ...n, read: false } : n)
            );
            setUnreadCount(prev => prev + 1);
        }
    }, []); // Empty dependency array

    /**
     * Marks all visible unread notifications as read.
     * Performs an optimistic UI update and sends a batch request to the backend.
     */
    const handleMarkAllNotificationsAsRead = useCallback(async () => {
        // Find all unread IDs currently visible
        const unreadIds = notifications
            .filter(n => !n.read)
            .map(n => n._id);
        
        if (unreadIds.length === 0) return;

        // Optimistic UI update
        setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
        );
        setUnreadCount(0);
        
        // Send request to backend
        try {
            await axios.put(`${API_BASE_URL}/api/logs/systemlogs/read/all`, { ids: unreadIds });
            // No need to refetch
        } catch (error) {
            console.error("Failed to mark all as read:", error);
            // Roll back UI on failure (optional)
            setNotifications(prev =>
                prev.map(n => unreadIds.includes(n._id) ? { ...n, read: false } : n)
            );
            setUnreadCount(unreadIds.length);
        }
    }, [notifications]); // Depends on the current list of notifications

    const contextValue = {
        activeAlerts,
        recentAlerts,
        alertsHistory,
        devices,
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
                    notifications={notifications}
                    unreadCount={unreadCount} 
                    onMarkNotificationAsRead={handleMarkNotificationAsRead}
                    onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
                />
            }
            {isAuthenticated && showNavigation && <Navigation />}
            <main>
                <Routes>
                    <Route path="/login" element={<Login onLogin={handleLogin} />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    
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
                                <SpecificDevice onSetHeaderDeviceLabel={setHeaderDeviceLabel} userID={userID}/>
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