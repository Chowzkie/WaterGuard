// Components/Devices/SpecificDevice/SpecificReadings.jsx
import React, { useState } from "react";
import Style from '../../../Styles/SpecificDeviceStyle/SpecificReadings.module.css';

// Define the exact order and configuration for the 4 parameters you want to display
const DISPLAY_PARAMETERS_ORDER = [
    'ph',       // This key matches your deviceReadings object property
    'turbidity',
    'temp',     // This key matches your deviceReadings object property
    'tds',
];

// Mapping between internal data keys and display titles/units/colors
const PARAMETER_CONFIG = {
    ph: { title: 'Current pH', unit: '', color: '#FFA500' },
    turbidity: { title: 'Turbidity', unit: 'NTU', color: '#4CAF50' },
    temp: { title: 'Temperature', unit: '°C', color: '#2196F3' },
    tds: { title: 'TDS', unit: 'ppm', color: '#E91E63' },
};

// Define the thresholds directly or reference deviceDetails.configurations
// For simplicity, using hardcoded values based on your FAKE_API_DATA defaults for ps01-dev
const getStatusClass = (paramTitle, value) => {
    switch (paramTitle) {
        case 'Current pH':
            return value < 6.5 || value > 8.5 ? 'high' : 'safe';
        case 'Turbidity':
            return value > 5 ? 'high' : 'safe';
        case 'Temperature':
            return value > 30 ? 'high' : 'safe'; // Based on ps01-dev normalHigh: 30
        case 'TDS':
            return value > 500 ? 'high' : 'safe'; // Based on ps01-dev normalHigh: 500
        default:
            return 'safe';
    }
};

function SpecificReadings({ deviceReadings, deviceId, deviceStatus }){

    // Handle offline/maintenance status first
    if (deviceStatus === 'Offline' || deviceStatus === 'Maintenance') {
        return (
            <div className={Style['container']}>
                <div className={Style['blockContainer']}>
                    <div className={Style['blockTitle']}>Real-time Monitoring</div>
                    <div className={Style['statusMessage']}>
                        <h3>Device Status: {deviceStatus}</h3>
                        <p>Readings are not available for devices that are {deviceStatus.toLowerCase()}.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Filter and transform the readings to only include the 4 desired parameters
    const readingsToDisplay = DISPLAY_PARAMETERS_ORDER.map(key => {
        // Ensure the key exists in deviceReadings and in PARAMETER_CONFIG
        if (deviceReadings && deviceReadings.hasOwnProperty(key) && PARAMETER_CONFIG[key]) {
            return {
                id: key, // Use the parameter key as an ID
                title: PARAMETER_CONFIG[key].title,
                value: deviceReadings[key],
                unit: PARAMETER_CONFIG[key].unit,
                color: PARAMETER_CONFIG[key].color,
            };
        }
        return null; // Return null for parameters that don't exist or aren't configured
    }).filter(Boolean); // Filter out any null entries

    // Check if there are no readings to display after filtering
    if (readingsToDisplay.length === 0) {
        return (
            <div className={Style['container']}>
                <div className={Style['blockContainer']}>
                    <div className={Style['blockTitle']}>Real-time Monitoring</div>
                    <p>No current readings available for this online device.</p>
                </div>
            </div>
        );
    }

    return(
        <div className={Style['container']}>
            <div className={Style['blockContainer']}>
                <div className={Style['blockTitle']}>Real-time Monitoring {">"} {deviceId.toUpperCase()}</div>
                <div className={Style['cardGrid']}>
                    {readingsToDisplay.map((reading) => (
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
    );
}

export default SpecificReadings;