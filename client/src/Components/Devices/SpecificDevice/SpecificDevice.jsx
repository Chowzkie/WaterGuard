import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ParamChart from './ParamChart';
import SpecificReadings from './SpecificReadings';
import ControlPanel from './controlPanel';
import Style from '../../../Styles/SpecificDeviceStyle/Specific.module.css';
import ToastStyle from '../../../Styles/ToastStyle/Toast.module.css'
import AlertsContext from '../../../utils/AlertsContext';
import { CheckCircle2, ShieldAlert, Waves, Thermometer, TestTube2, Gauge, X } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// --- Toast Component ---
// Handles visual rendering and exit animations for notifications
const NotificationToast = ({ message, type, status, onClose }) => {
    // Stops event bubbling and triggers unmount only when the exit animation completes
    const handleAnimationEnd = (e) => {
        e.stopPropagation(); 
        if (status === 'exiting') {
            onClose();
        }
    };

    const isSuccess = type === 'success';
    const title = isSuccess ? 'Success' : 'Error';
    const Icon = isSuccess ? CheckCircle2 : ShieldAlert;

    return (
        <div
            className={`
                ${ToastStyle.toast}
                ${isSuccess ? ToastStyle.toastSuccess : ToastStyle.toastError}
                ${status === 'exiting' ? ToastStyle.toastOutRight : ToastStyle.toastIn}
            `}
            onAnimationEnd={handleAnimationEnd}
        >
            <Icon className={ToastStyle.toastIcon} size={22} />
            <div className={ToastStyle.toastContent}>
                <h4>{title}</h4>
                <p>{message}</p>
                <button onClick={onClose} className={ToastStyle.toastClose}>
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

// --- Sensor Status Panel ---
// Renders the grid of sensor connectivity statuses (Online/Offline)
function SensorStatusPanel({ device }) {
    // Safely access nested state to prevent crashes during initial load
    const sensorStatus = device?.currentState?.sensorStatus;

    const formatSensorName = (name) => name.charAt(0) + name.slice(1).toLowerCase();

    // Maps backend sensor keys to specific Lucide icons
    const iconMap = {
        TURBIDITY: <Waves size={20} className={Style['sensor-icon']} />,
        TEMP: <Thermometer size={20} className={Style['sensor-icon']} />,
        TDS: <TestTube2 size={20} className={Style['sensor-icon']} />,
        PH: <Gauge size={20} className={Style['sensor-icon']} />
    };

    const getStatusClass = (status) => {
        return status === 'Online' ? Style.statusOnline : Style.statusOffline;
    };

    // Fallback UI if sensor status is undefined or null
    if (!sensorStatus) {
        return (
            <div className={Style['details-card']}>
                <h3 className={Style['card-title']}>Sensor Status</h3>
                <p>Sensor status data is not available.</p>
            </div>
        );
    }

    return (
        <div className={Style['details-card']}>
            <h3 className={Style['card-title']}>Sensor Status</h3>
            <div className={Style['sensor-grid']}>
                {/* Iterates through the sensorStatus object to render dynamic cards */}
                {Object.entries(sensorStatus).map(([sensor, data]) => (
                    <div key={sensor} className={Style['sensor-card']}>
                        <div className={Style['sensor-card-header']}>
                            {iconMap[sensor]}
                            <span className={Style['sensor-name']}>{formatSensorName(sensor)}</span>
                        </div>
                        <div className={Style['status-indicator']}>
                            <span className={`${Style['status-dot']} ${getStatusClass(data.status)}`}></span>
                            <span>{data.status}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- Details Panel ---
// Displays static or semi-static device metadata
function DetailsPanel({ device }) {
    return (
        <div className={Style['details-card']}>
            <h3 className={Style['card-title']}>Device Details</h3>
            <div className={Style['device-info']}>
                <p><strong>Label:</strong> {device.label}</p>
                <p><strong>Status:</strong> {device.currentState?.status || 'N/A'}</p>
                <p><strong>Location:</strong> {device.location}</p>
            </div>
        </div>
    );
}

// --- Main Component ---
function SpecificDevice({ onSetHeaderDeviceLabel, userID }) {
    // Context provides the live list of devices, updated via global socket listeners
    const { devices } = useContext(AlertsContext);
    const { deviceId } = useParams();
    const navigate = useNavigate();
    
    const [currentDevice, setCurrentDevice] = useState(null);
    const [toasts, setToasts] = useState([]);
    
    // Ref tracks timeouts to prevent memory leaks when clearing toasts
    const toastTimeouts = useRef({});

    const [historicalData, setHistoricalData] = useState([]);
    const [isChartLoading, setIsChartLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('7d'); 

    // Removes a toast from state and clears its specific timeout
    const removeToast = useCallback((id) => {
        setToasts((curr) => curr.filter(t => t.id !== id));
        if (toastTimeouts.current[id]) {
            clearTimeout(toastTimeouts.current[id]);
            delete toastTimeouts.current[id];
        }
    }, []);

    // Triggers the 'exiting' animation state
    const startToastExit = useCallback((id) => {
        setToasts(curr => curr.map(t => t.id === id ? { ...t, status: 'exiting' } : t));
    }, []);

    // Adds a new toast and sets the auto-dismiss timer
    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        const exitTimer = 5000; 
        
        setToasts(curr => [
            // Force existing toasts to exit immediately to prevent stacking overlap issues
            ...curr.map(t => ({ ...t, status: 'exiting' })), 
            { id, message, type, status: 'entering' }
        ]);
        
        toastTimeouts.current[id] = setTimeout(() => startToastExit(id), exitTimer);
    }, [startToastExit]);

    // Sends API command to toggle valve; UI updates via Context/Socket propagation
    const handleValveToggle = async (deviceId, isNowOpen) => {
        const newCommandValue = isNowOpen ? 'OPEN' : 'CLOSED';
        try {
            await axios.put(`${API_BASE_URL}/api/devices/${deviceId}/command`, {
                commandValue: newCommandValue,
                userID
            });
            addToast(`Command to ${newCommandValue.toLowerCase()} valve sent!`, 'success');
        } catch (error) {
            console.error('Failed to send valve command:', error);
            addToast('Error: Could not send command to device.', 'error');
        }
    };

    // Sends API command to toggle pump cycle
    const handlePumpToggle = async (deviceId, isNowOn) => {
        // Logic: Turning ON starts 'FILL' cycle; Turning OFF sets state to 'IDLE'
        const newCommandValue = isNowOn ? 'FILL' : 'IDLE';
        try {
            await axios.put(`${API_BASE_URL}/api/devices/${deviceId}/pumpCommand`, {
                commandValue: newCommandValue,
                userID
            });
            addToast(`Pump command ${newCommandValue.toLowerCase()} sent!`, 'success');
        } catch (error) {
            console.error('Failed to send pump command:', error);
            addToast('Error: Could not send pump command to device.', 'error');
        }
    };

    // Effect: Syncs local state with the global devices list from Context
    useEffect(() => {
        const foundDevice = devices.find(d => d._id === deviceId);
        setCurrentDevice(foundDevice);

        if (onSetHeaderDeviceLabel) {
            onSetHeaderDeviceLabel(foundDevice ? foundDevice.label : 'Device Details');
        }
    }, [deviceId, devices, onSetHeaderDeviceLabel]);

    // Effect: Fetches historical data when device ID or time range filter changes
    useEffect(() => {
        if (deviceId) {
            const fetchHistoricalData = async () => {
                setIsChartLoading(true);
                try {
                    const response = await axios.get(`${API_BASE_URL}/api/historical-readings/${deviceId}?range=${timeRange}`);
                    setHistoricalData(response.data);
                } catch (error) {
                    console.error(`Failed to fetch historical data for ${deviceId} with range ${timeRange}:`, error);
                    setHistoricalData([]);
                } finally {
                    setIsChartLoading(false);
                }
            };
            fetchHistoricalData();
        }
    }, [deviceId, timeRange]);

    const handleGoBack = () => navigate('/devices');

    // Early return to prevent rendering children before data is available
    if (!currentDevice) {
        return <div className={Style['loading-container']}>Loading device data or Device not found...</div>;
    }

    return (
        <>
             <div className={Style['page-container']}>
                <ParamChart
                    historicalData={historicalData}
                    isLoading={isChartLoading}
                    onGoBack={handleGoBack}
                    timeRange={timeRange}
                    setTimeRange={setTimeRange}
                    deviceStatus={currentDevice.currentState?.status}
                />
                <SpecificReadings
                    deviceReadings={currentDevice.latestReading}
                    deviceId={deviceId}
                    deviceStatus={currentDevice.currentState?.status}
                    thresholds={currentDevice.configurations?.thresholds}
                />
                <div className={Style['bottom-left-wrapper']}>
                    <SensorStatusPanel device={currentDevice} />
                    <DetailsPanel device={currentDevice} />
                </div>
                <ControlPanel
                    deviceId={deviceId}
                    deviceStatus={currentDevice.currentState?.status}
                    valveState={currentDevice.currentState?.valve}
                    pumpState={currentDevice.currentState?.pump || 'OFF'} 
                    pumpCycle={currentDevice.currentState?.pumpCycle}
                    onValveToggle={handleValveToggle}
                    onPumpToggle={handlePumpToggle}
                    addToast={addToast}
                />
            </div>

            {/* Toast container */}
            <div className={ToastStyle.toastContainerWrapper}>
                <div className={ToastStyle.toastContainer}>
                    {toasts.map(t => (
                        <NotificationToast 
                            key={t.id} 
                            {...t} 
                            onClose={() => removeToast(t.id)} 
                        />
                    ))}
                </div>
            </div>
        </>
    );
}

export default SpecificDevice;
