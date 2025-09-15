import React, { useState, useEffect } from 'react';
import Style from '../../../Styles/SpecificDeviceStyle/ValveSwitch.module.css';

/**
 * ValveSwitch Component
 * @param {string} deviceId - The ID of the device.
 * @param {string} deviceStatus - The overall status of the device ('Online' or 'Offline').
 * @param {string} valveState - The current state of the valve ('OPEN' or 'CLOSED').
 * @param {function} onToggle - Callback function to execute when the switch is toggled.
 * @param {function} addToast - Function to display a toast notification.
 */
function ValveSwitch({ deviceId, deviceStatus, valveState, onToggle, addToast }) {
    // The switch's visual state is now correctly derived from the `valveState` prop.
    const [isValveOpen, setIsValveOpen] = useState(valveState === 'OPEN');

    // This effect ensures the switch's visual state stays in sync with the data from the database.
    // If the valveState prop changes, the component will re-render accordingly.
    useEffect(() => {
        setIsValveOpen(valveState === 'OPEN');
    }, [valveState]);

    const toggleValve = () => {
        // Prevent interaction if the device is offline and show a toast message.
        if (deviceStatus === 'Offline') {
            addToast('Device is offline, cannot toggle valve.', 'error');
            return;
        }

        // Determine the intended new state (true for OPEN, false for CLOSED).
        const newState = !isValveOpen;

        // Call the handler function passed from the parent component.
        // The parent is responsible for the API call and success/failure toasts.
        if (onToggle) {
            onToggle(deviceId, newState);
        }
    };

    return (
        <div className={Style['valve-container']}>
            <div className={Style["valve-title"]}>Valve Control</div>
            <div className={Style["status-section"]}>
                {/* The LED indicator color is based on the valve's state. */}
                <div className={`${Style["led-indicator"]} ${isValveOpen ? Style["led-green"] : Style["led-red"]}`}></div>
                <span className={Style["status-text"]}>
                    {isValveOpen ? "Valve is Open" : "Valve is Closed"}
                </span>
                <label className={Style["switch"]}>
                    <input
                        type="checkbox"
                        checked={isValveOpen}
                        onChange={toggleValve}
                        // The switch is disabled if the device is offline.
                        disabled={deviceStatus === 'Offline'}
                    />
                    <span className={Style["slider"]}></span>
                </label>
            </div>
        </div>
    );
}

export default ValveSwitch;