import React, {useState} from 'react';
import Style from '../../../Styles/SpecificDeviceStyle/ValveSwitch.module.css'

function ValveSwitch(){
    const [isValveOpen, setIsValveOpen] = useState(false)
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
        
    const toggleValve = () => {
        setIsValveOpen(prev => !prev);
        const newState = !isValveOpen;
        
        // Set popup message based on the new state
        setPopupMessage(newState ? 'Valve is now OPEN!' : 'Valve is now CLOSED!');
        setShowPopup(true); // Show the popup

        // Hide the popup after 2-3 seconds
        setTimeout(() => {
            setShowPopup(false);
            setPopupMessage(''); // Clear message
        }, 2500); // Popup visible for 2.5 seconds

        // TODO: Add actual backend or hardware control here
        console.log(`Valve is now ${newState ? 'OPEN' : 'CLOSED'}`);
    };

    return(
        <div className={Style['valve-container']}>
            <div className={Style["valve-title"]}>Valve Control</div>
            <div className={Style["status-section"]}>
                <div className={`${Style["led-indicator"]} ${isValveOpen ? Style["led-green"] : Style["led-red"]}`}></div>
                <span className={Style["status-text"]}>
                    {isValveOpen ? "Valve is Open" : "Valve is Closed"}
                </span>
                <label className={Style["switch"]}>
                    <input type="checkbox" checked={isValveOpen} onChange={toggleValve} />
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
    )
}

export default ValveSwitch