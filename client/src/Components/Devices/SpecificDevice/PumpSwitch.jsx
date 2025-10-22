import React, { useState, useEffect, useRef } from 'react';
import Style from '../../../Styles/SpecificDeviceStyle/ValveSwitch.module.css'; // reuse existing styles

function PumpSwitch({ deviceId, deviceStatus, pumpState, onToggle, addToast }) {
    const [isPumpOn, setIsPumpOn] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const cooldownRef = useRef(null);

    // Customize cooldown duration
    const COOLDOWN_ON = 60;   // seconds when turning pump ON
    const COOLDOWN_OFF = 10; // seconds when turning pump OFF

    useEffect(() => {
        // Treat FILLING, DRAINING, DELAY as "ON" states for UI purposes
        const activeStates = ['ON', 'FILLING', 'DRAINING', 'DELAY'];
        setIsPumpOn(activeStates.includes(pumpState));
    }, [pumpState]);

    // Countdown timer logic
    useEffect(() => {
        if (cooldown > 0) {
            cooldownRef.current = setTimeout(() => setCooldown((c) => c - 1), 1000);
        }
        return () => clearTimeout(cooldownRef.current);
    }, [cooldown]);

    const togglePump = () => {
        if (deviceStatus === 'Offline') {
            addToast('Device is offline, cannot toggle pump.', 'error');
            return;
        }

        if (cooldown > 0) {
            addToast(`Please wait ${cooldown}s before toggling the pump again.`, 'error');
            return;
        }

        const newState = !isPumpOn;

        if (onToggle) {
            onToggle(deviceId, newState);

            // Start different cooldowns for ON or OFF toggle
            const duration = newState ? COOLDOWN_ON : COOLDOWN_OFF;
            setCooldown(duration);
        }
        const duration = newState ? COOLDOWN_ON : COOLDOWN_OFF;
        const endTime = Date.now() + duration * 1000;
        localStorage.setItem('pumpcooldownEnd', endTime);
        setCooldown(duration)
    };

    useEffect(() => {
    const savedEndTime = localStorage.getItem('pumpcooldownEnd');
    if (savedEndTime) {
        const remaining = Math.floor((savedEndTime - Date.now()) / 1000);
        if (remaining > 0) setCooldown(remaining);
    }
    }, []);

    return (
        <div className={Style['valve-container']}>
            <div className={Style['valve-title']}>Pump Control</div>
            <div className={Style['status-section']}>
                <div
                    className={`${Style['led-indicator']} ${
                        isPumpOn ? Style['led-green'] : Style['led-red']
                    }`}
                ></div>
                <span className={Style['status-text']}>
                    {pumpState === 'IDLE'
                        ? 'Pump is IDLE'
                        : isPumpOn
                        ? `Pump is ${pumpState}`
                        : 'Pump is OFF'}
                </span>

                <label className={Style['switch']}>
                    <input
                        type="checkbox"
                        checked={isPumpOn}
                        onChange={togglePump}
                        className={deviceStatus === 'Offline' || cooldown > 0 ? Style['switch-disabled'] : ''}
                    />
                    <span className={Style['slider']}></span>
                </label>
            </div>

            {/* Optional: visual countdown */}
            {cooldown > 0 && (
                <div className={Style['cooldown-text']}>
                     Please wait {cooldown}s before next toggle
                </div>
            )}
        </div>
    );
}

export default PumpSwitch;
