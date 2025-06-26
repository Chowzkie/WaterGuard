import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from '../../Styles/RecentAlerts.module.css';

const RecentAlerts = ({ recentAlerts, devices, selectedDevice, onDeviceFilterChange, showFilter = true }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newlyAddedId, setNewlyAddedId] = useState(null);
  const prevAlertsRef = useRef([]);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevAlertsRef.current = recentAlerts;
      return;
    }

    const prevIds = new Set(prevAlertsRef.current.map(alert => alert.id));
    const newAlert = recentAlerts.find(alert => !prevIds.has(alert.id));

    if (newAlert) {
      requestAnimationFrame(() => {
        setNewlyAddedId(newAlert.id);
        setTimeout(() => setNewlyAddedId(null), 800);
      });
    }

    prevAlertsRef.current = recentAlerts;
  }, [recentAlerts]);

  const getSeverityClass = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return styles['severity-critical'];
      case 'warning': return styles['severity-warning'];
      case 'normal': return styles['severity-normal'];
      default: return styles['severity-normal'];
    }
  };

  const toggleDeviceDropdown = () => {
    setDropdownOpen(prev => !prev);
  };

  const handleDeviceSelect = (deviceId) => {
    onDeviceFilterChange({ target: { value: deviceId } });
    setDropdownOpen(false);
  };

  const filteredAlerts = (selectedDevice === 'All Devices'
    ? [...recentAlerts]
    : recentAlerts.filter(alert => alert.originator === selectedDevice)
  ).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

  // Format date and time
  const formatDateTime = (dateTimeStr) => {
  const date = new Date(dateTimeStr);
  if (isNaN(date)) return dateTimeStr; // fallback if invalid

    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };

  return date.toLocaleString('en-US', options);
  };

  return (
    <div className={styles['alerts-section']}>
      <div className={styles['section-header']}>
        <h3>Recent Alerts</h3>
        {showFilter && (
        <div className={styles['device-filter-group']}>
          <label>Filter by Device:</label>
          <div className={styles['custom-dropdown']}>
            <div
              className={styles['dropdown-header']}
              onClick={toggleDeviceDropdown}
            >
              {devices.find(d => d.id === selectedDevice)?.label || 'All Devices'}
              <span className={styles['dropdown-arrow']}>
                {dropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
        )}
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
              <div
                key={alert.id}
                className={`${styles['alerts-row']} ${
                  newlyAddedId && alert.id === newlyAddedId ? styles['new-alert'] : ''
                }`}
              >
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
                <div><span className={styles['status-inactive']}>{alert.status}</span></div>
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
