import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp} from 'lucide-react';
import styles from '../../Styles/ActiveAlerts.module.css';

const ActiveAlerts = ({
  activeAlerts,
  devices,
  selectedDevice,
  onDeviceFilterChange,
  onAcknowledgeAlert
}) => {
  const [expandedAlertId, setExpandedAlertId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newlyAddedId, setNewlyAddedId] = useState(null);

  const prevAlertsRef = useRef([]);

    useEffect(() => {
        const prevIds = new Set(prevAlertsRef.current.map(alert => alert.id));
         const newAlert = activeAlerts.find(alert => !prevIds.has(alert.id));

            if (newAlert) {
                 setNewlyAddedId(newAlert.id);
                    const timer = setTimeout(() => setNewlyAddedId(null), 800);
                    prevAlertsRef.current = activeAlerts;
                    return () => clearTimeout(timer);
                }
    
    prevAlertsRef.current = activeAlerts;
    }, [activeAlerts]);

  const getSeverityClass = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return styles['severity-critical'];
      case 'warning': return styles['severity-warning'];
      case 'normal': return styles['severity-normal'];
      default: return styles['severity-normal'];
    }
  };

  const filteredAlerts =
    selectedDevice === 'All Devices'
      ? activeAlerts
      : activeAlerts.filter(alert => alert.originator === selectedDevice);

  const toggleDropdown = (alertId) => {
    setExpandedAlertId(prev => (prev === alertId ? null : alertId));
  };

  const toggleDeviceDropdown = () => {
    setDropdownOpen(prev => !prev);
  };

  const handleDeviceSelect = (deviceId) => {
    onDeviceFilterChange({ target: { value: deviceId } });
    setDropdownOpen(false);
  };

  return (
    <div className={styles['alerts-section']}>
      <div className={styles['section-header']}>
        <h3>Active Alerts</h3>
        <div className={styles['device-filter-group']}>
          <label>Filter by Device:</label>
          <div className={styles['custom-dropdown']}>
            <div
              className={styles['dropdown-header']}
              onClick={toggleDeviceDropdown}
            >
              {devices.find(d => d.id === selectedDevice)?.label || 'All Devices'}
              <span className={styles['dropdown-arrow']}>
                {dropdownOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              </span>
            </div>
            <div className={`${styles['dropdown-list']} ${dropdownOpen ? styles['dropdown-open'] : ''}`}>
              <div
                className={styles['dropdown-item']}
                onClick={() => handleDeviceSelect('All Devices')}
              >
                All Devices
              </div>
              {devices.map(device => (
                <div
                  key={device.id}
                  className={styles['dropdown-item']}
                  onClick={() => handleDeviceSelect(device.id)}
                >
                  {device.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles['alerts-table']}>
        <div className={styles['alerts-header-row']}>
          <div>Date/Time</div>
          <div>Origin</div>
          <div>Type</div>
          <div>Severity</div>
          <div>Status</div>
        </div>

        <div className={styles['alerts-body']}>
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map(alert => (
              <div key={alert.id}>
                <div
                  className={`${styles['alerts-row']} ${alert.id === newlyAddedId ? styles['new-alert'] : ''}`}
                  onClick={() => toggleDropdown(alert.id)}
                >
                  <div>{alert.dateTime}</div>
                  <div>{alert.originator}</div>
                  <div>
                    {alert.type}
                    {alert.note && (
                      <div className={styles['alert-note']}>{alert.note}</div>
                    )}
                  </div>
                  <div>
                    <span className={`${styles['severity-badge']} ${getSeverityClass(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <div>
                    <span className={styles['status-active']}>{alert.status}</span>
                  </div>
                </div>

                <div className={`${styles['acknowledge-dropdown']} ${expandedAlertId === alert.id ? styles['dropdown-visible'] : ''}`}>
                  <button
                    className={styles['acknowledge-btn']}
                    onClick={() => {
                      onAcknowledgeAlert(alert.id);
                      setExpandedAlertId(null);
                    }}
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className={styles['no-alerts']}>No active alerts.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveAlerts;
