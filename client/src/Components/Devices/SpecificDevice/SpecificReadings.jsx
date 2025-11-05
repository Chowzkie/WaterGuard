import Style from '../../../Styles/SpecificDeviceStyle/SpecificReadings.module.css';

const DISPLAY_PARAMETERS_ORDER = ['PH', 'TURBIDITY', 'TEMP', 'TDS'];

const PARAMETER_CONFIG = {
  PH: { title: 'Current pH', unit: '', color: '#FFA500' },
  TURBIDITY: { title: 'Turbidity', unit: 'NTU', color: '#4CAF50' },
  TEMP: { title: 'Temperature', unit: '°C', color: '#2196F3' },
  TDS: { title: 'TDS', unit: 'ppm', color: '#E91E63' },
};

function SpecificReadings({ deviceReadings, deviceId, deviceStatus }) {
  // Handle offline or maintenance mode
  if (deviceStatus === 'Offline' || deviceStatus === 'Maintenance') {
    return (
      <div className={Style.container}>
        <div className={Style.blockContainer}>
          <div className={Style.blockTitle}>Real-time Monitoring</div>
          <div className={Style.statusMessage}>
            <h3>Device Status: {deviceStatus}</h3>
            <p>Readings are not available for devices that are {deviceStatus.toLowerCase()}.</p>
          </div>
        </div>
      </div>
    );
  }

  // Prepare readings for display
  const readingsToDisplay = DISPLAY_PARAMETERS_ORDER.map((key) => {
    if (deviceReadings && PARAMETER_CONFIG[key]) {
      const { title, unit, color } = PARAMETER_CONFIG[key];
      return {
        id: key,
        title,
        value: deviceReadings[key],
        unit,
        color,
      };
    }
    return null;
  }).filter(Boolean);

  if (readingsToDisplay.length === 0) {
    return (
      <div className={Style.container}>
        <div className={Style.blockContainer}>
          <div className={Style.blockTitle}>Real-time Monitoring</div>
          <p>No current readings available for this online device.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={Style.container}>
      <div className={Style.blockContainer}>
        <div className={Style.blockTitle}>
          Real-time Monitoring {">"} {deviceId.toUpperCase()}
        </div>
        <div className={Style.cardGrid}>
          {readingsToDisplay.map((reading) => (
            <div
              key={reading.id}
              className={Style['reading-card']}
              style={{
                borderLeft: `6px solid ${reading.color}`,
                background: 'linear-gradient(135deg, #f9fafb, #ffffff)',
                transition: 'all 0.3s ease',
              }}
            >
              <div className={Style.parameter} style={{ color: reading.color }}>
                {reading.title}
              </div>
              <div className={Style.value}>{reading.value} {reading.unit}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SpecificReadings;
