import React, { useState, useEffect, useRef } from 'react';
import Style from '../../../Styles/SpecificDeviceStyle/ValveSwitch.module.css';

function PumpSwitch({ deviceId, deviceStatus, pumpState, pumpCycle, onToggle, addToast }) {
    const [isPumpOn, setIsPumpOn] = useState(false);
    
    // UI Spam Cooldown
    const [cooldown, setCooldown] = useState(0);
    const cooldownRef = useRef(null);

    // --- STATE FOR COUNTDOWN ---
    const [remainingTime, setRemainingTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const timerRef = useRef(null); // Ref for the interval timer

    // Customize cooldown duration
    const COOLDOWN_ON = 60;   // seconds when turning pump ON
    const COOLDOWN_OFF = 30; // seconds when turning pump OFF

    useEffect(() => {
        // Treat FILLING, DRAINING, DELAY as "ON" states for UI purposes
        const activeStates = ['FILLING', 'DRAINING', 'DELAY'];
        setIsPumpOn(activeStates.includes(pumpState));
    }, [pumpState]);

    // --- EFFECT FOR SERVER COUNTDOWN ---
    useEffect(() => {
        // Clear any existing timer when component updates
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        const activeStates = ['FILLING', 'DRAINING', 'DELAY'];
        
        // Check if the pump is in an active running state and we have data
        if (activeStates.includes(pumpState) && pumpCycle && pumpCycle.remainingTime_sec > 0) {
            
            // Get the timestamp when the phase *started* (or *resumed*)
            const startTime = new Date(pumpCycle.phaseStartedAt).getTime();
            // Get the total duration of this phase
            const duration_sec = pumpCycle.remainingTime_sec;
            
            setTotalDuration(duration_sec); // For the spinner percentage

            const updateCountdown = () => {
                const now = Date.now();
                const elapsed_sec = Math.floor((now - startTime) / 1000);
                const timeRemaining = duration_sec - elapsed_sec;

                if (timeRemaining <= 0) {
                    setRemainingTime(0);
                    setTotalDuration(0);
                    clearInterval(timerRef.current);
                } else {
                    setRemainingTime(timeRemaining);
                }
            };

            updateCountdown(); // Run immediately to avoid 1s delay
            timerRef.current = setInterval(updateCountdown, 1000); // Update every second

        } else {
            // Pump is IDLE, PAUSED, or OFF
            setRemainingTime(0);
            setTotalDuration(0);
        }

        // Cleanup function
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [pumpState, pumpCycle]); // Rerun whenever pumpState or pumpCycle object changes

    // Countdown timer logic for UI spam
    useEffect(() => {
        if (cooldown > 0) {
            cooldownRef.current = setTimeout(() => setCooldown((c) => c - 1), 1000);
        }
        return () => clearTimeout(cooldownRef.current);
    }, [cooldown]);

    useEffect(() => {
        const savedEndTime = localStorage.getItem('pumpcooldownEnd');
        if (savedEndTime) {
            const remaining = Math.floor((savedEndTime - Date.now()) / 1000);
            if (remaining > 0) setCooldown(remaining);
        }
    }, []);

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
            onToggle(deviceId, newState); // This sends 'FILL' or 'IDLE'

            // Start different cooldowns for ON or OFF toggle
            const duration = newState ? COOLDOWN_ON : COOLDOWN_OFF;
            setCooldown(duration);
            
            const endTime = Date.now() + duration * 1000;
            localStorage.setItem('pumpcooldownEnd', endTime);
        }
    };


    // --- CALCULATE SPINNER ---
    const isRunning = remainingTime > 0 && totalDuration > 0;
    const radius = 18; // (40px width - 4px stroke) / 2
    const circumference = 2 * Math.PI * radius;
    // Ensure progress is between 0 and 1
    const progress = isRunning ? Math.max(0, Math.min(1, remainingTime / totalDuration)) : 0;
    const strokeDashoffset = circumference * (1 - progress);

    // --- **IMPROVED** FORMAT STATUS TEXT ---
    const formatPhaseName = (phase) => {
        if (!phase || phase === 'NONE') return 'Idle';
        switch(phase) {
            case 'FILLING': return 'Filling';
            case 'DRAINING': return 'Draining';
            case 'DELAY_AFTER_FILL': return 'Delay (Post-Fill)';
            case 'DELAY_AFTER_DRAIN': return 'Delay (Post-Drain)';
            default: return 'Idle';
        }
    }

    return (
        <div className={Style['valve-container']}>
            <div className={Style['valve-title']}>Pump Control</div>
            
            {/* --- **UPDATED** STATUS SECTION --- */}
            <div className={Style['status-section']}>
                
                {/* 1. Spinner (now without text inside) or LED */}
                {isRunning ? (
                    <div className={Style['countdown-spinner']}>
                        <svg className={Style['countdown-svg']} viewBox="0 0 40 40">
                            <circle className={Style['countdown-svg-bg']} cx="20" cy="20" r={radius} />
                            <circle
                                className={Style['countdown-svg-progress']}
                                cx="20"
                                cy="20"
                                r={radius}
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                            />
                        </svg>
                        {/* The time text is no longer here */}
                    </div>
                ) : (
                    <div
                        className={`${Style['led-indicator']} ${
                            isPumpOn ? Style['led-green'] : Style['led-red']
                        }`}
                    ></div>
                )}
                
                {/* 2. New Stacked Text Block */}
                <div className={Style['status-text-block']}>
                    <span className={Style['status-text-main']}>
                        {formatPhaseName(pumpCycle?.pausedPhase)}
                    </span>
                    {/* Show remaining time here ONLY if running */}
                    {isRunning && (
                        <span className={Style['status-text-sub']}>
                            {remainingTime}s remaining
                        </span>
                    )}
                </div>

                {/* 3. The Toggle Switch */}
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

            {/* visual countdown for UI spam */}
            {cooldown > 0 && (
                <div className={Style['cooldown-text']}>
                     Please wait {cooldown}s before next toggle
                </div>
            )}
        </div>
    );
}

export default PumpSwitch;