import React, { useState } from "react";
import Style from '../../../Styles/SpecificDeviceStyle/SpecificReadings.module.css'


const getStatusClass = (param, value) => {
    switch (param) {
        case 'Current pH': // Changed from 'pH' to 'Current pH' to match your initialDevices structure
            return value < 6.5 || value > 8.5 ? 'high' : 'safe'; // Corrected 'hign' to 'high'
        case 'Turbidity':
            return value > 5 ? 'high' : 'safe'; // Changed from 'medium' to 'high' for consistency, and added 'safe'
        case 'Temperature':
            return value > 35 ? 'high' : 'safe'; // Changed from 'medium' to 'high' for consistency, and added 'safe'
        case 'TDS':
            return value > 1000 ? 'high' : 'safe';
        default:
            return 'safe'
    }
}

function SpecificReadings({ deviceReadings, deviceId, deviceStatus }){

    // --- NEW LOGIC: Check deviceStatus at the very beginning ---
    if (deviceStatus === 'Offline' || deviceStatus === 'Maintenance') {
        return (
            <div className={Style['container']}>
                <div className={Style['blockContainer']}>
                    <div className={Style['blockTitle']}>Real-time Monitoring</div>
                    {/* Display a specific message for offline/maintenance devices */}
                    <div className={Style['statusMessage']}>
                        <h3>Device Status: {deviceStatus}</h3>
                        <p>Readings are not available for devices that are {deviceStatus.toLowerCase()}.</p>
                    </div>
                </div>
            </div>
        );
    }
    // --- END NEW LOGIC ---

    // Original check for empty readings (this will still apply if the device is 'Online' but has no readings)
    if (!deviceReadings || !Array.isArray(deviceReadings) || deviceReadings.length === 0) {
        return (
            <div className={Style['container']}>
                <div className={Style['blockContainer']}>
                    <div className={Style['blockTitle']}>Real-time Monitoring</div>
                    <p>No readings available for this device.</p>
                </div>
            </div>
        );
    }

    return(
        <div className={Style['container']}>
            <div className={Style['blockContainer']}>
                <div className={Style['blockTitle']}>Real-time Monitoring for {deviceId}</div>
                <div className={Style['cardGrid']}>
                    {deviceReadings.map((reading) => (
                        <div
                            key={reading.id}
                            className={`${Style['reading-card']} ${Style[getStatusClass(reading.title, reading.value)]}`}
                        >
                            <div className={Style['parameter']} style={{ color: reading.color }}>
                                {reading.title}
                            </div>
                            <div className={Style['value']}>{reading.value} {reading.unit}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default SpecificReadings;