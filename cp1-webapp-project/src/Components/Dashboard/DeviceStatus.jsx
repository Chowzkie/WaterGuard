import React from 'react';
import styles from '../../Styles/DeviceStatus.module.css';
import { useNavigate } from 'react-router-dom';

const DeviceStatus = ({ devicesData, selectedDeviceId, setSelectedDeviceId }) => {
    const navigate = useNavigate();

    const handleLogsClick = () => {
        navigate(`/logs`)
    }

    return (
        // This wrapper holds both the device list and the logs section
        <div className={styles['device-status-wrapper']}>
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

            {/* This is the restored "View Sensor Logs" section */}
            <div className={styles["logs-container"]}>
                <p>View Sensor Logs</p>
                <button onClick={() => handleLogsClick()}>Click to View</button>
            </div>
        </div>
    );
};

export default DeviceStatus;