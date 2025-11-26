import React, { useState } from 'react';
import ReadingsStyle from '../../Styles/Readings.module.css';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { WifiOff, HelpCircle } from 'lucide-react';
import NoDevicesFound from '../NoDevFound/noDevicesFound';
import ThresholdsModal from './ThresholdsModal';

ChartJS.register(ArcElement, Tooltip, Legend);

// --- Constants for Colors and Status Text ---
const STATUS_CONFIG = {
    SAFE: { color: '#4CAF50', text: 'Safe' }, // Green
    WARNING: { color: '#FFA500', text: 'Potentially Unsafe' }, // Orange/Yellow
    CRITICAL: { color: '#e91e40ff', text: 'Unsafe' }, // Red
    UNKNOWN: { color: '#eeeeee', text: 'N/A' }, // Grey
    NONE: { color: '#9ca3af', text: 'None' } // Darker Grey for "None"
};

/**
 * Determines the severity status, color, and label based on thresholds.
 */
const getSeverityStatus = (paramKey, value, thresholds) => {
    // 1. Check for specific "No Data" or "Zero" conditions first
    if (value === undefined || value === null) return STATUS_CONFIG.UNKNOWN;
    
    // 2. Explicitly handle the '0' case as requested
    if (value === 0) return STATUS_CONFIG.NONE;

    // 3. Fallback if no thresholds exist
    if (!thresholds || !thresholds[paramKey.toLowerCase()]) {
         return STATUS_CONFIG.SAFE; 
    }

    const rules = thresholds[paramKey.toLowerCase()];
    if (!rules) return STATUS_CONFIG.SAFE;

    switch (paramKey) {
        case 'PH':
        case 'TEMP':
            // Range checks
            if (value < rules.critLow || value > rules.critHigh) return STATUS_CONFIG.CRITICAL;
            if ((value < rules.warnLow) || (value > rules.warnHigh)) return STATUS_CONFIG.WARNING;
            return STATUS_CONFIG.SAFE;

        case 'TURBIDITY':
        case 'TDS':
            // Upper limit checks
            if (value > rules.crit) return STATUS_CONFIG.CRITICAL;
            if (value > rules.warn) return STATUS_CONFIG.WARNING;
            return STATUS_CONFIG.SAFE;

        default:
            return STATUS_CONFIG.SAFE;
    }
};

const ReadingCard = ({ title, paramKey, value, min, max, unit, status, selectedDeviceId, thresholds }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const displayDeviceID = selectedDeviceId ? selectedDeviceId.toUpperCase() : '';

    if (status === 'Offline') {
        return (
            <div className={ReadingsStyle['offline-readings']}>
                <div className={ReadingsStyle['offline-card']}>
                    <div className={ReadingsStyle['icon-wrapper']}>
                        <WifiOff size={50} />
                    </div>
                    <h4>{displayDeviceID} is offline</h4>
                    <p>No available readings for {title} <br />at this moment</p>
                </div>
            </div>
        );
    }

    // --- Calculate dynamic status ---
    const severityInfo = getSeverityStatus(paramKey, value, thresholds);
    const dynamicColor = severityInfo.color;
    const statusText = severityInfo.text;

    // Chart data calculations
    const normalizedValue = (value - min) / (max - min);
    const percentage = Math.min(Math.max(normalizedValue * 100, 0), 100);

    const data = {
        datasets: [
            {
                data: [percentage, 100 - percentage],
                backgroundColor: [dynamicColor, '#eeeeee'], 
                borderWidth: 0,
                circumference: 180,
                rotation: 270,
                cutout: '70%',
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
    };

    return (
        <>
        <div className={ReadingsStyle.readings}>
            <div className={ReadingsStyle["readings-title"]}>
                <div className={ReadingsStyle["title-left"]}>
                    <p><strong>{title}</strong></p>
                    {thresholds && thresholds[paramKey.toLowerCase()] && (
                    <HelpCircle 
                        size={16} 
                        className={ReadingsStyle['help-icon']} 
                        onClick={() => setIsModalOpen(true)}
                    />
                    )}
                </div>
                <p><b>{displayDeviceID}</b></p>
            </div>

            <div className={ReadingsStyle["readings-diagram"]}>
                <div className={ReadingsStyle["chart-container"]}>
                    <Doughnut data={data} options={options} />
                    <div className={ReadingsStyle["chart-center-text"]}>
                        <span className={ReadingsStyle["value"]}>
                            {/* Keep showing 0.0 or -- */}
                            {typeof value === 'number' ? value.toFixed(1) : '--'}
                        </span>
                        {unit && <span className={ReadingsStyle["unit"]}>{unit}</span>}
                    </div>
                </div>
            </div>
            
            {/* Status Label */}
            <div className={ReadingsStyle["status-label"]} style={{ color: dynamicColor }}>
                {statusText}
            </div>

            <div className={ReadingsStyle["min-max"]}>
                <p>Min: {min}{unit}</p>
                <p>Max: {max}{unit}</p>
            </div>
        </div>

        <ThresholdsModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)}
            title={title}
            paramKey={paramKey}
            thresholds={thresholds}
        />
        </>
    );
};

const Readings = ({ selectedDevice, deviceStatus, thresholds }) => {
    if (!selectedDevice || !selectedDevice.readings || selectedDevice.readings.length === 0) {
        return (
            <div className={ReadingsStyle["no-device"]}>
                <NoDevicesFound/>
            </div>
        );
    }

    return (
        <div className={ReadingsStyle["readings-container"]}>
            {selectedDevice.readings.map((reading) => (
                <ReadingCard
                    key={reading.id}
                    title={reading.title}
                    paramKey={reading.paramKey}
                    value={reading.value}
                    min={reading.min}
                    max={reading.max}
                    unit={reading.unit}
                    status={deviceStatus}
                    selectedDeviceId={selectedDevice.id}
                    thresholds={thresholds}
                />
            ))}
        </div>
    );
};

export default Readings;