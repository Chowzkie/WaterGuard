import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from '../../Styles/ActiveAlerts.module.css';

const ActiveAlerts = ({
  activeAlerts,
  devices,
  selectedDevice,
  onDeviceFilterChange,
  onAcknowledgeAlert,
  showFilter = true
}) => {
  const [expandedAlertId, setExpandedAlertId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // --- FINAL ANIMATION FIX ---
  // We will keep track of the ID of the alert being animated.
  const [newlyAddedId, setNewlyAddedId] = useState(null);
  // We will also track the highest ID we've ever seen to prevent re-animations.
  const [maxSeenId, setMaxSeenId] = useState(0);

  useEffect(() => {
    // If there are no alerts, there's nothing to do.
    if (activeAlerts.length === 0) {
      return;
    }

    // Find the highest ID in the current list of alerts.
    const currentMaxId = Math.max(...activeAlerts.map(a => a.id));

    // An animation should ONLY play if a new alert appears with an ID greater than any we've seen before.
    if (currentMaxId > maxSeenId) {
      // Set this new highest ID as the one to animate.
      setNewlyAddedId(currentMaxId);
      // Immediately update our record of the highest ID seen.
      setMaxSeenId(currentMaxId);
      
      // Set a timer to remove the animation class after it has finished.
      const timer = setTimeout(() => {
        setNewlyAddedId(null);
      }, 1200); // Must match the animation duration in the CSS

      // Cleanup function for the timer
      return () => clearTimeout(timer);
    }
  }, [activeAlerts, maxSeenId]); // Dependency array now includes maxSeenId


  // --- The rest of the component is unchanged ---

  const getSeverityClass = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return styles['severity-critical'];
      case 'warning': return styles['severity-warning'];
      case 'normal': return styles['severity-normal'];
      default: return styles['severity-normal'];
    }
  };

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

  const handleAcknowledgeClick = (alertId) => {
    onAcknowledgeAlert(alertId);
    setExpandedAlertId(null);
  };

  const filteredAlerts = (selectedDevice === 'All Devices'
    ? [...activeAlerts]
    : activeAlerts.filter(alert => alert.originator === selectedDevice)
  ).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    if (isNaN(date)) return dateTimeStr;

    const options = {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    };
    return date.toLocaleString('en-US', options);
  };

  return (
    <div className={styles['alerts-section']}>
      <div className={styles['section-header']}>
        <h3>Active Alerts</h3>
        {showFilter && (
        <div className={styles['device-filter-group']}>
          <label>Filter by Device:</label>
          <div className={styles['custom-dropdown']}>
            <div className={styles['dropdown-header']} onClick={toggleDeviceDropdown}>
              {devices.find(d => d.id === selectedDevice)?.label || 'All Devices'}
              <span className={styles['dropdown-arrow']}>
                {dropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </div>
            <div className={`${styles['dropdown-list']} ${dropdownOpen ? styles['dropdown-open'] : ''}`}>
              <div className={styles['dropdown-item']} onClick={() => handleDeviceSelect('All Devices')}>
                All Devices
              </div>
              {devices.map(device => (
                <div key={device.id} className={styles['dropdown-item']} onClick={() => handleDeviceSelect(device.id)}>
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
              <div key={alert.id}>
                <div
                  className={`
                    ${styles['alerts-row']}
                    ${alert.id === newlyAddedId ? styles['new-alert'] : ''}
                    ${alert.acknowledged ? styles['alert-acknowledged'] : ''}
                  `}
                  onClick={() => toggleDropdown(alert.id)}
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
                  <div>
                    <span className={styles['status-active']}>{alert.status}</span>
                  </div>
                </div>

                <div className={`${styles['acknowledge-dropdown']} ${expandedAlertId === alert.id ? styles['dropdown-visible'] : ''}`}>
                  <button
                    className={styles['acknowledge-btn']}
                    onClick={() => handleAcknowledgeClick(alert.id)}
                    disabled={alert.acknowledged}
                  >
                    {alert.acknowledged ? 'Acknowledged' : 'Acknowledge'}
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