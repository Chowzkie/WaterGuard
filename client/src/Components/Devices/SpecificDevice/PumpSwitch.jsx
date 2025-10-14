import React, { useState, useEffect } from 'react';
import Style from '../../../Styles/SpecificDeviceStyle/ValveSwitch.module.css'; // reuse existing styles

function PumpSwitch({ deviceId, deviceStatus, pumpState, onToggle, addToast }) {
    const [isPumpOn, setIsPumpOn] = useState(pumpState === 'ON');

    useEffect(() => {
        setIsPumpOn(pumpState === 'ON');
    }, [pumpState]);

    const togglePump = () => {
        if (deviceStatus === 'Offline') {
            addToast('Device is offline, cannot toggle pump.', 'error');
            return;
        }

        const newState = !isPumpOn;
        if (onToggle) onToggle(deviceId, newState);
    };

    return (
        <div className={Style['valve-container']}>
            <div className={Style['valve-title']}>Pump Control</div>
            <div className={Style['status-section']}>
                <div className={`${Style['led-indicator']} ${isPumpOn ? Style['led-green'] : Style['led-red']}`}></div>
                <span className={Style['status-text']}>
                    {isPumpOn ? 'Pump is ON' : 'Pump is OFF'}
                </span>
                <label className={Style['switch']}>
                    <input
                        type="checkbox"
                        checked={isPumpOn}
                        onChange={togglePump}
                        disabled={deviceStatus === 'Offline'}
                    />
                    <span className={Style['slider']}></span>
                </label>
            </div>
        </div>
    );
}

export default PumpSwitch;
