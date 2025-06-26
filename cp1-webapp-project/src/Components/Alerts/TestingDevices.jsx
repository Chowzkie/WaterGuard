import React from 'react';
import { Search } from 'lucide-react';
import styles from '../../Styles/TestingDevices.module.css';

const TestingDevices = ({ devices = [] }) => {

  return (
    <div className={styles['devices-section']}>
      <div className={styles['section-header']}>
        <h3>Testing Devices</h3>
        <div className={styles['header-controls']}>
          <Search className={styles.icon} size={18} />
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
              <div key={device.id} className={styles['devices-row']}>
                <div>{device.label}</div>
                <div>{device.location}</div>
                <div>
                  <span className={styles['status-badge']}>
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