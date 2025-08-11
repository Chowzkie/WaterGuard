import React, { useState, useEffect } from 'react'; // Import useEffect
import Style from '../../../Styles/SpecificDeviceStyle/ValveSwitch.module.css';

// Add deviceStatus to the props
function ValveSwitch({ deviceId, deviceStatus, onToggle, addToast }) {
    const [isValveOpen, setIsValveOpen] = useState(deviceStatus === 'Online');

    useEffect(() => {
        setIsValveOpen(deviceStatus === 'Online');
    }, [deviceStatus]);

    const toggleValve = () => {
        if (deviceStatus === 'Offline') {
            addToast('Device is offline, cannot toggle valve.', 'error');
            return;
        }

        const newState = !isValveOpen;
        setIsValveOpen(newState);

        if (onToggle) {
            onToggle(deviceId, newState);
        }

        addToast(newState ? 'Valve is now OPEN!' : 'Valve is now CLOSED!', 'success');
        console.log(`Valve for device ${deviceId} is now ${newState ? 'OPEN' : 'CLOSED'}`);
    };

    return (
        <div className={Style['valve-container']}>
            <div className={Style["valve-title"]}>Valve Control</div>
            <div className={Style["status-section"]}>
                <div className={`${Style["led-indicator"]} ${isValveOpen ? Style["led-green"] : Style["led-red"]}`}></div>
                <span className={Style["status-text"]}>
                    {isValveOpen ? "Valve is Open" : "Valve is Closed"}
                </span>
                <label className={Style["switch"]}>
                    <input
                        type="checkbox"
                        checked={isValveOpen}
                        onChange={toggleValve}
                        disabled={deviceStatus === 'Offline'}
                    />
                    <span className={Style["slider"]}></span>
                </label>
            </div>
        </div>
    );
}

export default ValveSwitch;