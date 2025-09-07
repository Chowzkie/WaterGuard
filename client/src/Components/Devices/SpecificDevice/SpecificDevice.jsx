import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ParamChart from './ParamChart';
import SpecificReadings from './SpecificReadings';
import ValveSwitch from './ValveSwitch';
import Style from '../../../Styles/SpecificDeviceStyle/Specific.module.css';
import ToastStyle from '../../../Styles/ToastStyle/Toast.module.css'
import AlertsContext from '../../../utils/AlertsContext';
import { CheckCircle2, AlertCircle } from 'lucide-react';

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

// --- MODIFIED: AlertsPanel updated with requested features ---
function AlertsPanel({ alerts }) {
    // 1. Restored the green/yellow/red color scheme logic
    const getAlertStatusClass = (severity) => {
        switch (severity.toLowerCase()) {
            case 'critical':
                return Style['alertCritical']; // Red
            case 'warning':
                return Style['alertWarning'];  // Yellow
            case 'normal':
                return Style['alertNormal'];   // Green
            default:
                return '';
        }
    };

    // Time formatting is unchanged
    const formatTime = (isoString) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className={Style['details-card']}>
            <h3 className={Style['card-title']}>Recent Alerts</h3>
            <ul className={Style['alert-list']}>
                {alerts && alerts.length > 0 ? (
                    // 2. Removed .slice() to show all alerts in the scrollable list
                    alerts.map((alert) => (
                        <li key={alert.id} className={`${Style.alert} ${getAlertStatusClass(alert.severity)}`}>
                            <span>{formatTime(alert.dateTime)}</span>
                            <span>{alert.type}</span>
                            <span>
                                {alert.value !== undefined && alert.unit ? `${alert.value} ${alert.unit}` : ''}
                            </span>
                        </li>
                    ))
                ) : (
                    <li className={Style['no-alerts']}>No recent alerts for this device.</li>
                )}
            </ul>
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

function SpecificDevice({ onSetHeaderDeviceLabel }) {
    const { deviceId } = useParams();
    const navigate = useNavigate();
    const [currentDevice, setCurrentDevice] = useState(null);
    // --- MODIFIED: Get recentAlerts from context ---
    const { devices, onValveToggle, recentAlerts } = useContext(AlertsContext);

    // ✅ Toast state & handlers
    const [toasts, setToasts] = useState([]);
    const toastTimeouts = useRef({});

    const [historicalData, setHistoricalData] = useState([]);
    const [isChartLoading, setIsChartLoading] = useState(true);

    const [timeRange, setTimeRange] = useState('7d'); // Default to 7 days

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

    useEffect(() => {
        const foundDevice = devices.find(device => device._id === deviceId);
        setCurrentDevice(foundDevice);
        if (onSetHeaderDeviceLabel) {
            onSetHeaderDeviceLabel(foundDevice ? foundDevice.label : null);
        }
        return () => {
            if (onSetHeaderDeviceLabel) onSetHeaderDeviceLabel(null);
        };
    }, [deviceId, devices, onSetHeaderDeviceLabel]);

    // ✅ STEP 2: Update the useEffect to fetch data based on the timeRange.
    useEffect(() => {
        if (deviceId) {
            const fetchHistoricalData = async () => {
                setIsChartLoading(true);
                try {
                    // Append the range query parameter to the API call
                    const response = await axios.get(`${API_BASE_URL}/api/readings/${deviceId}?range=${timeRange}`);
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

    // --- NEW: Filter alerts specifically for this device ---
    const deviceSpecificAlerts = recentAlerts
        ? recentAlerts.filter(alert => alert.originator === deviceId)
        : [];

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
                    <AlertsPanel alerts={deviceSpecificAlerts} />
                    <DetailsPanel device={currentDevice} />
                </div>
                <ValveSwitch 
                    deviceId={deviceId} 
                    deviceStatus={currentDevice.currentState?.status}
                    onToggle={onValveToggle} 
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