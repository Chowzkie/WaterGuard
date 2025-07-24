import styles from '../../Styles/DeviceStatus.module.css';

const DeviceStatus = ({ devicesData, selectedDeviceId, setSelectedDeviceId }) => {

    return (
        // This wrapper holds both the device list and the logs section
            <div className={styles['devices-section']}>
                <div className={styles['section-header']}>
                    <h3>Testing Devices</h3>
                </div>
                <div className={styles['devices-table']}>
                    <div className={styles['devices-header-row']}>
                        <div>Label</div>
                        <div>Location</div>
                        <div>Status</div>
                    </div>
                    
                    <div className={styles['devices-body']}>
                        {devicesData.length === 0 ? (
                            <div className={styles['no-devices']}>No devices found.</div>
                        ) : (
                            devicesData.map(device => (
                                <div
                                    key={device.id}
                                    className={`${styles['devices-row']} ${device.id === selectedDeviceId ? styles.selected : ''}`}
                                    onClick={() => setSelectedDeviceId(device.id)}
                                >
                                    <div>{device.id}</div>
                                    <div>{device.location}</div>
                                    <div className={`${styles['status-indicator']} ${styles[device.status.toLowerCase()]}`}>
                                        <div className={styles['status-dot']}></div>
                                        <span>{device.status}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
    );
};

export default DeviceStatus;