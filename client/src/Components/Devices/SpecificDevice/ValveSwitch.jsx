import React, { useState, useEffect } from 'react'; // Import useEffect
import Style from '../../../Styles/SpecificDeviceStyle/ValveSwitch.module.css';

// Add deviceStatus to the props
function ValveSwitch({ deviceId, deviceStatus, onToggle }) {
    // Initialize isValveOpen based on deviceStatus
    const [isValveOpen, setIsValveOpen] = useState(deviceStatus === 'Online');
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');

    // Use useEffect to update the switch state if deviceStatus changes
    // This is important if the device status can change while on this page
    useEffect(() => {
        setIsValveOpen(deviceStatus === 'Online');
    }, [deviceStatus]); // Re-run this effect whenever deviceStatus changes

    const toggleValve = () => {
        // Prevent toggling if the device is offline
        if (deviceStatus === 'Offline') {
            setShowPopup(true);
            setTimeout(() => {
                setShowPopup(false);
                setPopupMessage('');
            }, 2500);
            return; // Exit the function, do not toggle
        }

        setIsValveOpen(prev => !prev);
        const newState = !isValveOpen; // isValveOpen will still hold the previous state for this line, so use newState

        // --- NEW: Call the onToggle function passed from the parent ---
        // This will trigger the logging logic in App.jsx
        if (onToggle) {
            onToggle(deviceId, newState);
        }

        
        // Set popup message based on the new state
        setPopupOpen(true); // Using a separate state for popup for clarity
        setPopupMessage(newState ? 'Valve is now OPEN!' : 'Valve is now CLOSED!');
        setShowPopup(true); // Show the popup

        // Hide the popup after 2-3 seconds
        setTimeout(() => {
            setShowPopup(false);
            setPopupMessage(''); // Clear message
        }, 2500); // Popup visible for 2.5 seconds

        // TODO: Add actual backend or hardware control here
        console.log(`Valve for device ${deviceId} is now ${newState ? 'OPEN' : 'CLOSED'}`);
    };

    return (
        <div className={Style['valve-container']}>
            <div className={Style["valve-title"]}>Valve Control</div>
            <div className={Style["status-section"]}>
                {/* LED indicator based on valve state */}
                <div className={`${Style["led-indicator"]} ${isValveOpen ? Style["led-green"] : Style["led-red"]}`}></div>
                <span className={Style["status-text"]}>
                    {isValveOpen ? "Valve is Open" : "Valve is Closed"}
                </span>
                <label className={Style["switch"]}>
                    {/* The checked state is controlled by isValveOpen */}
                    {/* The switch is disabled if the device is offline */}
                    <input
                        type="checkbox"
                        checked={isValveOpen}
                        onChange={toggleValve}
                        disabled={deviceStatus === 'Offline'} // Disable input if device is offline
                    />
                    <span className={Style["slider"]}></span>
                </label>
            </div>
            {/* Popup component */}
            {showPopup && (
                <div className={Style['valve-popup']}>
                    {popupMessage}
                </div>
            )}
        </div>
    );
}

export default ValveSwitch;