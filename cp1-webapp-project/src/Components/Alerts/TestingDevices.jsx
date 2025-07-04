import React from 'react';
import { Search } from 'lucide-react';
import styles from '../../Styles/TestingDevices.module.css';

// --- MODIFIED --- Accept new props for interactivity
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
            devices.map(device => (
              // --- MODIFIED --- Add onClick handler and conditional class for selection
              <div 
                key={device.id} 
                className={`${styles['devices-row']} ${device.id === selectedDeviceId ? styles['selected'] : ''}`}
                onClick={() => onDeviceSelect(device.id)}
              >
                <div>{device.label}</div>
                <div>{device.location}</div>
                <div>
                  <span className={`${styles['status-badge']} ${device.status === 'Online' ? styles['online'] : styles['offline']}`}>
                    {device.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className={styles['no-devices']}>No devices found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestingDevices;