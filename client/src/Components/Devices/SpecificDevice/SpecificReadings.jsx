import Style from '../../../Styles/SpecificDeviceStyle/SpecificReadings.module.css';

// 1. Helper to get the BACKGROUND class based on thresholds (Status)
const getBackgroundClass = (param, value, thresholds) => {

    if (value === 0) return '';

    if (value === undefined || value === null) return Style.bgOffline;
    if (!thresholds) return Style.bgNormal; // Default to normal if config missing

    const rules = thresholds[param.toLowerCase()];
    if (!rules) return Style.bgNormal;

    switch (param) {
        case 'PH':
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

        case 'TEMP':
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

// 2. Helper to get the BORDER/TEXT class based on parameter name (Identity)
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

const SpecificReadings = ({ deviceReadings, deviceId, deviceStatus, thresholds }) => {
    
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
                    
                    // Combine logic: Status Background + Identity Colors
                    const bgClass = getBackgroundClass(param, value, thresholds);
                    const identityClass = getIdentityClass(param);

                    // Custom labels matching your image
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