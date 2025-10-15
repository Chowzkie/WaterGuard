import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ParamChart from './ParamChart';
import SpecificReadings from './SpecificReadings';
import ValveSwitch from './ValveSwitch';
import ControlPanel from './controlPanel';
import Style from '../../../Styles/SpecificDeviceStyle/Specific.module.css';
import ToastStyle from '../../../Styles/ToastStyle/Toast.module.css'
import AlertsContext from '../../../utils/AlertsContext';
import { CheckCircle2, AlertCircle,  Waves, Thermometer, TestTube2, Gauge } from 'lucide-react';
import io from 'socket.io-client'; 

//add toast 
const Toast = ({ message, type, status, onClose }) => {
    const handleAnimationEnd = () => {
        if (status === 'exiting') onClose();
    };
    return (
        <div
            className={`
                ${ToastStyle.toast}
                ${type === 'success' ? ToastStyle.toastSuccess : ToastStyle.toastError}
                ${status === 'exiting' ? ToastStyle.toastOutRight : ToastStyle.toastIn}
            `}
            onAnimationEnd={handleAnimationEnd}
        >
            {type === 'success'
                ? <CheckCircle2 className={ToastStyle.toastIcon} />
                : <AlertCircle className={ToastStyle.toastIcon} />}
            <span>{message}</span>
        </div>
    );
};


function SensorStatusPanel({ device }) {
    /* 1. Get sensor status directly from the device prop.
       We use optional chaining (?.) to prevent errors if the data hasn't loaded yet. */
    const sensorStatus = device?.currentState?.sensorStatus;

    // A helper function to make sensor names look nice (e.g., "TEMP" -> "Temp")
    const formatSensorName = (name) => name.charAt(0) + name.slice(1).toLowerCase();

    // 2. Update the iconMap keys to match the database schema (PH, TDS, etc.)
    const iconMap = {
        TURBIDITY: <Waves size={20} className={Style['sensor-icon']} />,
        TEMP: <Thermometer size={20} className={Style['sensor-icon']} />,
        TDS: <TestTube2 size={20} className={Style['sensor-icon']} />,
        PH: <Gauge size={20} className={Style['sensor-icon']} />
    };

    const getStatusClass = (status) => {
        // This function remains the same
        return status === 'Online' ? Style.statusOnline : Style.statusOffline;
    };

    /* 3. Add a check for missing data.
       If sensorStatus isn't available, we show a message instead of crashing. */
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
                {/* We now map over the live data from the database */}
                {Object.entries(sensorStatus).map(([sensor, data]) => (
                    <div key={sensor} className={Style['sensor-card']}>
                        <div className={Style['sensor-card-header']}>
                            {iconMap[sensor]}
                            {/* We use the helper to format the name for display */}
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


function DetailsPanel({ device }) {
    return (
        <div className={Style['details-card']}>
            <h3 className={Style['card-title']}>Device Details</h3>
            <div className={Style['device-info']}>
                <p><strong>Label:</strong> {device.label}</p>
                {/* Use the correct path for status */}
                <p><strong>Status:</strong> {device.currentState?.status || 'N/A'}</p>
                <p><strong>Location:</strong> {device.location}</p>
            </div>
        </div>
    );
}

const API_BASE_URL = 'http://localhost:8080';
const socket = io(API_BASE_URL); // 👈 2. ESTABLISH THE CONNECTION ONCE

function SpecificDevice({ onSetHeaderDeviceLabel, userID }) {
    const { devices, setDevices } = useContext(AlertsContext);
    const { deviceId } = useParams();
    const navigate = useNavigate();
    const [currentDevice, setCurrentDevice] = useState(null);

    const [toasts, setToasts] = useState([]);
    const toastTimeouts = useRef({});

    const [historicalData, setHistoricalData] = useState([]);
    const [isChartLoading, setIsChartLoading] = useState(true);

    const [timeRange, setTimeRange] = useState('7d'); // Default to 7 days

    // 👇 ADD THIS ENTIRE useEffect BLOCK
    useEffect(() => {
        // Listen for 'deviceUpdate' events from the server
        socket.on('deviceUpdate', (updatedDevice) => {
            console.log('Received real-time update:', updatedDevice);
            // This updates the master list of devices for your whole app
            setDevices(prevDevices =>
                prevDevices.map(d => d._id === updatedDevice._id ? updatedDevice : d)
            );
        });

        // This is a cleanup function. It removes the event listener
        // when the component is unmounted to prevent memory leaks.
        return () => {
            socket.off('deviceUpdate');
        };
    }, [setDevices]); // The dependency array ensures this sets up only once

    const removeToast = useCallback((id) => {
        setToasts((curr) => curr.filter(t => t.id !== id));
        if (toastTimeouts.current[id]) {
            clearTimeout(toastTimeouts.current[id]);
            delete toastTimeouts.current[id];
        }
    }, []);

    const startToastExit = useCallback((id) => {
        setToasts(curr => curr.map(t => t.id === id ? { ...t, status: 'exiting' } : t));
    }, []);

    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(curr => [
            ...curr.map(t => ({ ...t, status: 'exiting' })),
            { id, message, type, status: 'entering' }
        ]);
        toastTimeouts.current[id] = setTimeout(() => startToastExit(id), 3000);
    }, [startToastExit]);

    // NEW: Handler function to call the backend
    const handleValveToggle = async (deviceId, isNowOpen) => {
        const newCommandValue = isNowOpen ? 'OPEN' : 'CLOSED';
        try {
            // The only job is to send the command to the correct endpoint
            await axios.put(`${API_BASE_URL}/api/devices/${deviceId}/command`, {
                commandValue: newCommandValue,
                userID
            });
            // The UI will update automatically via the socket event.
            // You can add a success toast here if you want immediate feedback.
            addToast(`Command to ${newCommandValue.toLowerCase()} valve sent!`, 'success');
        } catch (error) {
            console.error('Failed to send valve command:', error);
            addToast('Error: Could not send command to device.', 'error');
        }
    };

    const handlePumpToggle = async (deviceId, isNowOn) => {
    // Map boolean switch to command value
    // If turning ON -> start cycle with 'FILL' (we start with filling)
    // If turning OFF -> 'IDLE' to stop the cycle
    const newCommandValue = isNowOn ? 'FILL' : 'IDLE';
    try {
        await axios.put(`${API_BASE_URL}/api/devices/${deviceId}/pumpCommand`, {
        commandValue: newCommandValue,
        userID
        });
        addToast(`Pump command ${newCommandValue.toLowerCase()} sent!`, 'success');
        // UI will update when server emits deviceUpdate via socket
    } catch (error) {
        console.error('Failed to send pump command:', error);
        addToast('Error: Could not send pump command to device.', 'error');
    }
    };

    useEffect(() => {
        const foundDevice = devices.find(d => d._id === deviceId);
        setCurrentDevice(foundDevice);

        if (onSetHeaderDeviceLabel) {
            onSetHeaderDeviceLabel(foundDevice ? foundDevice.label : 'Device Details');
        }
    }, [deviceId, devices, onSetHeaderDeviceLabel]); // Now depends on 'devices'

    // Update the useEffect to fetch data based on the timeRange.
    useEffect(() => {
        if (deviceId) {
            const fetchHistoricalData = async () => {
                setIsChartLoading(true);
                try {
                    // Append the range query parameter to the API call
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
    }, [deviceId, timeRange]); // 👈 Re-run this effect when deviceId OR timeRange changes

    const handleGoBack = () => navigate('/devices');

    if (!currentDevice) {
        return <div className={Style['loading-container']}>Loading device data or Device not found...</div>;
    }

    return (
        <>
             <div className={Style['page-container']}>
                {/* The components are now direct children again */}
                <ParamChart
                    historicalData={historicalData}
                    isLoading={isChartLoading}
                    onGoBack={handleGoBack}
                    timeRange={timeRange}
                    setTimeRange={setTimeRange}
                />
                <SpecificReadings
                    deviceReadings={currentDevice.latestReading}
                    deviceId={deviceId}
                    deviceStatus={currentDevice.currentState?.status}
                />
                <div className={Style['bottom-left-wrapper']}>
                    <SensorStatusPanel device={currentDevice} />
                    <DetailsPanel device={currentDevice} />
                </div>
                <ControlPanel
                    deviceId={deviceId}
                    deviceStatus={currentDevice.currentState?.status}
                    valveState={currentDevice.currentState?.valve}
                    pumpState={currentDevice.currentState?.pump || 'OFF'}  // fallback: 'OFF'
                    onValveToggle={handleValveToggle}
                    onPumpToggle={handlePumpToggle}
                    addToast={addToast}
                />
            </div>

            {/* Toast container */}
            <div className={ToastStyle.toastContainerWrapper}>
                <div className={ToastStyle.toastContainer}>
                    {toasts.map(t => (
                        <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
                    ))}
                </div>
            </div>
        </>
    );
}


export default SpecificDevice;