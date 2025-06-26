import React from 'react';
import { Search, Download, ListFilter } from 'lucide-react';
import styles from '../../Styles/AlertsHistory.module.css';

const AlertsHistory = ({ historyAlerts = [] }) => {
  const getSeverityClass = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return styles['severity-critical'];
      case 'warning': return styles['severity-warning'];
      default: return styles['severity-normal'];
    }
  };

  // --- THIS IS THE UPDATED FUNCTION ---
  // It now matches the format from ActiveAlerts and RecentAlerts.
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
        <h3>Alerts History</h3>
        <div className={styles['header-controls']}>
          <Search className={styles.icon} size={18} />
          <Download className={styles.icon} size={18} />
          <ListFilter className={styles.icon} size={18} />
        </div>
      </div>

      <div className={styles['alerts-table']}>
        <div className={styles['alerts-header-row']}>
          <div>Date and Time</div>
          <div>Originator</div>
          <div>Type</div>
          <div>Severity</div>
          <div>Status</div>
        </div>
        <div className={styles['alerts-body']}>
            {historyAlerts.length > 0 ? (
                // Use slice().sort() to avoid mutating the original prop array
                historyAlerts.slice().sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)).map(alert => (
                    <div key={alert.id} className={styles['alerts-row']}>
                        {/* This output will now have the new format */}
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
                            <span className={styles['status-acknowledged']}>{alert.status}</span>
                        </div>
                    </div>
                ))
          ) : (
            <div className={styles['no-alerts']}>No historical alerts found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertsHistory;
