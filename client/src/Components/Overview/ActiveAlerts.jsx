import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, CircleCheckBig, CircleAlert, HelpCircle } from 'lucide-react';
import { formatDateTime } from '../../utils/formatDateTime';
import styles from '../../Styles/ActiveAlerts.module.css';
import AlertsInfoModal from '../AlertsInfoModal/AlertsInfoModal'; // Import Modal

const ActiveAlerts = ({
  activeAlerts,
  devices,
  selectedDevice,
  onDeviceFilterChange,
  onAcknowledgeAlert,
  showFilter = true,
  newlyAddedId, 
  onAnimationComplete
}) => {
  const [expandedAlertId, setExpandedAlertId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false); // Modal State

  useEffect(() => {
    if (newlyAddedId) {
        const timer = setTimeout(() => {
            onAnimationComplete();
        }, 1200);
        return () => clearTimeout(timer);
    }
  }, [newlyAddedId, onAnimationComplete]);
  
  const getSeverityClass = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return styles['severity-critical'];
      case 'warning': return styles['severity-warning'];
      default: return styles['severity-normal'];
    }
  };

  const toggleDropdown = (alertId) => setExpandedAlertId(prev => (prev === alertId ? null : alertId));
  const toggleDeviceDropdown = () => setDropdownOpen(prev => !prev);
  
  const handleDeviceSelect = (deviceId) => { onDeviceFilterChange({ target: { value: deviceId } }); setDropdownOpen(false); };
  
  const handleAcknowledgeClick = (alertId) => { onAcknowledgeAlert(alertId); setExpandedAlertId(null); };
  
  const filteredAlerts = (selectedDevice === 'All Devices' || !selectedDevice
    ? [...(activeAlerts || [])]
    : (activeAlerts || []).filter(alert => alert.originator === selectedDevice)
  ).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

  return (
    <div className={styles['alerts-section']}>
        <div className={styles['section-header']}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3>Active Alerts</h3>
                {/* Help Icon Trigger */}
                <HelpCircle 
                    size={18} 
                    className={styles.helpIcon} 
                    style={{ cursor: 'pointer', color: '#6b7280' }}
                    onClick={() => setIsInfoModalOpen(true)}
                />
            </div>
            {showFilter && (
                <div className={styles['device-filter-group']}>
                    <label>Filter by Device:</label>
                    <div className={styles['custom-dropdown']}>
                        <div className={styles['dropdown-header']} onClick={toggleDeviceDropdown}>
                            {(devices || []).find(d => d._id === selectedDevice)?.label || 'All Devices'}
                            <span className={styles['dropdown-arrow']}>
                                {dropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </span>
                        </div>
                        <div className={`${styles['dropdown-list']} ${dropdownOpen ? styles['dropdown-open'] : ''}`}>
                            <div className={styles['dropdown-item']} onClick={() => handleDeviceSelect('All Devices')}>
                                All Devices
                            </div>
                            {(devices || []).map(device => (
                                <div key={device._id} className={styles['dropdown-item']} onClick={() => handleDeviceSelect(device._id)}>
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
                <div>Action</div>
            </div>
            <div className={styles['alerts-body']}>
                {filteredAlerts.length > 0 ? (
                    filteredAlerts.map(alert => (
                        <div key={alert._id}>
                            <div 
                                className={`${styles['alerts-row']} ${alert._id === newlyAddedId ? styles['new-alert'] : ''} ${alert.acknowledged ? styles['alert-acknowledged'] : ''}`} 
                                onClick={() => toggleDropdown(alert._id)}
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
                                <div>
                                    <span className={alert.acknowledged ? styles['action-acknowledged'] : styles['action-unacknowledged']}>
                                        {alert.acknowledged ? <CircleCheckBig className={styles['Icons']}/> : <CircleAlert className={styles['Icons']}/>}
                                    </span>
                                </div>
                            </div>
                            <div className={`${styles['acknowledge-dropdown']} ${expandedAlertId === alert._id ? styles['dropdown-visible'] : ''}`}>
                                <button 
                                    className={styles['acknowledge-btn']} 
                                    onClick={() => handleAcknowledgeClick(alert._id)} 
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

        {/* Info Modal Component */}
        <AlertsInfoModal 
            isOpen={isInfoModalOpen} 
            onClose={() => setIsInfoModalOpen(false)} 
        />
    </div>
  );
};

export default ActiveAlerts;