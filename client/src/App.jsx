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

import routeTitleMap from './utils/routeTitleMap';

// Define your backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // Make sure this matches your backend port

/**
 * Generates a list of human-readable log messages by comparing old and new configuration objects.
 * @param {object} oldConfigs - The configuration object before changes.
 * @param {object} newConfigs - The configuration object after changes.
 * @returns {string[]} An array of log message strings.
 */

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

    const navigate = useNavigate();

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


    useEffect(() => {
        //socket.on("connect", () => console.log("✅ Socket connected:", socket.id));
        //socket.on("disconnect", () => console.log("❌ Socket disconnected"));

        socket.on("deviceUpdate", (updatedDevice) => {
            setDeviceLocations(prev => {
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

    //// State for the currently logged-in user
    // Initialize from localStorage if available
    const [loggedInUser, setLoggedInUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        return savedUser? JSON.parse(savedUser) : null;
    });

    const userID = loggedInUser?._id //A helper to set the loggedin user

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
            setDeviceLocations([]);
            setPumpingStations([]);
            navigate('/login');
        }
    };

    // Update user data after profile changes
    const handleUserUpdate = (updatedUserData) => {
        setLoggedInUser(updatedUserData);
        localStorage.setItem("user", JSON.stringify(updatedUserData))
    }

    // --- State Management ---

    const [deviceLocations, setDeviceLocations] = useState([]);
    const [pumpingStations, setPumpingStations] = useState([]);

    const [selectedMapDeviceId, setSelectedMapDeviceId] = useState(null);
    const [refocusTrigger, setRefocusTrigger] = useState(0);

    const [activeFilterDevice, setActiveFilterDevice] = useState('All Devices');
    const [recentFilterDevice, setRecentFilterDevice] = useState('All Devices');

    const backToNormalTimers = useRef(new Map());
    const maxSeenId = useRef(0);
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

    // --- old addNotification function ---
    
    // --- Utility function for creating System Logs (from original file) ---
    // ---  Removed call to setSystemLogs which is not defined ---
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
    useEffect(() => {
        // This function maps a system log from the DB to a notification object
        const mapLogToNotification = (log) => {
            const device = deviceLocations.find(d => d._id === log.deviceId);
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
            if (deviceLocations.length === 0) return; // Wait for devices to load

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

    }, [deviceLocations, playNotificationSound, isAuthenticated]); // Re-run if devices load


    //  handler to allow child components to signal animation completion
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

    // ---  fetches all initial data required for the application ---
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [devicesRes, stationsRes, sensorReadingsRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/devices`),
                    axios.get(`${API_BASE_URL}/api/stations`)
                ]);
                setDeviceLocations(devicesRes.data);
setPumpingStations(stationsRes.data);
                // --- Prime the ref with the initial device state ---
                previousDevicesRef.current = devicesRes.data;
            } catch (error) {
                console.error("Error fetching initial data:", error);
            }
        };
        fetchInitialData();
    }, []);

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
                setDeviceLocations(latestDevices);
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

    const handleAcknowledgeAlert = async (alertId) => {
        try {
            await axios.post(`${API_BASE_URL}/api/alerts/acknowledge/${alertId}`, {
                userID
            });

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

        try {
            await axios.put(`${API_BASE_URL}/api/alerts/delete`, {
                idsToDelete: Array.from(idsToDelete),
                userID
            });
            setAlertsHistory(prev => prev.filter(a => !idsToDelete.has(a._id)));
        } catch (error) {
            console.error("Failed to delete alerts:", error);
        }
    }, [alertsHistory, deviceLocations]); // Dependencies

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

    const handleActiveFilterChange = (e) => setActiveFilterDevice(e.target.value);
    const handleRecentFilterChange = (e) => setRecentFilterDevice(e.target.value);
    const handleSelectDevice = (deviceId) => {
        setSelectedMapDeviceId(deviceId);
        setRefocusTrigger(p => p + 1);
    };

    const handleAddDevice = async (newDeviceData) => {
        try {
            // Send the new device data to the backend API
            const response = await axios.post(`${API_BASE_URL}/api/devices`, {...newDeviceData, userID});

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
            await axios.delete(`${API_BASE_URL}/api/devices/${deviceId}`, {
                data: {userID}
            });

            // If the delete was successful, remove the device from our local state
            setDeviceLocations(prev => prev.filter(d => d._id !== deviceId));
            setSelectedMapDeviceId(null);

        } catch (error) {
            console.error("Error deleting device:", error.response.data);
        }
    };
    
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

    // --- handleSaveConfiguration sends a PUT request and logs changes ---
    const handleSaveConfiguration = useCallback(async (deviceId, newConfigs) => {

        try {
            // Use the correct API endpoint
            const response = await axios.put(`${API_BASE_URL}/api/devices/${deviceId}/configurations`, {newConfigs, userID});
            
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


    // =================================================================================
    // --- Handlers for managing notification read status ---
    // =================================================================================
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
                    unreadCount={unreadCount} // Pass the new unreadCount state
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