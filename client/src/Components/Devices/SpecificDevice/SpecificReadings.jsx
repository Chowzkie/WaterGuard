import Style from '../../../Styles/SpecificDeviceStyle/SpecificReadings.module.css';

// Determines the visual severity state (Normal, Warning, Critical)
const getBackgroundClass = (param, value, thresholds) => {
    if (value === 0) return ''; // Keep white background for 0
    if (value === undefined || value === null) return Style.bgOffline;
    
    if (!thresholds) return Style.bgNormal; 
    const rules = thresholds[param.toLowerCase()];
    if (!rules) return Style.bgNormal;

    switch (param) {
        case 'PH':
        case 'TEMP':
            if (value < rules.critLow || value > rules.critHigh) return Style.bgCritical;
            if ((value >= rules.critLow && value <= rules.warnLow) || 
                (value >= rules.warnHigh && value <= rules.critHigh)) {
                return Style.bgWarning;
            }
            return Style.bgNormal;

        case 'TURBIDITY':
        case 'TDS':
            if (value > rules.crit) return Style.bgCritical;
            if (value > rules.warn) return Style.bgWarning;
            return Style.bgNormal;

        default:
            return Style.bgNormal;
    }
};

// Gets the qualitative text label (e.g., Neutral, Clear)
const getDetailedStatusText = (param, value, thresholds) => {
    if (value === undefined || value === null) return 'No Data';

    const rules = thresholds?.[param.toLowerCase()];
    if (!rules) return 'N/A';

    switch (param) {
        case 'PH':
            if (value < rules.critLow) return 'Highly Acidic';
            if (value < rules.warnLow) return 'Acidic';
            if (value > rules.critHigh) return 'Highly Alkaline';
            if (value > rules.warnHigh) return 'Alkaline';
            return 'Neutral';

        case 'TURBIDITY':
            if (value > rules.crit) return 'Very Cloudy';
            if (value > rules.warn) return 'Cloudy';
            return 'Clear';

        case 'TDS':
            if (value > rules.crit) return 'Poor Taste';
            if (value > rules.warn) return 'Fair Taste';
            return 'Good Taste';
            
        case 'TEMP':
            if (value < rules.critLow) return 'Freezing Risk';
            if (value < rules.warnLow) return 'Cold';
            if (value > rules.critHigh) return 'Heat Risk';
            if (value > rules.warnHigh) return 'Warm';
            return 'Cool';

        default:
            return 'N/A';
    }
};

const getIdentityClass = (param) => {
    switch (param) {
        case 'PH': return Style.cardPH;
        case 'TURBIDITY': return Style.cardTurbidity;
        case 'TEMP': return Style.cardTemp;
        case 'TDS': return Style.cardTDS;
        default: return '';
    }
};

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

    const parameters = ['PH', 'TURBIDITY', 'TEMP', 'TDS'];

    return (
        <div className={Style.container}>
            <div className={Style.blockTitle}>Live Readings</div>
            
            <div className={Style.cardGrid}>
                {parameters.map((param) => {
                    const value = deviceReadings[param];
                    
                    const bgClass = getBackgroundClass(param, value, thresholds);
                    const identityClass = getIdentityClass(param);
                    const statusLabel = getDetailedStatusText(param, value, thresholds);

                    let label = param;
                    if (param === 'PH') label = 'Current pH';
                    else if (param === 'TEMP') label = 'Temperature';
                    else if (param === 'TURBIDITY') label = 'Turbidity';
                    else if (param === 'TDS') label = 'TDS';

                    return (
                        <div 
                            key={param} 
                            // Ensure identityClass is always applied so borders show even if bgClass is empty
                            className={`${Style['reading-card']} ${bgClass || ''} ${identityClass}`}
                        >
                            <div className={Style.parameter}>
                                {label}
                            </div>

                            {/* MIDDLE: Status Label */}
                            <div className={Style.statusMiddle}>
                                {statusLabel}
                            </div>

                            {/* RIGHT: Value */}
                            <div className={Style.value}>
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