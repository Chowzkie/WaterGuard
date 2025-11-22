import Style from '../../../Styles/SpecificDeviceStyle/SpecificReadings.module.css';

// Determines the visual severity state (Normal, Warning, Critical)
// Compares the current sensor value against the device's configured thresholds
const getBackgroundClass = (param, value, thresholds) => {
    // Zero is a valid reading, but null/undefined indicates a data error
    if (value === 0) return '';
    if (value === undefined || value === null) return Style.bgOffline;
    
    // Fallback to normal styling if no thresholds are configured
    if (!thresholds) return Style.bgNormal; 

    const rules = thresholds[param.toLowerCase()];
    if (!rules) return Style.bgNormal;

    switch (param) {
        case 'PH':
            // pH requires range checks (Low < Value < High)
            if (value < rules.critLow || value > rules.critHigh) return Style.bgCritical;
            if ((value >= rules.critLow && value <= rules.warnLow) || 
                (value >= rules.warnHigh && value <= rules.critHigh)) {
                return Style.bgWarning;
            }
            return Style.bgNormal;

        case 'TURBIDITY':
        case 'TDS':
            // These parameters only check for upper limits
            if (value > rules.crit) return Style.bgCritical;
            if (value > rules.warn) return Style.bgWarning;
            return Style.bgNormal;

        case 'TEMP':
            // Temp requires range checks similar to pH
            if (value < rules.critLow || value > rules.critHigh) return Style.bgCritical;
            if ((value >= rules.critLow && value <= rules.warnLow) || 
                (value >= rules.warnHigh && value <= rules.critHigh)) {
                return Style.bgWarning;
            }
            return Style.bgNormal;

        default:
            return Style.bgNormal;
    }
};

// Maps sensor types to their specific visual identity (e.g., border colors)
const getIdentityClass = (param) => {
    switch (param) {
        case 'PH': return Style.cardPH;
        case 'TURBIDITY': return Style.cardTurbidity;
        case 'TEMP': return Style.cardTemp;
        case 'TDS': return Style.cardTDS;
        default: return '';
    }
};

// Returns display units for each sensor type
const getUnit = (param) => {
    switch (param) {
        case 'PH': return '';
        case 'TEMP': return ' °C';
        case 'TURBIDITY': return ' NTU';
        case 'TDS': return ' ppm';
        default: return '';
    }
};

const SpecificReadings = ({ deviceReadings, deviceStatus, thresholds }) => {
    
    // Early return for Offline status to prevent rendering stale or empty data cards
    if (deviceStatus === 'Offline' || !deviceReadings) {
        return (
            <div className={Style.container}>
                <div className={Style.blockTitle}>Live Readings</div>
                 <div className={Style.statusMessage}>
                    <h3>Device is Offline</h3>
                    <p>Live readings are not available.</p>
                </div>
            </div>
        );
    }

    // Define explicit order of sensor cards
    const parameters = ['PH', 'TURBIDITY', 'TEMP', 'TDS'];

    return (
        <div className={Style.container}>
            <div className={Style.blockTitle}>Live Readings</div>
            
            <div className={Style.cardGrid}>
                {parameters.map((param) => {
                    const value = deviceReadings[param];
                    
                    // Compose styles: Alarm state (background) + Sensor Identity (accent/border)
                    const bgClass = getBackgroundClass(param, value, thresholds);
                    const identityClass = getIdentityClass(param);

                    // Map raw parameter keys to user-friendly labels
                    let label = param;
                    if (param === 'PH') label = 'Current pH';
                    else if (param === 'TEMP') label = 'Temperature';
                    else if (param === 'TURBIDITY') label = 'Turbidity';
                    else if (param === 'TDS') label = 'TDS';

                    return (
                        <div 
                            key={param} 
                            className={`${Style['reading-card']} ${bgClass} ${identityClass}`}
                        >
                            <div className={Style.parameter}>
                                {label}
                            </div>
                            <div className={Style.value}>
                                {/* Format to 1 decimal place, handle missing data gracefully */}
                                {typeof value === 'number' ? value.toFixed(1) : '--'}
                                <span style={{ fontSize: '1.1rem', color: '#374151', marginLeft: '4px' }}>
                                    {getUnit(param)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SpecificReadings;