import styles from '../../Styles/TestingDevices.module.css';

// Accept new props for interactivity
const TestingDevices = ({ devices = [], selectedDeviceId, onDeviceSelect }) => {

  return (
    <div className={styles['devices-section']}>
      <div className={styles['section-header']}>
        <h3>Testing Devices</h3>
        <div className={styles['header-controls']}>
        </div>
      </div>

      <div className={styles['devices-table']}>
        <div className={styles['devices-header-row']}>
          <div>Label</div>
          <div>Location</div>
          <div>Status</div>
        </div>

        <div className={styles['devices-body']}>
          {devices.length > 0 ? (
            devices.map(device => {

              // Safely access the status from the new, nested schema
              const status = device.currentState?.status || 'Offline';
            
              return(
              <div 
                key={device._id} 
                className={`${styles['devices-row']} ${device._id === selectedDeviceId ? styles['selected'] : ''}`}
                onClick={() => onDeviceSelect(device._id)}
              >
                <div>{device.label}</div>
                <div>{device.location}</div>
                  <div className={`${styles['status-indicator']} ${styles[status.toLowerCase()]}`}>
                      <div className={styles['status-dot']}></div>
                      <span>{status}</span>
                  </div>
              </div>
              );
            })
          ) : (
            <div className={styles['no-devices']}>No devices found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestingDevices;