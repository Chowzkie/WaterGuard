import React, { useState } from 'react';
import ReadingsStyle from '../../Styles/Readings.module.css';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { WifiOff, HelpCircle } from 'lucide-react';
import NoDevicesFound from '../NoDevFound/noDevicesFound';
import ThresholdsModal from './ThresholdsModal';

ChartJS.register(ArcElement, Tooltip, Legend);

// --- Constants for Colors ---
const COLORS = {
    SAFE: '#4CAF50',    // Green
    WARNING: '#FFA500', // Orange/Yellow
    CRITICAL: '#E91E63',// Red
    UNKNOWN: '#eeeeee', // Grey
    NONE: '#9ca3af'     // Dark Grey
};

// --- Unit Definitions ---
const UNIT_DEFINITIONS = {
    TURBIDITY: 'Nephelometric Turbidity Units',
    TDS: 'Parts Per Million (mg/L)',
    TEMP: 'Degrees Celsius',
    PH: 'Potential of Hydrogen'
};

/**
 * Determines status and splits it into Main (Color) and Sub (Badge) text.
 */
const getDetailedStatus = (paramKey, value, thresholds) => {
    // 1. Handle Missing Data
    if (value === undefined || value === null) {
        return { color: COLORS.UNKNOWN, main: 'N/A', sub: 'No Data' };
    }
    
    // 2. Handle Zero values (Standby/None)
    if (value === 0) {
         let subText = 'Standby';
         if (paramKey === 'TURBIDITY' || paramKey === 'TDS') subText = 'Clear';
         else if (paramKey === 'PH') subText = 'Neutral'; 
         else if (paramKey === 'TEMP') subText = '-';
         
         return { color: COLORS.NONE, main: 'NONE', sub: subText };
    }

    const rules = thresholds?.[paramKey.toLowerCase()];
    // 3. Fallback if no thresholds
    if (!rules) {
         return { color: COLORS.SAFE, main: 'SAFE', sub: 'No Limit' }; 
    }

    const pKey = paramKey.toUpperCase();

    switch (pKey) {
        case 'PH':
            if (value < rules.critLow) return { color: COLORS.CRITICAL, main: 'UNSAFE', sub: 'Highly Acidic' };
            if (value < rules.warnLow) return { color: COLORS.WARNING, main: 'WARNING', sub: 'Acidic' };
            if (value > rules.critHigh) return { color: COLORS.CRITICAL, main: 'UNSAFE', sub: 'Highly Alkaline' };
            if (value > rules.warnHigh) return { color: COLORS.WARNING, main: 'WARNING', sub: 'Alkaline' };
            return { color: COLORS.SAFE, main: 'SAFE', sub: 'Neutral' };

        case 'TURBIDITY':
            if (value > rules.crit) return { color: COLORS.CRITICAL, main: 'UNSAFE', sub: 'Very Cloudy' };
            if (value > rules.warn) return { color: COLORS.WARNING, main: 'WARNING', sub: 'Cloudy' };
            return { color: COLORS.SAFE, main: 'SAFE', sub: 'Clear' };

        case 'TDS':
            if (value > rules.crit) return { color: COLORS.CRITICAL, main: 'UNSAFE', sub: 'Poor Taste' };
            if (value > rules.warn) return { color: COLORS.WARNING, main: 'WARNING', sub: 'Fair Taste' };
            return { color: COLORS.SAFE, main: 'SAFE', sub: 'Good Taste' };
            
        case 'TEMP':
            if (value < rules.critLow) return { color: COLORS.CRITICAL, main: 'UNSAFE', sub: 'Freezing Risk' };
            if (value < rules.warnLow) return { color: COLORS.WARNING, main: 'WARNING', sub: 'Cold' };
            if (value > rules.critHigh) return { color: COLORS.CRITICAL, main: 'UNSAFE', sub: 'Heat Risk' };
            if (value > rules.warnHigh) return { color: COLORS.WARNING, main: 'WARNING', sub: 'Warm' };
            return { color: COLORS.SAFE, main: 'SAFE', sub: 'Cool' };

        default:
            return { color: COLORS.SAFE, main: 'SAFE', sub: 'Normal' };
    }
};

const ReadingCard = ({ title, paramKey, value, min, max, unit, status, selectedDeviceId, thresholds }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const displayDeviceID = selectedDeviceId ? selectedDeviceId.toUpperCase() : '';
    const unitTooltip = UNIT_DEFINITIONS[paramKey] || '';

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

    // --- Calculate dynamic status (Main + Sub) ---
    const { color: dynamicColor, main: mainStatus, sub: subStatus } = getDetailedStatus(paramKey, value, thresholds);

    const normalizedValue = (value - min) / (max - min);
    // Safe guard against NaN or negative
    const safePercentage = Math.min(Math.max((isNaN(normalizedValue) ? 0 : normalizedValue) * 100, 0), 100);

    const data = {
        datasets: [
            {
                data: [safePercentage, 100 - safePercentage],
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
                            {typeof value === 'number' ? value.toFixed(1) : '--'}
                        </span>
                        {unit && (
                            <span className={ReadingsStyle["unit"]} title={unitTooltip}>
                                {unit}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            
            {/* NEW STATUS DESIGN: Main Text + Sub Badge */}
            <div className={ReadingsStyle["status-container"]}>
                <div className={ReadingsStyle["status-main"]} style={{ color: dynamicColor }}>
                    {mainStatus}
                </div>
                <div className={ReadingsStyle["status-sub"]}>
                    {subStatus}
                </div>
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