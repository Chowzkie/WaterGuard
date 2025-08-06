import React from 'react';
import { AlertCircle, Info, CheckCircle } from 'lucide-react';
import styles from '../../Styles/Nav-Head-Style/Notifications.module.css';

// --- Time Formatting Utility ---
// This utility function converts a timestamp into a human-readable relative format.
const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const seconds = Math.floor((now - new Date(timestamp)) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};


// The component now receives live data and functions as props from App.jsx.
const Notifications = ({
    show,
    notifications, // Live notifications array
    onMarkAllAsRead, // Function to mark all as read
    onMarkAsRead, // Function to mark a single notification as read
}) => {

    // The getIcon function remains the same, mapping types to icons.
    const getIcon = (type) => {
        switch (type) {
            case 'CriticalAlert':
            case 'DeviceOffline':
                return <AlertCircle className={`${styles.notifIcon} ${styles.critical}`} />;
            case 'DeviceOnline':
                return <CheckCircle className={`${styles.notifIcon} ${styles.success}`} />;
            case 'ValveShutOff':
            default:
                return <Info className={`${styles.notifIcon} ${styles.info}`} />;
        }
    };

    // Determines the specific background class for critical items.
    const getItemClass = (type) => {
        switch (type) {
            case 'CriticalAlert':
            case 'DeviceOffline':
                return styles.critical;
            default:
                return '';
        }
    };

    return (
        <div className={`${styles.notifDropdown} ${show ? styles.show : ''}`}>
            <div className={styles.dropdownHeader}>
                <span className={styles.dropdownTitle}>Notifications</span>
                {/* The badge now correctly counts unread items from the live data. */}
                <span className={styles.notificationHeaderBadge}>{notifications.filter(n => !n.read).length}</span>
                {/* The onClick handler now calls the function passed via props. */}
                <button className={styles.markAllBtn} onClick={onMarkAllAsRead} disabled={notifications.every(n => n.read)}>
                    Mark all as read
                </button>
            </div>
            <div className={styles.dropdownWrapper}>
                {notifications.length === 0 ? (
                    <span className={styles.noNotifs}>No notifications</span>
                ) : (
                    // The component now maps over the 'notifications' prop.
                    notifications.map((notif) => (
                        <div className={`${styles.dropdownItemN} ${getItemClass(notif.type)} ${notif.read ? styles.read : ''}`} key={notif.id}>
                            <div className={styles.itemLeft}>{getIcon(notif.type)}</div>
                            <div className={styles.itemRight}>
                                <span>{notif.message}</span>
                                <div className={styles.meta}>
                                    {/* The timestamp is now formatted using the utility function. */}
                                    <small>{formatTimeAgo(notif.timestamp)}</small>
                                    {/* The onClick handler calls the prop function with the notification's unique ID. */}
                                    {!notif.read && (<button onClick={() => onMarkAsRead(notif.id)}><i>Mark as read</i></button>)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Notifications;
