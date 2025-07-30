import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ParamChart from './ParamChart';
import SpecificReadings from './SpecificReadings';
import ValveSwitch from './ValveSwitch';
import Style from '../../../Styles/SpecificDeviceStyle/Specific.module.css';
import AlertsContext from '../../../utils/AlertsContext';

// Helper components remain the same
function AlertsPanel({ alerts }) {
    //Use to change the alert color dynnamically
    const getAlertStatusClass = (status) => {
        switch(status) {
            case 'Active':
                return Style['alertActive'];
            case 'Critical':
                return Style['alertCritical'];
            case 'Resolved':
                return Style['alertResolved']
            default:
                return ''
        }
    }
    return (
        <div className={Style['details-card']}>
            <h3 className={Style['card-title']}>Recent Alerts</h3>
            <ul className={Style['alert-list']}>
                {alerts && alerts.length > 0 ? (
                    alerts.slice(0, 3).map((alert, index) => (
                        <li key={index} className={`${Style.alert} ${getAlertStatusClass(alert.status)}`}>
                            <span>{alert.time}</span>
                            <span>{alert.type}</span>
                            <span>{alert.value} {alert.unit}</span>
                        </li>
                    ))
                ) : (
                    <li className={Style['no-alerts']}>No recent alerts.</li>
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
    const { devices, onValveToggle } = useContext(AlertsContext);

    // useEffect and other logic remains unchanged
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

    const handleGoBack = () => navigate('/devices');

    if (!currentDevice) {
        return <div className={Style['loading-container']}>Loading device data or Device not found...</div>;
    }

    return (
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

            {/* Key Change: A new wrapper div for the bottom-left panels */}
            <div className={Style['bottom-left-wrapper']}>
                <AlertsPanel alerts={currentDevice.alerts} />
                <DetailsPanel device={currentDevice} />
            </div>
            
            <ValveSwitch 
                deviceId={deviceId} 
                deviceStatus={currentDevice.status}
                onToggle={onValveToggle} 
            />
        </div>
    );
}

export default SpecificDevice;