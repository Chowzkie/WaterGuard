// Components/Devices/SpecificDevice/SpecificDevice.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ParamChart from './ParamChart'
import SpecificReadings from './SpecificReadings'
import ValveSwitch from './ValveSwitch'
import Style from '../../../Styles/SpecificDeviceStyle/Specific.module.css'
import AlertsContext from '../../../utils/AlertsContext';

function SpecificDevice({ onSetHeaderDeviceLabel }) { // Accept onSetHeaderDeviceLabel prop
    const { deviceId } = useParams();
    const navigate = useNavigate();
    const [currentDevice, setCurrentDevice] = useState(null);
    const { devices } = useContext(AlertsContext);

    useEffect(() => {
        const foundDevice = devices.find(device => device.id === deviceId);
        setCurrentDevice(foundDevice);

        // Update the header label in App.jsx
        if (onSetHeaderDeviceLabel) {
            onSetHeaderDeviceLabel(foundDevice ? foundDevice.label : null);
        }

        console.log("Currently viewing device:", deviceId);

        // Cleanup function: Clear the header label when component unmounts or deviceId changes
        return () => {
            if (onSetHeaderDeviceLabel) {
                onSetHeaderDeviceLabel(null);
            }
        };
    }, [deviceId, devices, onSetHeaderDeviceLabel]); // Add onSetHeaderDeviceLabel to dependencies

    const handleGoBack = () => {
        navigate('/devices');
    };

    if (!currentDevice) {
        return <div className={Style['container']}>Loading device data or Device not found...</div>;
    }

    return(
        <div className={Style['container']}>
            <div className={Style['left-column']}>
                <ParamChart
                    deviceDetails={currentDevice}
                    mockTime={currentDevice.history?.time}
                    mockReadings={currentDevice.history?.readings}
                    mockAlerts={currentDevice.alerts}
                    onGoBack={handleGoBack}
                />
            </div>
            <div className={Style['right-column']}>
                <SpecificReadings
                    deviceReadings={currentDevice.readings}
                    deviceId={deviceId}
                    deviceStatus={currentDevice.status}
                />
                <ValveSwitch deviceId={deviceId}/>
            </div>
        </div>
    )
}
export default SpecificDevice;
