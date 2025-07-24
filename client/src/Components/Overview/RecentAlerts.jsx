import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, CircleCheckBig, CircleAlert } from 'lucide-react';
import { formatDateTime } from '../../utils/formatDateTime';
import styles from '../../Styles/RecentAlerts.module.css';

const RecentAlerts = ({ 
  recentAlerts, 
  devices, 
  selectedDevice, 
  onDeviceFilterChange, 
  showFilter = true 
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getSeverityClass = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return styles['severity-critical'];
      case 'warning': return styles['severity-warning'];
      default: return styles['severity-normal'];
    }
  };

  const toggleDeviceDropdown = () => setDropdownOpen(prev => !prev);
  const handleDeviceSelect = (deviceId) => {
    onDeviceFilterChange({ target: { value: deviceId } });
    setDropdownOpen(false);
  };
  
  const filteredAlerts = (selectedDevice === 'All Devices' || !selectedDevice
    ? [...(recentAlerts || [])]
    : (recentAlerts || []).filter(alert => alert.originator === selectedDevice)
  ).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

  return (
    <div className={styles['alerts-section']}>
      <div className={styles['section-header']}>
        <h3>Recent Alerts</h3>
        {showFilter && (
          <div className={styles['device-filter-group']}>
            <label>Filter by Device:</label>
            <div className={styles['custom-dropdown']}>
              <div className={styles['dropdown-header']} onClick={toggleDeviceDropdown}>
                {(devices || []).find(d => d.id === selectedDevice)?.label || 'All Devices'}
                <span className={styles['dropdown-arrow']}>
                    {dropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </div>
              <div className={`${styles['dropdown-list']} ${dropdownOpen ? styles['dropdown-open'] : ''}`}>
                <div className={styles['dropdown-item']} onClick={() => handleDeviceSelect('All Devices')}>All Devices</div>
                {(devices || []).map(device => (
                  <div key={device.id} className={styles['dropdown-item']} onClick={() => handleDeviceSelect(device.id)}>{device.label}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className={styles['alerts-table']}>
        <div className={styles['alerts-header-row']}>
          <div>Date/Time</div>
          <div>Origin</div>
          <div>Type</div>
          <div>Severity</div>
          <div>Status</div>
          <div>Action</div>
        </div>
        <div className={styles['alerts-body']}>
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map(alert => (
              <div key={alert.id} className={styles['alerts-row']}>
                <div>{formatDateTime(alert.dateTime)}</div>
                <div>{alert.originator}</div>
                <div>
                  {alert.type}
                  {alert.note && <div className={styles['alert-note']}>{alert.note}</div>}
                </div>
                <div>
                    <span className={`${styles['severity-badge']} ${getSeverityClass(alert.severity)}`}>
                        {alert.severity}
                    </span>
                </div>
                <div>
                    <span className={styles['status-inactive']}>{alert.status}</span>
                </div>
                <div>
                  <span className={alert.acknowledged ? styles['action-acknowledged'] : styles['action-unacknowledged']}>
                    {alert.acknowledged ? <CircleCheckBig className={styles['Icons']}/> : <CircleAlert className={styles['Icons']}/>}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className={styles['no-alerts']}>No recent alerts.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentAlerts;