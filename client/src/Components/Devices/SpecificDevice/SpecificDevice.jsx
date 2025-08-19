import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
                <p><strong>Status:</strong> {device.status}</p>
                <p><strong>Location:</strong> {device.location}</p>
            </div>
        </div>
    );
}

function SpecificDevice({ onSetHeaderDeviceLabel }) {
    const { deviceId } = useParams();
    const navigate = useNavigate();
    const [currentDevice, setCurrentDevice] = useState(null);
    // --- MODIFIED: Get recentAlerts from context ---
    const { devices, onValveToggle, recentAlerts } = useContext(AlertsContext);

    // ✅ Toast state & handlers
    const [toasts, setToasts] = useState([]);
    const toastTimeouts = useRef({});

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
        const foundDevice = devices.find(device => device.id === deviceId);
        setCurrentDevice(foundDevice);
        if (onSetHeaderDeviceLabel) {
            onSetHeaderDeviceLabel(foundDevice ? foundDevice.label : null);
        }
        return () => {
            if (onSetHeaderDeviceLabel) onSetHeaderDeviceLabel(null);
        };
    }, [deviceId, devices, onSetHeaderDeviceLabel]);

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
                <ParamChart
                    mockTime={currentDevice.history?.time}
                    mockReadings={currentDevice.history?.readings}
                    onGoBack={handleGoBack}
                />
                <SpecificReadings
                    deviceReadings={currentDevice.readings}
                    deviceId={deviceId}
                    deviceStatus={currentDevice.status}
                />

                <div className={Style['bottom-left-wrapper']}>
                    {/* --- MODIFIED: Pass the filtered alerts to the panel --- */}
                    <AlertsPanel alerts={deviceSpecificAlerts} />
                    <DetailsPanel device={currentDevice} />
                </div>

                <ValveSwitch 
                    deviceId={deviceId} 
                    deviceStatus={currentDevice.status}
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